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