
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

async function authRequest(
  endpoint: string,
  body: LoginRequest | RegisterRequest
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(data.message)
        : "Authentication request failed.";

    throw new Error(message);
  }

  const authData = data as AuthResponse;

  sessionStorage.setItem(
    "trenix_access_token",
    authData.accessToken
  );

  sessionStorage.setItem(
    "trenix_user",
    JSON.stringify({
      userId: authData.userId,
      firstName: authData.firstName,
      lastName: authData.lastName,
      email: authData.email,
      role: authData.role,
    })
  );

  return authData;
}

export async function login(
  credentials: LoginRequest
): Promise<AuthResponse> {
  return authRequest("login", credentials);
}

export async function register(
  userData: RegisterRequest
): Promise<AuthResponse> {
  return authRequest("register", userData);
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem("trenix_access_token");
}

export function getCurrentUser() {
  const savedUser = sessionStorage.getItem("trenix_user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as {
      userId: number;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  } catch {
    sessionStorage.removeItem("trenix_user");
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem("trenix_access_token");
  sessionStorage.removeItem("trenix_user");
}
