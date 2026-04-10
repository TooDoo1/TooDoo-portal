const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "https://toodoo-backend-ejml.onrender.com";

const TOKEN_STORAGE_KEY = "toodoo_jwt";
const BUSINESS_ID_STORAGE_KEY = "toodoo_business_id";

type ApiErrorShape = {
  error?: string;
  details?: Array<{ field?: string; message?: string }>;
  ok?: boolean;
  reason?: string;
};

export class ApiError extends Error {
  details?: Array<{ field?: string; message?: string }>;
  reason?: string;

  constructor(message: string, options?: { details?: Array<{ field?: string; message?: string }>; reason?: string }) {
    super(message);
    this.name = "ApiError";
    this.details = options?.details;
    this.reason = options?.reason;
  }
}

function toApiError(payload: unknown, fallbackMessage: string): ApiError {
  const value = (payload ?? {}) as ApiErrorShape;

  if (value.ok === false && value.reason) {
    return new ApiError(value.reason, { reason: value.reason });
  }

  if (value.error === "Validation Error") {
    return new ApiError(value.error, { details: value.details ?? [] });
  }

  if (value.error) {
    return new ApiError(value.error, { details: value.details ?? [] });
  }

  return new ApiError(fallbackMessage);
}

async function apiRequest<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (withAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError("Saknar inloggningstoken. Logga in igen.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw toApiError(payload, `Request failed (${response.status})`);
  }

  return payload as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getBusinessId() {
  return localStorage.getItem(BUSINESS_ID_STORAGE_KEY);
}

export function setBusinessId(id: string) {
  localStorage.setItem(BUSINESS_ID_STORAGE_KEY, id);
}

export type HealthResponse = { ok?: boolean; status?: string; [key: string]: unknown };
export type Category = { id: string; name: string; icon?: string | null };

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export type CreateCategoryRequest = {
  name: string;
  icon?: string;
};

export type CreateBusinessRequest = {
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  address: string;
  city: string;
  categoryId: string;
};

export type Order = {
  id: string;
  title: string;
  description: string;
  price: number | string;
  originalPrice?: number | string | null;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
  businessId: string;
  [key: string]: unknown;
};

export type CreateOrderRequest = {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
  businessId: string;
};

export type ClaimResponse = {
  ok: boolean;
  qrCode?: {
    id: string;
    code: string;
    orderId: string;
    userId: string;
    expiresAt: string;
  };
  reason?: string;
};

export type ValidateClaimResponse = {
  ok: boolean;
  reason?: string;
  order?: Order;
  user?: { id: string; email: string; name?: string };
  redemptionId?: string;
};

export async function getHealth() {
  return apiRequest<HealthResponse>("/health", { method: "GET" });
}

export async function getHealthDb() {
  return apiRequest<HealthResponse>("/health/db", { method: "GET" });
}

export async function registerUser(body: RegisterRequest) {
  return apiRequest<Record<string, unknown>>("/user/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function loginUser(body: LoginRequest) {
  return apiRequest<LoginResponse>("/user/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listCategories(name?: string) {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  return apiRequest<Category[]>(`/category${query}`, { method: "GET" });
}

export async function createCategory(body: CreateCategoryRequest) {
  return apiRequest<Category>("/category", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createBusiness(body: CreateBusinessRequest) {
  return apiRequest<Record<string, unknown>>("/business", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createOrder(body: CreateOrderRequest) {
  return apiRequest<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listOrders(categoryName?: string) {
  const query = categoryName ? `?categoryName=${encodeURIComponent(categoryName)}` : "";
  return apiRequest<Order[]>(`/orders${query}`, { method: "GET" });
}

export async function getOrderById(orderId: string) {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export async function claimOrder(orderId: string) {
  return apiRequest<ClaimResponse>(
    "/claim",
    {
      method: "POST",
      body: JSON.stringify({ orderId }),
    },
    true,
  );
}

export async function validateClaim(qrCode: string) {
  return apiRequest<ValidateClaimResponse>(
    "/claim/validate",
    {
      method: "POST",
      body: JSON.stringify({ qrCode }),
    },
    true,
  );
}
