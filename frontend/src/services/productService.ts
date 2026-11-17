
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export interface ApiCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface ApiProduct {
  id: number;
  name: string;
  brand: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: ApiCategory;
}

export async function getProducts(): Promise<ApiProduct[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load products. HTTP ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid products response from server.");
  }

  return data as ApiProduct[];
}
