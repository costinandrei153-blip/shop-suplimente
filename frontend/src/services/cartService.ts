
import { getAccessToken } from "./authService";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export interface CartItemResponse {
  id: number;
  productId: number;
  productName: string;
  brand: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  cartId: number;
  items: CartItemResponse[];
  totalItems: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

async function cartRequest(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<CartResponse> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("You must be logged in to access your cart.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body !== undefined && {
        "Content-Type": "application/json",
      }),
    },
    ...(body !== undefined && {
      body: JSON.stringify(body),
    }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(data.message)
        : `Cart request failed. HTTP ${response.status}`;

    throw new Error(message);
  }

  return data as CartResponse;
}

export function getCart(): Promise<CartResponse> {
  return cartRequest("/cart", "GET");
}

export function addToCart(
  productId: number,
  quantity: number
): Promise<CartResponse> {
  return cartRequest("/cart/items", "POST", {
    productId,
    quantity,
  });
}

export function updateCartItem(
  productId: number,
  quantity: number
): Promise<CartResponse> {
  return cartRequest(`/cart/items/${productId}`, "PUT", {
    quantity,
  });
}

export function removeFromCart(
  productId: number
): Promise<CartResponse> {
  return cartRequest(`/cart/items/${productId}`, "DELETE");
}

export function clearCart(): Promise<CartResponse> {
  return cartRequest("/cart", "DELETE");
}
