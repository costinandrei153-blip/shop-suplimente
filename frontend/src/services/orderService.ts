const API_BASE_URL = "http://localhost:8080";

export interface CheckoutRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  city: string;
  county: string;
  postalCode: string;
  notes?: string;
}

export interface OrderItemResponse {
  id: number;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderResponse {
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
  notes: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItemResponse[];
}

function readJwtFromStorage(): string {
  const stores = [window.sessionStorage, window.localStorage];

  for (const store of stores) {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);

      if (!key) continue;

      const value = store.getItem(key);

      if (
        value &&
        /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
      ) {
        return value;
      }
    }
  }

  throw new Error("Sesiunea a expirat. Autentifică-te din nou.");
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const message = value.trim();

    return message && message !== "[object Object]"
      ? message
      : null;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => extractErrorMessage(item))
      .filter((message): message is string => Boolean(message));

    return messages.length > 0 ? messages.join(". ") : null;
  }

  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;

    // Erori de validare pe câmpuri.
    for (const key of [
      "errors",
      "validationErrors",
      "fieldErrors",
      "violations",
    ]) {
      if (data[key] !== undefined) {
        const validationMessage = extractErrorMessage(data[key]);

        if (validationMessage) {
          return validationMessage;
        }
      }
    }

    // Mesaje standard din backend / Spring Boot.
    for (const key of [
      "message",
      "detail",
      "errorMessage",
      "description",
      "error_description",
      "title",
      "error",
    ]) {
      if (data[key] !== undefined) {
        const message = extractErrorMessage(data[key]);

        if (message) {
          return message;
        }
      }
    }

    // Ultima încercare: verificăm proprietățile obiectului.
    for (const [key, nestedValue] of Object.entries(data)) {
      if (["status", "timestamp", "path", "type"].includes(key)) {
        continue;
      }

      const message = extractErrorMessage(nestedValue);

      if (message) {
        return `${key}: ${message}`;
      }
    }
  }

  return null;
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = readJwtFromStorage();

  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const responseText = await response.text();

  let body: unknown = null;

  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(body);

    throw new Error(
      message ||
        `Cererea a eșuat. HTTP ${response.status} ${response.statusText}`
    );
  }

  return body as T;
}

export function checkoutOrder(
  data: CheckoutRequest
): Promise<OrderResponse> {
  return request<OrderResponse>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyOrders(): Promise<OrderResponse[]> {
  return request<OrderResponse[]>("/api/orders");
}

export function getMyOrder(orderId: number): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${orderId}`);
}