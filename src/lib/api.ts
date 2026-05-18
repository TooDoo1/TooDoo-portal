const API_BASE_URL = 
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "https://toodoo-backend-ejml.onrender.com";

const TOKEN_STORAGE_KEY = "toodoo_jwt";
const USER_EMAIL_STORAGE_KEY = "toodoo_user_email";
const USER_ROLE_STORAGE_KEY = "toodoo_user_role";
const BUSINESS_ID_STORAGE_KEY = "toodoo_business_id";
const WORKER_INVITE_TOKEN_SESSION_KEY = "toodoo_worker_invite_token";

type ApiErrorShape = {
  error?: string;
  details?: Array<{ field?: string; message?: string }>;
  ok?: boolean;
  reason?: string;
};

export type ImageAsset = {
  url?: string | null;
  path?: string | null;
  mimeType?: string | null;
  [key: string]: unknown;
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
    const apiError = toApiError(payload, `Request failed (${response.status})`);
    // Attach high-signal context to the message so UI errors are actionable.
    apiError.message = `${apiError.message} [${response.status} ${init.method ?? "GET"} ${path}]`;
    throw apiError;
  }

  return payload as T;
}

async function apiRequestFormData<T>(path: string, form: FormData, withAuth = false, method: "POST" | "PUT" = "POST"): Promise<T> {
  const headers = new Headers();

  if (withAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError("Saknar inloggningstoken. Logga in igen.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: form,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const apiError = toApiError(payload, `Request failed (${response.status})`);
    apiError.message = `${apiError.message} [${response.status} ${method} ${path}]`;
    throw apiError;
  }

  return payload as T;
}

type ImageSourceType = "EXTERNAL_URL" | "UPLOADED";

function appendFormValue(form: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (value instanceof File) {
    form.append(key, value);
    return;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    // Recursively flatten nested objects into bracket notation for form data
    const flattenObject = (obj: Record<string, unknown>, prefix: string) => {
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        
        const fieldName = prefix ? `${prefix}[${k}]` : k;
        
        if (v instanceof File) {
          form.append(fieldName, v);
        } else if (typeof v === "object" && !Array.isArray(v)) {
          flattenObject(v as Record<string, unknown>, fieldName);
        } else {
          form.append(fieldName, String(v));
        }
      }
    };
    flattenObject(value as Record<string, unknown>, key);
    return;
  }
  form.append(key, String(value));
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function resolveImageUrl(url?: string | null) {
  const value = (url ?? "").trim();
  if (!value) return "";

  const normalized = value.replace(/\\/g, "/");
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return `${API_BASE_URL}/${normalized}`;
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

export function clearBusinessId() {
  localStorage.removeItem(BUSINESS_ID_STORAGE_KEY);
}

/**
 * Clear all auth-related storage used by the portal.
 * Call this on logout and when tokens are invalid/expired.
 */
export function clearAuthStorage() {
  clearAuthToken();
  clearAuthIdentity();
  clearBusinessId();
  try {
    sessionStorage.removeItem(WORKER_INVITE_TOKEN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the current manager's businessId.
 * Prefers localStorage, falls back to GET /user/:email and stores it.
 */
export async function resolveBusinessId() {
  let resolved = getBusinessId();
  if (resolved) return resolved;

  const email = getAuthEmail();
  if (!email) return null;

  const user = await getUserByEmail(email);
  if (user.businessId) {
    setBusinessId(user.businessId);
    return user.businessId;
  }

  return null;
}

export type HealthResponse = { ok?: boolean; status?: string; [key: string]: unknown };
export type Category = { id: string; name: string; icon?: string | null };

export type RegisterRequest = {
  email: string;
  password: string;
  gender?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  interests?: string[];
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
  inviteUrl?: string;
  expiresInSeconds?: number;
  emailSent?: boolean;
  emailError?: string;
  emailErrorDetail?: string;
};

export type InviteWorkerToBusinessResponse = {
  inviteToken: string;
  inviteUrl?: string;
  expiresInSeconds?: number;
  emailSent?: boolean;
  emailError?: string;
  emailErrorDetail?: string;
  recipientExists?: boolean;
  recipientIsUser?: boolean;
  recipientState?: "USER" | "MISSING" | "NON_USER";
  requiresRegistration?: boolean;
  canRedeemNow?: boolean;
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
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  openingHours?: Record<string, unknown>;
  categoryId: string;
};

export type BusinessDefaultImagesResponse = {
  category: {
    id: string;
    name: string;
  };
  images: string[];
};

export type BusinessImageRequest = {
  id?: string;
  businessId?: string;
  imageSourceType?: ImageSourceType;
  imageUrl?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type UpdateBusinessRequest = {
  name?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string | null;
  address?: string;
  city?: string;
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  openingHours?: Record<string, unknown>;
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
  imageUrl?: string | null;
  imageAsset?: ImageAsset | null;
  openingHours?: Record<string, unknown> | null;
  categoryId: string;
  categoryName?: string;
  category?: { id?: string; name?: string | null } | null;
  status?: BusinessStatus;
  createdAt?: string;
  updatedAt?: string;
};

// --- FöretagsAPI.se (frontend direct) ---
type ForetagsApiCompany = {
  name: string;
  orgNumber: string;
  score?: number;
  postalAddress?: {
    street?: string;
    postalCode?: string;
    city?: string;
  };
};

type ForetagsApiSearchResponse = {
  companies?: ForetagsApiCompany[];
};

function getForetagsApiKey() {
  const key = (import.meta.env.VITE_FORETAGS_API_KEY as string | undefined)?.trim();
  if (!key) {
    throw new ApiError("Saknar FöretagsAPI-nyckel (VITE_FORETAGS_API_KEY).");
  }
  return key;
}

export function normalizeOrgNumber(input: string) {
  return (input ?? "").replace(/[^\d]/g, "").trim();
}

export async function searchCompaniesByOrgNumber(orgNumber: string, limit = 5) {
  const normalized = normalizeOrgNumber(orgNumber);
  if (!normalized) {
    throw new ApiError("Fyll i organisationsnummer.");
  }

  const response = await fetch("https://data.foretagsapi.se/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getForetagsApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      org_number: normalized,
      limit,
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string } | null)?.error ||
      (payload as { error?: string; message?: string } | null)?.message ||
      `FöretagsAPI request failed (${response.status})`;
    throw new ApiError(message);
  }

  const data = (payload ?? {}) as ForetagsApiSearchResponse;
  return (Array.isArray(data.companies) ? data.companies : []) as ForetagsApiCompany[];
}

export type Order = {
  id: string;
  title: string;
  description: string;
  detailedDescription?: string;
  price: number | string;
  originalPrice?: number | string | null;
  imageUrl?: string | null;
  imageAsset?: ImageAsset | null;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
  businessId: string;
  [key: string]: unknown;
};

export type CreateOrderRequest = {
  title: string;
  description: string;
  detailedDescription?: string;
  price: number;
  originalPrice?: number;
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
};

export type UpdateOrderRequest = {
  title?: string;
  description?: string;
  detailedDescription?: string;
  price?: number;
  originalPrice?: number;
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  orderTimeFrom?: string;
  orderTimeTo?: string;
  validFrom?: string;
  validTo?: string;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
  isActive?: boolean;
};

export type InvoicePaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "LATE";

export type Invoice = {
  id: string;
  businessId?: string;
  paymentStatus?: InvoicePaymentStatus;
  pricePercentage?: number;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export async function listInvoices(params: { businessId?: string; paymentStatus?: InvoicePaymentStatus } = {}) {
  const query = new URLSearchParams();
  if (params.businessId) query.set("businessId", params.businessId);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<Invoice[] | { invoices: Invoice[]; total?: number }>(`/invoices${qs}`, { method: "GET" }, true);
}

export async function getInvoiceById(invoiceId: string) {
  return apiRequest<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}`, { method: "GET" }, true);
}

export async function updateInvoicePercentage(invoiceId: string, pricePercentage: number) {
  return apiRequest<Invoice>(
    `/invoices/${encodeURIComponent(invoiceId)}/percentage`,
    {
      method: "PUT",
      body: JSON.stringify({ pricePercentage }),
    },
    true,
  );
}

export type OrderPreset = {
  id: string;
  title: string;
  description: string;
  price: number | string;
  originalPrice?: number | string | null;
  imageUrl?: string | null;
  maxRedemptions?: number;
  isArchived?: boolean;
  businessId: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type CreateOrderPresetRequest = {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  maxRedemptions?: number;
};

export type UpdateOrderPresetRequest = {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  imageSourceType?: ImageSourceType;
  imageUrl?: string;
  imageFile?: File;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
  isArchived?: boolean;
};

export type ListOrderPresetsResponse = {
  presets: OrderPreset[];
  total?: number;
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

export type ForgotPasswordTokenRequest = {
  email: string;
};

export type ForgotPasswordTokenResponse = {
  passwordResetToken: string;
};

export async function forgotPasswordToken(body: ForgotPasswordTokenRequest) {
  return apiRequest<ForgotPasswordTokenResponse>("/user/forgot-password/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type ForgotPasswordResetRequest = {
  email: string;
  password: string;
  token: string;
};

export type ForgotPasswordResetResponse = {
  message?: string;
};

export async function forgotPasswordReset(body: ForgotPasswordResetRequest) {
  return apiRequest<ForgotPasswordResetResponse>("/user/forgot-password/reset", {
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

export async function inviteWorkerToBusiness(email: string, managerEmail?: string) {
  return apiRequest<InviteWorkerToBusinessResponse>(
    `/user/worker/${encodeURIComponent(email)}/assign-business/invite`,
    {
      method: "POST",
      body: JSON.stringify({ managerEmail }),
    },
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

export type ImageGalleryItem = {
  id: string;
  businessId?: string;
  sourceType?: string;
  originalUrl?: string;
  storageKey?: string;
  publicUrl?: string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listImages() {
  return apiRequest<ImageGalleryItem[]>(
    "/images",
    { method: "GET" },
    true,
  );
}

export type ChangeMyPasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export async function changeMyPassword(body: ChangeMyPasswordRequest) {
  return apiRequest<Record<string, unknown>>(
    "/user/me/password",
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
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
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<Record<string, unknown>>("/business", {
      method: "POST",
      body: JSON.stringify(jsonBody),
    });
  }

  const form = new FormData();
  appendFormValue(form, "name", body.name);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "contactEmail", body.contactEmail);
  appendFormValue(form, "contactPhone", body.contactPhone);
  appendFormValue(form, "website", body.website);
  appendFormValue(form, "address", body.address);
  appendFormValue(form, "city", body.city);
  appendFormValue(form, "categoryId", body.categoryId);
  appendFormValue(form, "openingHours", body.openingHours);
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  return apiRequestFormData<Record<string, unknown>>("/business", form, false, "POST");
}

export async function getBusinessDefaultImages(categoryId: string) {
  const query = new URLSearchParams({ categoryId }).toString();
  return apiRequest<BusinessDefaultImagesResponse>(`/business/default-images?${query}`, { method: "GET" });
}

export async function submitBusinessImageRequest(body: { imageSourceType: ImageSourceType; imageUrl?: string; imageFile?: File }) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    return apiRequest<BusinessImageRequest>(
      "/business/image-requests",
      {
        method: "POST",
        body: JSON.stringify({ imageSourceType: body.imageSourceType, imageUrl: body.imageUrl }),
      },
      true,
    );
  }

  const form = new FormData();
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  return apiRequestFormData<BusinessImageRequest>("/business/image-requests", form, true, "POST");
}

export async function listBusinessImageRequests(params: { status?: string; businessId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.businessId) query.set("businessId", params.businessId);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<BusinessImageRequest[]>(`/business/image-requests${qs}`, { method: "GET" }, true);
}

export async function reviewBusinessImageRequest(requestId: string, status: "APPROVED" | "DECLINED") {
  return apiRequest<BusinessImageRequest>(
    `/business/image-requests/${encodeURIComponent(requestId)}/review`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    true,
  );
}

export async function listBusinesses(status?: BusinessStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<Business[]>(`/business${query}`, { method: "GET" });
}

export async function getBusinessById(id: string) {
  return apiRequest<Business>(`/business/${encodeURIComponent(id)}`, { method: "GET" });
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
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<Business>(
      `/business/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(jsonBody),
      },
      true,
    );
  }

  const form = new FormData();
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  appendFormValue(form, "name", body.name);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "contactEmail", body.contactEmail);
  appendFormValue(form, "contactPhone", body.contactPhone);
  appendFormValue(form, "website", body.website);
  appendFormValue(form, "address", body.address);
  appendFormValue(form, "city", body.city);
  appendFormValue(form, "openingHours", body.openingHours);
  return apiRequestFormData<Business>(`/business/${encodeURIComponent(id)}`, form, true, "PUT");
}

export async function createOrder(body: CreateOrderRequest) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(jsonBody),
    }, true);
  }

  const form = new FormData();
  appendFormValue(form, "title", body.title);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "detailedDescription", body.detailedDescription);
  appendFormValue(form, "price", body.price);
  appendFormValue(form, "originalPrice", body.originalPrice);
  appendFormValue(form, "orderTimeFrom", body.orderTimeFrom);
  appendFormValue(form, "orderTimeTo", body.orderTimeTo);
  appendFormValue(form, "validFrom", body.validFrom);
  appendFormValue(form, "validTo", body.validTo);
  appendFormValue(form, "maxRedemptions", body.maxRedemptions);
  appendFormValue(form, "perPersonRedemptions", body.perPersonRedemptions);
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  return apiRequestFormData<Order>("/orders", form, true, "POST");
}

export async function updateOrder(orderId: string, body: UpdateOrderRequest) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: JSON.stringify(jsonBody),
    }, true);
  }

  const form = new FormData();
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  appendFormValue(form, "title", body.title);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "detailedDescription", body.detailedDescription);
  appendFormValue(form, "price", body.price);
  appendFormValue(form, "originalPrice", body.originalPrice);
  appendFormValue(form, "orderTimeFrom", body.orderTimeFrom);
  appendFormValue(form, "orderTimeTo", body.orderTimeTo);
  appendFormValue(form, "validFrom", body.validFrom);
  appendFormValue(form, "validTo", body.validTo);
  appendFormValue(form, "maxRedemptions", body.maxRedemptions);
  appendFormValue(form, "perPersonRedemptions", body.perPersonRedemptions);
  appendFormValue(form, "isActive", body.isActive);
  return apiRequestFormData<Order>(`/orders/${encodeURIComponent(orderId)}`, form, true, "PUT");
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
  return apiRequest<Order[]>(`/orders${query}`, { method: "GET" }, Boolean(businessId));
}

export async function createOrderPreset(body: CreateOrderPresetRequest) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<OrderPreset>("/order-presets", {
      method: "POST",
      body: JSON.stringify(jsonBody),
    }, true);
  }

  const form = new FormData();
  appendFormValue(form, "title", body.title);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "price", body.price);
  appendFormValue(form, "originalPrice", body.originalPrice);
  appendFormValue(form, "maxRedemptions", body.maxRedemptions);
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  return apiRequestFormData<OrderPreset>("/order-presets", form, true, "POST");
}

export async function updateOrderPreset(orderPresetId: string, body: UpdateOrderPresetRequest) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    const { imageFile: _imageFile, ...jsonBody } = body;
    return apiRequest<OrderPreset>(
      `/order-presets/${encodeURIComponent(orderPresetId)}`,
      { method: "PUT", body: JSON.stringify(jsonBody) },
      true,
    );
  }

  const form = new FormData();
  appendFormValue(form, "imageSourceType", "UPLOADED");
  appendFormValue(form, "image", body.imageFile);
  appendFormValue(form, "title", body.title);
  appendFormValue(form, "description", body.description);
  appendFormValue(form, "price", body.price);
  appendFormValue(form, "originalPrice", body.originalPrice);
  appendFormValue(form, "maxRedemptions", body.maxRedemptions);
  appendFormValue(form, "perPersonRedemptions", body.perPersonRedemptions);
  appendFormValue(form, "isArchived", body.isArchived);
  return apiRequestFormData<OrderPreset>(
    `/order-presets/${encodeURIComponent(orderPresetId)}`,
    form,
    true,
    "PUT",
  );
}

export async function listOrderPresets(params: { skip?: number; take?: number; includeArchived?: boolean } = {}) {
  const query = new URLSearchParams();
  if (typeof params.skip === "number") query.set("skip", String(params.skip));
  if (typeof params.take === "number") query.set("take", String(params.take));
  if (typeof params.includeArchived === "boolean") query.set("includeArchived", params.includeArchived ? "true" : "false");
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ListOrderPresetsResponse | OrderPreset[]>(`/order-presets${qs}`, { method: "GET" }, true);
}

export async function deleteOrderPreset(orderPresetId: string) {
  return apiRequest<Record<string, unknown>>(
    `/order-presets/${encodeURIComponent(orderPresetId)}`,
    { method: "DELETE" },
    true,
  );
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
  const run = async (queryParams: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== "") query.set(key, value);
    }
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<LogEntry[] | { logs: LogEntry[]; total?: number }>(`/log${qs}`, { method: "GET" }, true);
  };

  const status = params.status;
  const take = typeof params.take === "number" ? String(params.take) : undefined;
  const skip = typeof params.skip === "number" ? String(params.skip) : undefined;

  try {
    // Expected contract per README.
    return await run({ status, take, skip });
  } catch (error) {
    // Some backend deployments validate query schema strictly and may use different key names.
    const apiError = error as ApiError;
    const isAdditionalProps =
      apiError?.name === "ApiError" &&
      apiError?.message?.includes("Validation Error") &&
      Array.isArray(apiError?.details) &&
      apiError.details.some((d) => d?.field?.includes("additionalProperties"));

    if (!isAdditionalProps) throw error;

    // Try alternative pagination keys.
    try {
      return await run({ status, limit: take, offset: skip });
    } catch {
      // Last resort: no pagination in query.
      return await run({ status });
    }
  }
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
