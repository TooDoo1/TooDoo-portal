const rawApiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

if (!rawApiBaseUrl) {
  throw new Error(
    "VITE_API_URL is not set. Define it in your environment (e.g. a .env file) before running or building the portal.",
  );
}

const API_BASE_URL: string = rawApiBaseUrl;

export function getApiBaseUrl() {
  return API_BASE_URL;
}

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
  id?: string | null;
  url?: string | null;
  publicUrl?: string | null;
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
 * Resolve the current user's businessId from the API.
 * Non-admin users may only use the business linked to their account — never a stale localStorage value.
 */
export async function resolveBusinessId() {
  const email = getAuthEmail();
  if (!email) {
    clearBusinessId();
    return null;
  }

  try {
    const user = await getUserByEmail(email);
    if (user.businessId) {
      setBusinessId(user.businessId);
      return user.businessId;
    }

    clearBusinessId();
    return null;
  } catch {
    clearBusinessId();
    return null;
  }
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
  imageAssetId?: string;
  openingHours?: Record<string, unknown>;
  categoryId?: string;
  categoryIds?: string[];
};

export type BusinessImageRequest = {
  id?: string;
  businessId?: string;
  sourceType?: ImageSourceType;
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
  imageAssetId?: string;
  openingHours?: Record<string, unknown>;
  categoryId?: string;
  categoryIds?: string[];
};

export type BusinessStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BusinessSource = "SELF_REGISTERED" | "IMPORTED";

export type BusinessManager = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type BusinessImportMetadata = {
  scb?: Record<string, unknown>;
  importedAt?: string;
  google?: {
    placeId?: string;
    score?: number;
    scoreBreakdown?: Record<string, number>;
    query?: string;
    candidateName?: string;
    candidateAddress?: string;
    enrichedAt?: string;
    duplicatePlaceId?: boolean;
    primaryBusinessId?: string;
  };
};

export type ClaimableImport = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  openingHours: Record<string, unknown> | null;
  cfarNr: string;
  orgNr: string | null;
  categoryNames: string[];
  pendingClaimRequest?: {
    id: string;
    applicantEmail: string;
    createdAt: string;
  } | null;
};

export type SubmitBusinessClaimRequest = {
  cfarNr: string;
  orgNr: string;
  applicantEmail: string;
  contactEmail: string;
  contactPhone: string;
  name?: string;
  description?: string;
  website?: string | null;
  address?: string;
  city?: string;
  openingHours?: Record<string, unknown>;
};

export type SubmitBusinessClaimResponse = {
  requestId: string;
  businessId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type BusinessClaimRequest = {
  id: string;
  businessId: string;
  businessName: string;
  businessCity: string;
  applicantEmail: string;
  orgNr: string;
  cfarNr: string;
  proposedName: string | null;
  proposedDescription: string | null;
  proposedContactEmail: string;
  proposedContactPhone: string;
  proposedWebsite: string | null;
  proposedAddress: string | null;
  proposedCity: string | null;
  proposedOpeningHours: Record<string, unknown> | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type Business = {
  id: string;
  name: string;
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website?: string | null;
  address: string;
  city: string;
  imageUrl?: string | null;
  imageAsset?: ImageAsset | null;
  openingHours?: Record<string, unknown> | null;
  categoryId: string;
  categoryName?: string;
  categoryNames?: string[];
  category?: { id?: string; name?: string | null; icon?: string | null } | null;
  categories?: Array<{ id?: string; name?: string | null; icon?: string | null }>;
  manager?: BusinessManager | null;
  status?: BusinessStatus;
  source?: BusinessSource;
  isClaimed?: boolean;
  orgNr?: string | null;
  cfarNr?: string | null;
  sniCode?: string | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  importMetadata?: BusinessImportMetadata | null;
  createdAt?: string;
  updatedAt?: string;
};

export function normalizeOrgNumber(input: string) {
  return (input ?? "").replace(/[^\d]/g, "").trim();
}

/** Coarse industry category derived by the backend from SNI prefix. */
export type ScbIndustryCategory = {
  /** API-owned slug, e.g. "transport-storage". */
  id: string;
  /** Human-readable English name, e.g. "Transport and storage". */
  name: string;
  /** SNI 2007 prefix (2 digits) that triggered this category. */
  sniPrefix: string;
};

/** Workplace (arbetsställe) row from GET /scb/workplaces. CFAR is the unique key. */
export type ScbWorkplace = {
  cfarNr: string;
  orgNr: string;
  peOrgNr?: string | null;
  companyName: string;
  workplaceName?: string | null;
  email?: string | null;
  phone?: string | null;
  postAddress?: string | null;
  postCode?: string | null;
  postCity?: string | null;
  visitingAddress?: string | null;
  visitingPostCode?: string | null;
  visitingPostCity?: string | null;
  municipality?: string | null;
  municipalityCode?: string | null;
  county?: string | null;
  countyCode?: string | null;
  status?: string | null;
  statusCode?: string | null;
  industry?: string | null;
  industryCode?: string | null;
  industryCategory?: ScbIndustryCategory | null;
  isMainWorkplace?: boolean | null;
  startDate?: string | null;
  [key: string]: unknown;
};

export type ScbWorkplacesResponse = {
  orgNr: string;
  cfarNr?: string;
  count: number;
  workplaces: ScbWorkplace[];
};

/** UI hit; persists both org number and CFAR so the business row can store CFAR. */
export type ScbCompanySearchHit = {
  /** Display label (workplaceName when present, otherwise companyName). */
  name: string;
  /** Legal entity name (always populated). */
  companyName: string;
  /** SCB workplace name; blank for chains like Systembolaget. */
  workplaceName?: string;
  orgNumber: string;
  /** Globally unique workplace id (8 digits). */
  cfarNr: string;
  addressLine: string;
  city: string;
  street: string;
  email?: string;
  phone?: string;
  isMainWorkplace?: boolean;
  /** Free-text industry label from SCB (Swedish). */
  industry?: string;
  /** Swedish SNI 2007 industry code, e.g. "56.100" (restaurant) or "47.110" (food retail). */
  industryCode?: string;
  /** Backend-derived coarse industry category (id/name/sniPrefix). */
  industryCategory?: ScbIndustryCategory;
};

function formatScbCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function mapScbWorkplaceToSearchHit(workplace: ScbWorkplace): ScbCompanySearchHit {
  const companyName = (workplace.companyName ?? "").trim();
  const workplaceName = (workplace.workplaceName ?? "").trim();
  // Visiting address is what customers know for retail; fall back to postAddress.
  const visitingStreet = (workplace.visitingAddress ?? "").trim();
  const visitingCity = formatScbCity(workplace.visitingPostCity ?? "");
  const postStreet = (workplace.postAddress ?? "").trim();
  const postCity = formatScbCity(workplace.postCity ?? "");

  const street = visitingStreet || postStreet;
  const city = visitingCity || postCity;
  const postalCode = (workplace.visitingPostCode ?? workplace.postCode ?? "").trim();
  const addressLine = [street, [postalCode, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return {
    name: workplaceName || companyName,
    companyName,
    workplaceName: workplaceName || undefined,
    orgNumber: (workplace.orgNr ?? "").trim(),
    cfarNr: (workplace.cfarNr ?? "").trim(),
    addressLine,
    city,
    street,
    email: (workplace.email ?? "").trim() || undefined,
    phone: (workplace.phone ?? "").trim() || undefined,
    isMainWorkplace: workplace.isMainWorkplace === true ? true : undefined,
    industry: (workplace.industry ?? "").trim() || undefined,
    industryCode: (workplace.industryCode ?? "").trim() || undefined,
    industryCategory: workplace.industryCategory ?? undefined,
  };
}

/** Public lookup via TooDoo backend → SCB Arbetsställen (workplace/CFAR layout). */
export async function searchScbWorkplacesByOrgNumber(orgNumber: string) {
  const trimmed = orgNumber.trim();
  if (!trimmed) {
    throw new ApiError("Fyll i organisationsnummer.");
  }

  const data = await apiRequest<ScbWorkplacesResponse>(
    `/scb/workplaces?orgNr=${encodeURIComponent(trimmed)}`,
    { method: "GET" },
  );

  const workplaces = Array.isArray(data.workplaces) ? data.workplaces : [];
  return workplaces.map(mapScbWorkplaceToSearchHit).filter((w) => w.cfarNr);
}

/** Backwards-compatible alias — now backed by /scb/workplaces (per-CFAR rows). */
export const searchScbCompaniesByOrgNumber = searchScbWorkplacesByOrgNumber;

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
  // Total number of QR codes that have been claimed for this order (includes redeemed).
  claimedRedemptions?: number;
  // Subset of claimed QR codes that have been verified/redeemed at the business.
  redeemedRedemptions?: number;
  isActive?: boolean;
  businessId: string;
  [key: string]: unknown;
};

export type BusinessEvent = {
  id: string;
  title: string;
  description: string;
  visibleFrom: string;
  visibleTo: string;
  startsAt: string;
  endsAt: string;
  locationName?: string | null;
  imageUrl?: string | null;
  image?: ImageAsset | null;
  imageAsset?: ImageAsset | null;
  isActive?: boolean;
  businessId: string;
  business?: Business;
  _count?: { interests?: number };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type CreateBusinessEventRequest = {
  title: string;
  description: string;
  visibleFrom: string;
  visibleTo: string;
  startsAt: string;
  endsAt: string;
  locationName?: string;
  imageAssetId?: string;
  businessId?: string;
};

export type UpdateBusinessEventRequest = Partial<CreateBusinessEventRequest> & {
  isActive?: boolean;
};

export type CreateOrderRequest = {
  title: string;
  description: string;
  detailedDescription?: string;
  price: number;
  originalPrice?: number;
  imageAssetId?: string;
  orderTimeFrom: string;
  orderTimeTo: string;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
  businessId?: string;
};

export type UpdateOrderRequest = {
  title?: string;
  description?: string;
  detailedDescription?: string;
  price?: number;
  originalPrice?: number;
  imageAssetId?: string;
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
  image?: ImageAsset | null;
  imageAsset?: ImageAsset | null;
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
  imageAssetId?: string;
  maxRedemptions?: number;
};

export type UpdateOrderPresetRequest = {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  imageAssetId?: string;
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
  /** Present when the backend sends the reset email itself. */
  emailSent?: boolean;
  resetUrl?: string;
};

export function getPortalBaseUrl() {
  const configured = (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** Link opened from the reset email; must match the route in App.tsx. */
export function buildPasswordResetUrl(email: string, token: string) {
  const base = getPortalBaseUrl();
  const url = new URL(`${base}/reset-password`);
  url.searchParams.set("email", email.trim());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function forgotPasswordToken(body: ForgotPasswordTokenRequest) {
  return apiRequest<ForgotPasswordTokenResponse>("/user/forgot-password/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Requests a reset token. Backend should email `buildPasswordResetUrl` (or return resetUrl). */
export async function requestPasswordResetLink(email: string) {
  const trimmed = email.trim();
  const res = await forgotPasswordToken({ email: trimmed });
  const token = typeof res.passwordResetToken === "string" ? res.passwordResetToken.trim() : "";
  if (!token) {
    throw new ApiError("Kunde inte skapa återställningslänk.");
  }
  const resetUrl =
    typeof res.resetUrl === "string" && res.resetUrl.trim()
      ? res.resetUrl.trim()
      : buildPasswordResetUrl(trimmed, token);
  return {
    resetUrl,
    emailSent: res.emailSent === true,
  };
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
  businessId?: string | null;
  categoryId?: string | null;
  sourceType?: string;
  originalUrl?: string;
  storageKey?: string;
  publicUrl?: string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function getGalleryImageResolvedUrl(image: ImageGalleryItem): string {
  const rawUrl = image.publicUrl || image.originalUrl || "";
  return rawUrl ? resolveImageUrl(rawUrl) : "";
}

export type ImageGalleryResponse = {
  businessImages: ImageGalleryItem[];
  defaultImages: ImageGalleryItem[];
};

export async function listImages() {
  return apiRequest<ImageGalleryResponse>(
    "/images",
    { method: "GET" },
    true,
  );
}

export async function listBusinessImages(businessId: string) {
  return apiRequest<ImageGalleryResponse>(
    `/business/${encodeURIComponent(businessId)}/images`,
    { method: "GET" },
    true,
  );
}

export async function addBusinessImage(
  businessId: string,
  body: { imageSourceType: ImageSourceType; imageUrl?: string; imageFile?: File },
) {
  const wantsUpload = body.imageSourceType === "UPLOADED" || Boolean(body.imageFile);
  if (!wantsUpload) {
    return apiRequest<ImageGalleryItem>(
      `/business/${encodeURIComponent(businessId)}/images`,
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
  return apiRequestFormData<ImageGalleryItem>(
    `/business/${encodeURIComponent(businessId)}/images`,
    form,
    true,
    "POST",
  );
}

export async function deleteBusinessImage(businessId: string, imageAssetId: string) {
  return apiRequest<Record<string, unknown>>(
    `/business/${encodeURIComponent(businessId)}/images/${encodeURIComponent(imageAssetId)}`,
    { method: "DELETE" },
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
  return apiRequest<Record<string, unknown>>("/business", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function lookupClaimableImport(cfarNr: string) {
  return apiRequest<ClaimableImport>(
    `/business/import-lookup?cfarNr=${encodeURIComponent(cfarNr)}`,
    { method: "GET" },
  );
}

export async function submitBusinessClaimRequest(businessId: string, body: SubmitBusinessClaimRequest) {
  return apiRequest<SubmitBusinessClaimResponse>(
    `/business/${encodeURIComponent(businessId)}/claim`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function listBusinessClaimRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<BusinessClaimRequest[]>(`/business/claim-requests${query}`, { method: "GET" }, true);
}

export async function reviewBusinessClaimRequest(
  requestId: string,
  body: { status: "APPROVED" | "REJECTED"; note?: string },
) {
  return apiRequest<BusinessClaimRequest>(
    `/business/claim-requests/${encodeURIComponent(requestId)}/review`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    true,
  );
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

export async function listBusinesses(
  status?: BusinessStatus,
  withAuth = false,
  categoryName?: string,
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (categoryName?.trim()) params.set("categoryName", categoryName.trim());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Business[]>(`/business${query}`, { method: "GET" }, withAuth);
}

export async function getBusinessById(id: string, withAuth = false) {
  return apiRequest<Business>(`/business/${encodeURIComponent(id)}`, { method: "GET" }, withAuth);
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

export async function deleteBusiness(id: string) {
  return apiRequest<Record<string, unknown>>(
    `/business/${encodeURIComponent(id)}`,
    { method: "DELETE" },
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
  return apiRequest<Order[]>(`/orders${query}`, { method: "GET" }, Boolean(businessId));
}

export async function createBusinessEvent(body: CreateBusinessEventRequest) {
  return apiRequest<BusinessEvent>(
    "/business-events",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function updateBusinessEvent(eventId: string, body: UpdateBusinessEventRequest) {
  return apiRequest<BusinessEvent>(
    `/business-events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function listBusinessEvents(params: { businessId?: string; categoryName?: string; city?: string } = {}) {
  const query = new URLSearchParams();
  if (params.businessId) query.set("businessId", params.businessId);
  if (params.categoryName) query.set("categoryName", params.categoryName);
  if (params.city) query.set("city", params.city);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<BusinessEvent[]>(`/business-events${qs}`, { method: "GET" }, Boolean(params.businessId));
}

export async function listManagerBusinessEvents() {
  return apiRequest<BusinessEvent[]>("/business-events/manager", { method: "GET" }, true);
}

export async function getBusinessEventById(eventId: string) {
  return apiRequest<BusinessEvent>(`/business-events/${encodeURIComponent(eventId)}`, { method: "GET" });
}

export async function deleteBusinessEvent(eventId: string) {
  return apiRequest<Record<string, unknown>>(`/business-events/${encodeURIComponent(eventId)}`, { method: "DELETE" }, true);
}

export async function createOrderPreset(body: CreateOrderPresetRequest) {
  return apiRequest<OrderPreset>("/order-presets", {
    method: "POST",
    body: JSON.stringify(body),
  }, true);
}

export async function updateOrderPreset(orderPresetId: string, body: UpdateOrderPresetRequest) {
  return apiRequest<OrderPreset>(
    `/order-presets/${encodeURIComponent(orderPresetId)}`,
    { method: "PUT", body: JSON.stringify(body) },
    true,
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

export type BusinessDailySummary = {
  businessId: string;
  businessName: string;
  dateLabel: string;
  offersUpToday: number;
  claimsToday: number;
  redemptionsToday: number;
};

export async function getBusinessDailySummary(businessId: string) {
  return apiRequest<BusinessDailySummary>(
    `/business/${encodeURIComponent(businessId)}/daily-summary`,
    { method: "GET" },
    true,
  );
}

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
