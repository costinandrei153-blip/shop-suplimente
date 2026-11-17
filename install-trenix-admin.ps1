
$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (!(Test-Path "$root\backend\src\main\java\com\trenix\backend") -or
    !(Test-Path "$root\frontend\src\App.tsx")) {
    throw "Ruleaza scriptul din folderul principal COLA - PAW."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "trenix-backup-admin-$stamp"

function Backup-File($relative) {
    $source = Join-Path $root $relative
    if (Test-Path $source) {
        $dest = Join-Path $backup $relative
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item $source $dest -Force
    }
}

function Write-File($relative, $content) {
    $path = Join-Path $root $relative
    New-Item -ItemType Directory -Path (Split-Path $path) -Force | Out-Null
    [System.IO.File]::WriteAllText($path, $content, $utf8)
    Write-Host "OK: $relative" -ForegroundColor Green
}

$base = "backend\src\main\java\com\trenix\backend"

# ==========================================================
# BACKUP
# ==========================================================

Backup-File "frontend\src\App.tsx"
Backup-File "backend\src\main\java\com\trenix\backend\config\SecurityConfig.java"

# ==========================================================
# 1. ADMIN ORDER CONTROLLER
# ==========================================================

$orderController = @'
package com.trenix.backend.controller;

import com.trenix.backend.dto.order.OrderItemResponse;
import com.trenix.backend.dto.order.OrderResponse;
import com.trenix.backend.entity.Order;
import com.trenix.backend.entity.OrderItem;
import com.trenix.backend.entity.OrderStatus;
import com.trenix.backend.repository.OrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderRepository orderRepository;

    public AdminOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping
    @Transactional
    public List<OrderResponse> getAllOrders() {
        return orderRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapOrder)
                .toList();
    }

    @PatchMapping("/{id}/status")
    @ResponseStatus(HttpStatus.OK)
    @Transactional
    public OrderResponse updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String rawStatus = payload.get("status");

        if (rawStatus == null || rawStatus.isBlank()) {
            throw new IllegalArgumentException("Status is required.");
        }

        OrderStatus status;

        try {
            status = OrderStatus.valueOf(
                    rawStatus.trim().toUpperCase()
            );
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid order status.");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Order not found.")
                );

        order.setStatus(status);

        return mapOrder(orderRepository.save(order));
    }

    private OrderResponse mapOrder(Order order) {
        OrderResponse response = new OrderResponse();

        response.setId(order.getId());
        response.setStatus(order.getStatus());
        response.setFirstName(order.getFirstName());
        response.setLastName(order.getLastName());
        response.setEmail(order.getEmail());
        response.setPhone(order.getPhone());
        response.setShippingAddress(order.getShippingAddress());
        response.setCity(order.getCity());
        response.setCounty(order.getCounty());
        response.setPostalCode(order.getPostalCode());
        response.setNotes(order.getNotes());
        response.setSubtotal(order.getSubtotal());
        response.setShippingFee(order.getShippingFee());
        response.setTotalAmount(order.getTotalAmount());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setCreatedAt(order.getCreatedAt());

        List<OrderItemResponse> items = order.getItems()
                .stream()
                .map(this::mapItem)
                .toList();

        response.setItems(items);
        return response;
    }

    private OrderItemResponse mapItem(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductName(),
                item.getBrand(),
                item.getImageUrl(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal()
        );
    }
}
'@

Write-File "$base\controller\AdminOrderController.java" $orderController

# ==========================================================
# 2. ADMIN PRODUCT CONTROLLER
# ==========================================================

$productController = @'
package com.trenix.backend.controller;

import com.trenix.backend.entity.Category;
import com.trenix.backend.entity.Product;
import com.trenix.backend.repository.CategoryRepository;
import com.trenix.backend.repository.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public AdminProductController(
            ProductRepository productRepository,
            CategoryRepository categoryRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::toMap)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> createProduct(
            @Valid @RequestBody ProductPayload payload
    ) {
        Product product = new Product();
        applyPayload(product, payload);

        return toMap(productRepository.save(product));
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductPayload payload
    ) {
        Product product = productRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Product not found.")
                );

        applyPayload(product, payload);

        return toMap(productRepository.save(product));
    }

    private void applyPayload(Product product, ProductPayload payload) {
        Category category = categoryRepository.findById(payload.categoryId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Category not found.")
                );

        product.setName(payload.name().trim());
        product.setBrand(payload.brand().trim());
        product.setDescription(payload.description());
        product.setPrice(payload.price());
        product.setStock(payload.stock());
        product.setImageUrl(
                payload.imageUrl() == null || payload.imageUrl().isBlank()
                        ? null
                        : payload.imageUrl().trim()
        );
        product.setCategory(category);
    }

    private Map<String, Object> toMap(Product product) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", product.getId());
        result.put("name", product.getName());
        result.put("brand", product.getBrand());
        result.put("description", product.getDescription());
        result.put("price", product.getPrice());
        result.put("stock", product.getStock());
        result.put("imageUrl", product.getImageUrl());

        if (product.getCategory() != null) {
            result.put("categoryId", product.getCategory().getId());
            result.put("categoryName", product.getCategory().getName());
        }

        return result;
    }

    public record ProductPayload(
            @NotBlank
            @Size(max = 150)
            String name,

            @NotBlank
            @Size(max = 150)
            String brand,

            @Size(max = 2000)
            String description,

            @NotNull
            @DecimalMin("0.01")
            BigDecimal price,

            @NotNull
            @Min(0)
            Integer stock,

            @Size(max = 500)
            String imageUrl,

            @NotNull
            Long categoryId
    ) {}
}
'@

Write-File "$base\controller\AdminProductController.java" $productController

# ==========================================================
# 3. SECURE ADMIN ENDPOINTS
# ==========================================================

$securityPath = "$base\config\SecurityConfig.java"
$securityFile = Join-Path $root $securityPath

if (!(Test-Path $securityFile)) {
    throw "SecurityConfig.java was not found."
}

$security = [System.IO.File]::ReadAllText($securityFile)

if ($security -notmatch 'requestMatchers\("/api/admin/\*\*"\)\.hasRole\("ADMIN"\)') {
    $pattern = '(?m)^(\s*)\.anyRequest\(\)\.authenticated\(\)'

    if ($security -notmatch $pattern) {
        throw "Could not find anyRequest().authenticated() in SecurityConfig."
    }

    $security = [regex]::Replace(
        $security,
        $pattern,
        {
            param($m)
            $indent = $m.Groups[1].Value
            return $indent + '.requestMatchers("/api/admin/**").hasRole("ADMIN")' +
                "`r`n" + $indent + '.anyRequest().authenticated()'
        },
        1
    )

    [System.IO.File]::WriteAllText($securityFile, $security, $utf8)
}

Write-Host "OK: Admin routes secured for ROLE_ADMIN." -ForegroundColor Green

# ==========================================================
# 4. FRONTEND ADMIN SERVICE AND PANEL
# ==========================================================

$adminService = @'
const API = "http://localhost:8080";

function getToken(): string {
  for (const storage of [sessionStorage, localStorage]) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;

      const value = storage.getItem(key);

      if (
        value &&
        /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
      ) {
        return value;
      }
    }
  }

  throw new Error("Sesiunea a expirat. Autentifică-te din nou.");
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${getToken()}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const raw = await response.text();

  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message || data?.detail || data?.error ||
          `HTTP ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export interface AdminOrderItem {
  id: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface AdminOrder {
  id: number;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  city: string;
  county: string;
  postalCode: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: AdminOrderItem[];
}

export interface AdminProduct {
  id: number;
  name: string;
  brand: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: number;
  categoryName: string;
}

export interface AdminCategory {
  id: number;
  name: string;
}

export interface AdminProductPayload {
  name: string;
  brand: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: number;
}

export const adminApi = {
  getOrders: () =>
    adminFetch<AdminOrder[]>("/api/admin/orders"),

  updateOrderStatus: (id: number, status: string) =>
    adminFetch<AdminOrder>(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getProducts: () =>
    adminFetch<AdminProduct[]>("/api/admin/products"),

  getCategories: () =>
    adminFetch<AdminCategory[]>("/api/categories"),

  createProduct: (payload: AdminProductPayload) =>
    adminFetch<AdminProduct>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: number, payload: AdminProductPayload) =>
    adminFetch<AdminProduct>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
'@

Write-File "frontend\src\services\adminService.ts" $adminService

$adminPanel = @'
import { useEffect, useMemo, useState } from "react";
import "./AdminPanel.css";
import {
  adminApi,
  type AdminOrder,
  type AdminProduct,
  type AdminCategory,
  type AdminProductPayload,
} from "../services/adminService";

interface Props {
  onClose: () => void;
  onProductsChanged: () => void | Promise<void>;
}

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmată",
  PROCESSING: "În procesare",
  SHIPPED: "Expediată",
  DELIVERED: "Livrată",
  CANCELLED: "Anulată",
};

const EMPTY_FORM: AdminProductPayload = {
  name: "",
  brand: "TRENIX",
  description: "",
  price: 0,
  stock: 0,
  imageUrl: "",
  categoryId: 0,
};

function money(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(Number(value) || 0);
}

function date(value: string) {
  return new Date(value).toLocaleString("ro-RO");
}

export default function AdminPanel({ onClose, onProductsChanged }: Props) {
  const [tab, setTab] = useState<"orders" | "products">("orders");

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AdminProductPayload>(EMPTY_FORM);

  const loadOrders = async () => {
    const result = await adminApi.getOrders();
    setOrders(result);
  };

  const loadProducts = async () => {
    const [productData, categoryData] = await Promise.all([
      adminApi.getProducts(),
      adminApi.getCategories(),
    ]);

    setProducts(productData);
    setCategories(categoryData);

    if (!form.categoryId && categoryData.length > 0) {
      setForm((old) => ({
        ...old,
        categoryId: categoryData[0].id,
      }));
    }
  };

  const reloadAll = async () => {
    setError("");
    setLoading(true);

    try {
      await Promise.all([loadOrders(), loadProducts()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu s-au putut încărca datele."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadAll();
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "PENDING").length,
    [orders]
  );

  const revenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    [orders]
  );

  const handleStatus = async (id: number, status: string) => {
    setError("");
    setNotice("");

    try {
      await adminApi.updateOrderStatus(id, status);
      await loadOrders();
      setNotice(`Comanda #${id} a fost actualizată.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Actualizarea a eșuat.");
    }
  };

  const editProduct = (product: AdminProduct) => {
    setEditingId(product.id);

    setForm({
      name: product.name,
      brand: product.brand,
      description: product.description ?? "",
      price: Number(product.price),
      stock: product.stock,
      imageUrl: product.imageUrl ?? "",
      categoryId: product.categoryId,
    });

    setTab("products");
    setNotice("");
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id ?? 0,
    });
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (
        !form.name.trim() ||
        !form.brand.trim() ||
        !form.categoryId ||
        form.price <= 0 ||
        form.stock < 0
      ) {
        throw new Error("Completează corect toate câmpurile obligatorii.");
      }

      const payload = {
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
      };

      if (editingId !== null) {
        await adminApi.updateProduct(editingId, payload);
        setNotice("Produsul a fost actualizat.");
      } else {
        await adminApi.createProduct(payload);
        setNotice("Produsul a fost adăugat.");
      }

      resetForm();
      await loadProducts();
      await onProductsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvarea a eșuat.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="admin-panel" role="dialog" aria-modal="true">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">TRENIX / CONTROL CENTER</span>
            <h2>ADMIN PANEL<span>.</span></h2>
            <p>Manage orders, products and store operations.</p>
          </div>
          <button className="admin-close" onClick={onClose}>×</button>
        </header>

        <div className="admin-stats">
          <article>
            <span>TOTAL ORDERS</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>PENDING ORDERS</span>
            <strong>{pendingOrders}</strong>
          </article>
          <article>
            <span>PRODUCTS</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>ORDER VALUE</span>
            <strong>{money(revenue)}</strong>
          </article>
        </div>

        <nav className="admin-tabs">
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => setTab("orders")}
          >
            ORDERS ({orders.length})
          </button>
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            PRODUCTS ({products.length})
          </button>
          <button className="admin-refresh" onClick={() => void reloadAll()}>
            ↻ REFRESH
          </button>
        </nav>

        <div className="admin-content">
          {loading && <p className="admin-message">LOADING ADMIN DATA...</p>}

          {error && <p className="admin-error">{error}</p>}
          {notice && <p className="admin-notice">{notice}</p>}

          {!loading && tab === "orders" && (
            <div className="admin-orders">
              {orders.length === 0 && (
                <p className="admin-message">Nu există comenzi încă.</p>
              )}

              {orders.map((order) => (
                <article className="admin-order" key={order.id}>
                  <div className="admin-order-top">
                    <div>
                      <span className="admin-kicker">ORDER #{order.id}</span>
                      <strong>{date(order.createdAt)}</strong>
                    </div>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        void handleStatus(order.id, event.target.value)
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-order-grid">
                    <div>
                      <span>CUSTOMER</span>
                      <strong>{order.firstName} {order.lastName}</strong>
                      <small>{order.email}</small>
                      <small>{order.phone}</small>
                    </div>

                    <div>
                      <span>DELIVERY</span>
                      <strong>{order.shippingAddress}</strong>
                      <small>{order.city}, {order.county}</small>
                      <small>Postal: {order.postalCode}</small>
                    </div>

                    <div>
                      <span>PAYMENT</span>
                      <strong>{order.paymentMethod === "CASH_ON_DELIVERY" ? "Ramburs" : order.paymentMethod}</strong>
                      <small>{order.paymentStatus}</small>
                      <strong className="admin-total">{money(order.totalAmount)}</strong>
                    </div>
                  </div>

                  <div className="admin-order-items">
                    {order.items.map((item) => (
                      <div key={item.id}>
                        <span>{item.productName} × {item.quantity}</span>
                        <strong>{money(item.lineTotal)}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && tab === "products" && (
            <div className="admin-product-layout">
              <form className="admin-product-form" onSubmit={saveProduct}>
                <div>
                  <span className="admin-kicker">
                    {editingId !== null ? `EDIT PRODUCT #${editingId}` : "NEW PRODUCT"}
                  </span>
                  <h3>{editingId !== null ? "UPDATE PRODUCT." : "ADD PRODUCT."}</h3>
                </div>

                <label>
                  PRODUCT NAME
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  BRAND
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    required
                  />
                </label>

                <label>
                  DESCRIPTION
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </label>

                <div className="admin-form-row">
                  <label>
                    PRICE (RON)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      required
                    />
                  </label>

                  <label>
                    STOCK
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                      required
                    />
                  </label>
                </div>

                <label>
                  CATEGORY
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                    required
                  >
                    <option value={0} disabled>Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  IMAGE URL (OPTIONAL)
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </label>

                <div className="admin-form-actions">
                  <button className="admin-save" type="submit" disabled={saving}>
                    {saving ? "SAVING..." : editingId !== null ? "SAVE CHANGES ↗" : "CREATE PRODUCT ↗"}
                  </button>
                  {editingId !== null && (
                    <button className="admin-cancel" type="button" onClick={resetForm}>
                      CANCEL
                    </button>
                  )}
                </div>
              </form>

              <div className="admin-product-list">
                <span className="admin-kicker">CURRENT INVENTORY</span>
                {products.map((product) => (
                  <article key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.categoryName} · {product.brand}</small>
                      <small>{money(product.price)} · Stock: {product.stock}</small>
                    </div>
                    <button onClick={() => editProduct(product)}>EDIT</button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
'@

Write-File "frontend\src\components\AdminPanel.tsx" $adminPanel

$adminCss = @'
.admin-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0,0,0,.86);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-panel {
  width: min(1250px, 100%);
  max-height: 94vh;
  overflow: auto;
  color: #f1f2ec;
  background: #10110d;
  border: 1px solid rgba(197,243,52,.38);
  box-shadow: 0 30px 100px rgba(0,0,0,.55);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 30px;
  border-bottom: 1px solid rgba(255,255,255,.12);
}

.admin-kicker {
  color: #c5f334;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.admin-header h2 {
  margin: 10px 0 6px;
  font-size: clamp(27px, 4vw, 42px);
  letter-spacing: -1.8px;
}

.admin-header h2 span {
  color: #c5f334;
}

.admin-header p {
  margin: 0;
  color: #92948b;
  font-size: 12px;
}

.admin-close {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255,255,255,.2);
  background: transparent;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid rgba(255,255,255,.12);
}

.admin-stats article {
  min-width: 0;
  padding: 22px 26px;
  border-right: 1px solid rgba(255,255,255,.1);
}

.admin-stats article:last-child {
  border-right: 0;
}

.admin-stats span,
.admin-order-grid span {
  display: block;
  margin-bottom: 10px;
  color: #8b8d83;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.3px;
}

.admin-stats strong {
  color: #c5f334;
  font-size: clamp(20px, 3vw, 29px);
}

.admin-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 18px 26px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}

.admin-tabs button {
  padding: 12px 16px;
  border: 1px solid rgba(255,255,255,.15);
  background: transparent;
  color: #a7a99e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
}

.admin-tabs button.active {
  color: #10110d;
  background: #c5f334;
  border-color: #c5f334;
}

.admin-tabs button.admin-refresh {
  margin-left: auto;
  color: #c5f334;
}

.admin-content {
  padding: 24px 26px 32px;
}

.admin-message {
  color: #a7a99e;
  font-size: 13px;
}

.admin-error,
.admin-notice {
  padding: 12px 14px;
  margin: 0 0 16px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.admin-error {
  color: #ff9999;
  background: rgba(255,70,70,.1);
  border: 1px solid rgba(255,90,90,.35);
}

.admin-notice {
  color: #c5f334;
  background: rgba(197,243,52,.07);
  border: 1px solid rgba(197,243,52,.25);
}

.admin-orders {
  display: grid;
  gap: 14px;
}

.admin-order {
  padding: 20px;
  border: 1px solid rgba(255,255,255,.13);
  background: #151610;
}

.admin-order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,.12);
}

.admin-order-top > div {
  display: grid;
  gap: 6px;
}

.admin-order-top strong {
  color: #a7a99e;
  font-size: 11px;
}

.admin-order select,
.admin-product-form input,
.admin-product-form textarea,
.admin-product-form select {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.2);
  outline: none;
  background: #1a1b15;
  color: #f1f2ec;
  font: inherit;
  font-size: 12px;
}

.admin-order select:focus,
.admin-product-form input:focus,
.admin-product-form textarea:focus,
.admin-product-form select:focus {
  border-color: #c5f334;
}

.admin-order-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 1fr;
  gap: 22px;
  padding: 18px 0;
}

.admin-order-grid strong,
.admin-order-grid small {
  display: block;
  margin: 4px 0;
  overflow-wrap: anywhere;
}

.admin-order-grid strong {
  font-size: 12px;
}

.admin-order-grid small {
  color: #999b91;
  font-size: 11px;
}

.admin-order-grid .admin-total {
  margin-top: 10px;
  color: #c5f334;
  font-size: 19px;
}

.admin-order-items {
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.1);
}

.admin-order-items div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 5px 0;
  color: #b8baaf;
  font-size: 11px;
}

.admin-order-items strong {
  color: #f1f2ec;
}

.admin-product-layout {
  display: grid;
  grid-template-columns: minmax(280px, .9fr) minmax(320px, 1.1fr);
  gap: 28px;
}

.admin-product-form {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.13);
  background: #151610;
}

.admin-product-form h3 {
  margin: 8px 0 4px;
  font-size: 23px;
}

.admin-product-form label {
  display: grid;
  gap: 7px;
  color: #a7a99e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
}

.admin-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.admin-form-actions {
  display: flex;
  gap: 8px;
}

.admin-save,
.admin-cancel {
  padding: 13px 16px;
  border: 1px solid #c5f334;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
}

.admin-save {
  flex: 1;
  color: #111;
  background: #c5f334;
}

.admin-save:disabled {
  opacity: .5;
  cursor: wait;
}

.admin-cancel {
  color: #c5f334;
  background: transparent;
}

.admin-product-list {
  display: grid;
  align-content: start;
  gap: 10px;
}

.admin-product-list > .admin-kicker {
  margin-bottom: 7px;
}

.admin-product-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: #151610;
}

.admin-product-list article > div {
  min-width: 0;
}

.admin-product-list strong,
.admin-product-list small {
  display: block;
  margin: 4px 0;
  overflow-wrap: anywhere;
}

.admin-product-list strong {
  font-size: 12px;
}

.admin-product-list small {
  color: #999b91;
  font-size: 10px;
}

.admin-product-list button {
  padding: 9px 12px;
  border: 1px solid rgba(197,243,52,.5);
  background: transparent;
  color: #c5f334;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 760px) {
  .admin-overlay {
    padding: 8px;
  }

  .admin-header {
    padding: 20px;
  }

  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .admin-stats article:nth-child(2) {
    border-right: 0;
  }

  .admin-stats article:nth-child(-n+2) {
    border-bottom: 1px solid rgba(255,255,255,.1);
  }

  .admin-tabs {
    padding: 12px;
    flex-wrap: wrap;
  }

  .admin-tabs button {
    padding: 10px;
    font-size: 9px;
  }

  .admin-content {
    padding: 14px;
  }

  .admin-order-grid,
  .admin-product-layout {
    grid-template-columns: 1fr;
  }

  .admin-form-row {
    grid-template-columns: 1fr;
  }
}
'@

Write-File "frontend\src\components\AdminPanel.css" $adminCss

# ==========================================================
# 5. INTEGRATE ADMIN PANEL INTO EXISTING APP
# ==========================================================

$appPath = "frontend\src\App.tsx"
$appFile = Join-Path $root $appPath
$app = [System.IO.File]::ReadAllText($appFile)

if ($app -notmatch 'AdminPanel from "./components/AdminPanel"') {
    $marker = 'import OrdersModal from "./components/OrdersModal";'
    if (!$app.Contains($marker)) {
        throw "Nu am gasit importul OrdersModal in App.tsx."
    }
    $app = $app.Replace(
        $marker,
        $marker + "`r`nimport AdminPanel from `"./components/AdminPanel`";"
    )
}

if ($app -notmatch 'const \[adminOpen, setAdminOpen\]') {
    $marker = '  const [ordersOpen, setOrdersOpen] = useState(false);'
    if (!$app.Contains($marker)) {
        throw "Nu am gasit starea ordersOpen in App.tsx."
    }
    $app = $app.Replace(
        $marker,
        $marker + "`r`n  const [adminOpen, setAdminOpen] = useState(false);"
    )
}

if ($app -notmatch 'ADMIN PANEL BUTTON') {
    $marker = '          {/* BAG */}'
    if (!$app.Contains($marker)) {
        throw "Nu am gasit sectiunea BAG in header-ul App.tsx."
    }

    $adminButton = @'
          {/* ADMIN PANEL BUTTON */}
          {currentUser &&
            String(currentUser.role ?? "").toUpperCase().includes("ADMIN") && (
              <button
                className="cart-button"
                onClick={() => {
                  setCartOpen(false);
                  setOrdersOpen(false);
                  setAdminOpen(true);
                }}
              >
                ADMIN <span>⚙</span>
              </button>
            )}

'@

    $app = $app.Replace($marker, $adminButton + $marker)
}

if ($app -notmatch 'ADMIN PANEL MODAL') {
    $marker = '      {/* ORDER HISTORY */}'
    if (!$app.Contains($marker)) {
        throw "Nu am gasit zona ORDER HISTORY in App.tsx."
    }

    $adminModal = @'
      {/* ADMIN PANEL MODAL */}
      {adminOpen && currentUser &&
        String(currentUser.role ?? "").toUpperCase().includes("ADMIN") && (
          <AdminPanel
            onClose={() => setAdminOpen(false)}
            onProductsChanged={async () => {
              const refreshed = await getProducts();
              setProducts(refreshed);
            }}
          />
        )}

'@

    $app = $app.Replace($marker, $adminModal + $marker)
}

[System.IO.File]::WriteAllText($appFile, $app, $utf8)

Write-Host ""
Write-Host "TRENIX ADMIN PANEL INSTALLED." -ForegroundColor Cyan
Write-Host "Backup: $backup" -ForegroundColor Yellow
Write-Host "Admin API: /api/admin/orders and /api/admin/products" -ForegroundColor Cyan
Write-Host "Next: run backend tests and frontend build." -ForegroundColor Cyan
