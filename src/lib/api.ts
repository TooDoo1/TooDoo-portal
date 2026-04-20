const API_BASE_URL = 
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "https://toodoo-backend-ejml.onrender.com";

const TOKEN_STORAGE_KEY = "toodoo_jwt";
const USER_EMAIL_STORAGE_KEY = "toodoo_user_email";
const USER_ROLE_STORAGE_KEY = "toodoo_user_role";
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

export function getAuthEmail() {
  return localStorage.getItem(USER_EMAIL_STORAGE_KEY);
}

export function setAuthEmail(email: string) {
  localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
}

export function getAuthRole() {
  return localStorage.getItem(USER_ROLE_STORAGE_KEY);
}

export function setAuthRole(role: string) {
  localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
}

export function clearAuthIdentity() {
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);
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
  gender?: string;
  firstName?: string;
  lastName?: string;
  businessId?: string;
};

export type RegisterManagerRequest = {
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  refreshToken?: string;
  user?: User;
};

export type User = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  role?: string | null;
  businessId?: string | null;
};

export type AssignManagerBusinessRequest = {
  businessId: string;
};

export type InviteManagerToBusinessResponse = {
  inviteToken: string;
  expiresInSeconds?: number;
};

export type InviteWorkerToBusinessResponse = {
  inviteToken: string;
  expiresInSeconds?: number;
  recipientExists?: boolean;
  recipientIsUser?: boolean;
};

export type RedeemManagerInviteRequest = {
  inviteToken: string;
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
  logoUrl?: string;
  categoryId: string;
};

export type UpdateBusinessRequest = {
  name?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string | null;
  address?: string;
  city?: string;
  logoUrl?: string | null;
};

export type BusinessStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Business = {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website?: string | null;
  address: string;
  city: string;
  logoUrl?: string | null;
  categoryId: string;
  categoryName?: string;
  status?: BusinessStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = {
  id: string;
  title: string;
  description: string;
  detailedDescription?: string;
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
  detailedDescription?: string;
  price: number;
  originalPrice?: number;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
};

export type UpdateOrderRequest = {
  title?: string;
  description?: string;
  detailedDescription?: string;
  price?: number;
  originalPrice?: number;
  orderTimeFrom?: string;
  orderTimeTo?: string;
  validFrom?: string;
  validTo?: string;
  maxRedemptions?: number;
  isActive?: boolean;
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

export async function registerManager(body: RegisterManagerRequest) {
  return apiRequest<Record<string, unknown>>("/user/register/manager", {
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

export async function loginPortal(body: LoginRequest) {
  return apiRequest<LoginResponse>("/user/login/portal", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getUserByEmail(email: string) {
  return apiRequest<User>(`/user/${encodeURIComponent(email)}`, { method: "GET" }, true);
}

export async function assignBusinessToManager(email: string, body: AssignManagerBusinessRequest) {
  return apiRequest<User>(
    `/user/manager/${encodeURIComponent(email)}/assign-business`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function inviteManagerToBusiness(email: string, businessId: string) {
  return apiRequest<InviteManagerToBusinessResponse>(
    `/user/manager/${encodeURIComponent(email)}/assign-business/invite`,
    {
      method: "POST",
      body: JSON.stringify({ businessId }),
    },
    true,
  );
}

export async function redeemManagerInvite(email: string, inviteToken: string) {
  return apiRequest<User>(
    `/user/manager/${encodeURIComponent(email)}/assign-business`,
    {
      method: "POST",
      body: JSON.stringify({ inviteToken }),
    },
    true,
  );
}

export async function inviteWorkerToBusiness(email: string) {
  return apiRequest<InviteWorkerToBusinessResponse>(
    `/user/worker/${encodeURIComponent(email)}/assign-business/invite`,
    { method: "POST" },
    true,
  );
}

export async function redeemWorkerInvite(email: string, inviteToken: string) {
  return apiRequest<User>(
    `/user/worker/${encodeURIComponent(email)}/assign-business`,
    {
      method: "POST",
      body: JSON.stringify({ inviteToken }),
    },
    true,
  );
}

export type ListWorkersResponse = {
  workers: User[];
  total: number;
};

export async function listWorkers(skip = 0, take = 100) {
  return apiRequest<ListWorkersResponse>(
    `/user/workers?skip=${skip}&take=${take}`,
    { method: "GET" },
    true,
  );
}

export async function removeWorkerFromBusiness(userId: string) {
  return apiRequest<Record<string, unknown>>(
    `/user/worker/${encodeURIComponent(userId)}/remove-business`,
    { method: "DELETE" },
    true,
  );
}

export async function listCategories(name?: string) {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  return apiRequest<Category[]>(`/category${query}`, { method: "GET" });
}

export async function createCategory(body: CreateCategoryRequest) {
  return apiRequest<Category>("/category", {
    method: "POST",
    body: JSON.stringify(body),
  }, true);
}

export async function createBusiness(body: CreateBusinessRequest) {
  return apiRequest<Record<string, unknown>>("/business", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listBusinesses(status?: BusinessStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<Business[]>(`/business${query}`, { method: "GET" });
}

export async function updateBusinessStatus(id: string, status: BusinessStatus) {
  return apiRequest<Business>(
    `/business/${encodeURIComponent(id)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    true,
  );
}

export async function updateBusiness(id: string, body: UpdateBusinessRequest) {
  return apiRequest<Business>(
    `/business/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function createOrder(body: CreateOrderRequest) {
  return apiRequest<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  }, true);
}

export async function updateOrder(orderId: string, body: UpdateOrderRequest) {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }, true);
}

export async function listOrders(categoryName?: string, businessId?: string) {
  const params = new URLSearchParams();
  if (categoryName) {
    params.set("categoryName", categoryName);
  }
  if (businessId) {
    params.set("businessId", businessId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Order[]>(`/orders${query}`, { method: "GET" });
}

export async function getOrderById(orderId: string) {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export async function deleteOrder(orderId: string) {
  return apiRequest<Record<string, unknown>>(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" }, true);
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

export type Redemption = {
  id: string;
  businessId: string;
  orderId: string;
  userId: string;
  qrCodeId?: string | null;
  redeemedAt: string;
  order?: { id: string; title: string; price: string; originalPrice?: string | null; imageUrl?: string | null };
  user?: { id: string; email: string; firstName?: string | null; lastName?: string | null };
};

export async function getBusinessRedemptions(businessId: string) {
  return apiRequest<Redemption[]>(
    `/business/${encodeURIComponent(businessId)}/redemptions`,
    { method: "GET" },
    true,
  );
}

export type LogStatus = "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "FAILURE";

export type LogEntry = {
  id: string;
  status: LogStatus;
  message?: string | null;
  createdAt: string;
  metadata?: unknown;
  [key: string]: unknown;
};

export async function listLogs(params: { status?: LogStatus; take?: number; skip?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (typeof params.take === "number") query.set("take", String(params.take));
  if (typeof params.skip === "number") query.set("skip", String(params.skip));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<LogEntry[] | { logs: LogEntry[]; total?: number }>(`/log${qs}`, { method: "GET" }, true);
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
