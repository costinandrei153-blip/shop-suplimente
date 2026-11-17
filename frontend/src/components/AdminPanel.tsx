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
  PENDING: "In asteptare",
  CONFIRMED: "Confirmata",
  PROCESSING: "ÃŽn procesare",
  SHIPPED: "ExpediatÄƒ",
  DELIVERED: "LivratÄƒ",
  CANCELLED: "AnulatÄƒ",
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
        err instanceof Error ? err.message : "Nu s-au putut Ã®ncÄƒrca datele."
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
      setNotice(`Comanda #${id} a fost actualizata.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Actualizarea a eÈ™uat.");
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
        throw new Error("CompleteazÄƒ corect toate cÃ¢mpurile obligatorii.");
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
        setNotice("Produsul a fost adÄƒugat.");
      }

      resetForm();
      await loadProducts();
      await onProductsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvarea a eÈ™uat.");
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
          <button className="admin-close" onClick={onClose}>-</button>
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
             REFRESH
          </button>
        </nav>

        <div className="admin-content">
          {loading && <p className="admin-message">LOADING ADMIN DATA...</p>}

          {error && <p className="admin-error">{error}</p>}
          {notice && <p className="admin-notice">{notice}</p>}

          {!loading && tab === "orders" && (
            <div className="admin-orders">
              {orders.length === 0 && (
                <p className="admin-message">Nu existÄƒ comenzi Ã®ncÄƒ.</p>
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
                        <span>{item.productName} - {item.quantity}</span>
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
                    {saving ? "SAVING..." : editingId !== null ? "SAVE CHANGES >" : "CREATE PRODUCT >"}
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
                      <small>{product.categoryName} Â· {product.brand}</small>
                      <small>{money(product.price)} Â· Stock: {product.stock}</small>
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