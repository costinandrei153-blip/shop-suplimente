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

  throw new Error("Sesiunea a expirat. AutentificÄƒ-te din nou.");
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