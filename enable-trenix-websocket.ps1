$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (!(Test-Path "$root\backend\src\main\java\com\trenix\backend") -or
    !(Test-Path "$root\frontend\src\App.tsx")) {
    throw "Ruleaza scriptul din directorul principal COLA - PAW."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "trenix-backup-websocket-$stamp"

function Backup-File($relativePath) {
    $source = Join-Path $root $relativePath
    if (Test-Path $source) {
        $destination = Join-Path $backupDir $relativePath
        New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
        Copy-Item $source $destination -Force
    }
}

function Write-ProjectFile($relativePath, $content) {
    $path = Join-Path $root $relativePath
    New-Item -ItemType Directory -Path (Split-Path $path) -Force | Out-Null
    [System.IO.File]::WriteAllText($path, $content, $utf8)
    Write-Host "Creat/actualizat: $relativePath" -ForegroundColor Green
}

$servicePath = "backend\src\main\java\com\trenix\backend\service\OrderService.java"
$securityPath = "backend\src\main\java\com\trenix\backend\config\SecurityConfig.java"
$appPath = "frontend\src\App.tsx"
$pomPath = "backend\pom.xml"

Backup-File $servicePath
Backup-File $securityPath
Backup-File $appPath

# Verificam dependenta WebSocket din Maven.
$pom = [System.IO.File]::ReadAllText($pomPath)

if ($pom -notmatch 'spring-boot-starter-websocket') {
    throw "Lipseste spring-boot-starter-websocket din pom.xml. Nu am modificat fisierele existente."
}

# 1. WebSocket handler
$handler = @'
package com.trenix.backend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InventoryWebSocketHandler extends TextWebSocketHandler {

    private final Set<WebSocketSession> sessions =
            ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        send(session, "{\"type\":\"CONNECTED\"}");
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {
        sessions.remove(session);
    }

    public void broadcastInventoryUpdated() {
        String payload = "{\"type\":\"INVENTORY_UPDATED\"}";

        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                send(session, payload);
            } else {
                sessions.remove(session);
            }
        }
    }

    private void send(WebSocketSession session, String payload) {
        try {
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(payload));
                }
            }
        } catch (IOException exception) {
            sessions.remove(session);
        }
    }
}
'@

Write-ProjectFile `
    "backend\src\main\java\com\trenix\backend\websocket\InventoryWebSocketHandler.java" `
    $handler

# 2. WebSocket configuration
$config = @'
package com.trenix.backend.config;

import com.trenix.backend.websocket.InventoryWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class InventoryWebSocketConfig implements WebSocketConfigurer {

    private final InventoryWebSocketHandler handler;

    public InventoryWebSocketConfig(InventoryWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/inventory")
                .setAllowedOrigins("http://localhost:5173");
    }
}
'@

Write-ProjectFile `
    "backend\src\main\java\com\trenix\backend\config\InventoryWebSocketConfig.java" `
    $config

# 3. Integram notificarea in OrderService
$serviceFile = Join-Path $root $servicePath
$service = [System.IO.File]::ReadAllText($serviceFile)

if ($service -notmatch 'InventoryWebSocketHandler') {

    $service = $service.Replace(
        "import com.trenix.backend.repository.UserRepository;",
        "import com.trenix.backend.repository.UserRepository;`r`nimport com.trenix.backend.websocket.InventoryWebSocketHandler;"
    )

    $service = $service.Replace(
        "import org.springframework.transaction.annotation.Transactional;",
        "import org.springframework.transaction.annotation.Transactional;`r`nimport org.springframework.transaction.support.TransactionSynchronization;`r`nimport org.springframework.transaction.support.TransactionSynchronizationManager;"
    )

    $service = [regex]::Replace(
        $service,
        '(?m)^(\s*)private final UserRepository userRepository;\s*$',
        {
            param($m)
            $i = $m.Groups[1].Value
            return $i + "private final UserRepository userRepository;" +
                "`r`n" + $i + "private final InventoryWebSocketHandler inventoryWebSocketHandler;"
        },
        1
    )

    $service = [regex]::Replace(
        $service,
        '(?m)^(\s*)UserRepository userRepository\s*$',
        {
            param($m)
            $i = $m.Groups[1].Value
            return $i + "UserRepository userRepository," +
                "`r`n" + $i + "InventoryWebSocketHandler inventoryWebSocketHandler"
        },
        1
    )

    $service = [regex]::Replace(
        $service,
        '(?m)^(\s*)this\.userRepository = userRepository;\s*$',
        {
            param($m)
            $i = $m.Groups[1].Value
            return $i + "this.userRepository = userRepository;" +
                "`r`n" + $i + "this.inventoryWebSocketHandler = inventoryWebSocketHandler;"
        },
        1
    )

    $marker = "        cartRepository.save(cart);"
    if (!$service.Contains($marker)) {
        throw "Nu am gasit cartRepository.save(cart) in OrderService."
    }

    $notification = @'
        cartRepository.save(cart);

        // Trimitem notificarea numai dupa commit-ul comenzii.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        inventoryWebSocketHandler.broadcastInventoryUpdated();
                    }
                }
        );
'@

    $service = $service.Replace($marker, $notification.TrimEnd())

    [System.IO.File]::WriteAllText($serviceFile, $service, $utf8)
    Write-Host "OrderService integrat cu WebSocket." -ForegroundColor Green
} else {
    Write-Host "OrderService are deja integrarea WebSocket." -ForegroundColor Yellow
}

# 4. Permitem handshake-ul WebSocket in Spring Security.
$securityFile = Join-Path $root $securityPath
$security = [System.IO.File]::ReadAllText($securityFile)

if ($security -notmatch 'requestMatchers\("/ws/\*\*"\)\.permitAll\(\)') {
    $pattern = '(?m)^(\s*)\.anyRequest\(\)\.authenticated\(\)\s*$'

    if ($security -notmatch $pattern) {
        throw "Nu am gasit anyRequest().authenticated() in SecurityConfig."
    }

    $security = [regex]::Replace(
        $security,
        $pattern,
        {
            param($m)
            $i = $m.Groups[1].Value
            return $i + '.requestMatchers("/ws/**").permitAll()' +
                "`r`n" + $i + '.anyRequest().authenticated()'
        },
        1
    )

    [System.IO.File]::WriteAllText($securityFile, $security, $utf8)
    Write-Host "SecurityConfig actualizat." -ForegroundColor Green
}

# 5. Client WebSocket in React, cu reconectare automata.
$appFile = Join-Path $root $appPath
$app = [System.IO.File]::ReadAllText($appFile)

$marker = "  // Incarcam cosul utilizatorului autentificat"

if ($app -notmatch 'WEBSOCKET INVENTORY LIVE SYNC') {
    if (!$app.Contains($marker)) {
        throw "Nu am gasit punctul de inserare in App.tsx."
    }

    $effect = @'
  // WEBSOCKET INVENTORY LIVE SYNC
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryDelay = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      socket = new WebSocket("ws://localhost:8080/ws/inventory");

      socket.onopen = () => {
        retryDelay = 1000;
        console.info("TRENIX WebSocket connected.");
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string };

          if (message.type === "INVENTORY_UPDATED") {
            const updatedProducts = await getProducts();
            setProducts(updatedProducts);
          }
        } catch (error) {
          console.error("WebSocket inventory update failed:", error);
        }
      };

      socket.onclose = () => {
        if (!stopped) {
          retryTimer = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
      socket?.close();
    };
  }, []);

'@

    $app = $app.Replace($marker, $effect + $marker)
    [System.IO.File]::WriteAllText($appFile, $app, $utf8)
    Write-Host "App.tsx actualizat pentru WebSocket." -ForegroundColor Green
} else {
    Write-Host "App.tsx are deja integrarea WebSocket." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "TRENIX WebSocket instalat cu succes." -ForegroundColor Cyan
Write-Host "Backup creat in: $backupDir" -ForegroundColor Yellow
Write-Host "Ruleaza: cd backend; .\mvnw.cmd clean test" -ForegroundColor Cyan