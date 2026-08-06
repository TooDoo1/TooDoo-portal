import type {
  Business,
  BusinessAiImportMetadata,
  BusinessImportMetadata,
  BusinessSource,
} from "@/lib/api";

export function getBusinessOriginLabel(source?: BusinessSource): string {
  switch (source) {
    case "IMPORTED":
      return "Importerat";
    case "SELF_REGISTERED":
      return "Självregistrerat";
    default:
      return "Okänt ursprung";
  }
}

export function getBusinessClaimLabel(
  business: Pick<Business, "source" | "isClaimed"> & { hasManager?: boolean },
): string | null {
  if (typeof business.hasManager === "boolean") {
    return business.hasManager ? "Ägt" : "Ej ägt";
  }
  if (business.source !== "IMPORTED") return null;
  return business.isClaimed ? "Ägt" : "Ej ägt";
}

export function buildGoogleMapsUrl(business: Pick<Business, "latitude" | "longitude" | "address" | "city">): string | null {
  if (typeof business.latitude === "number" && typeof business.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`;
  }
  const query = [business.address, business.city].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getAiImportMetadata(
  metadata: BusinessImportMetadata | null | undefined,
): BusinessAiImportMetadata | null {
  const ai = metadata?.ai;
  if (!ai || typeof ai !== "object") return null;
  return ai;
}

export function isAiFlaggedImport(metadata: BusinessImportMetadata | null | undefined): boolean {
  return getAiImportMetadata(metadata)?.gate?.action === "flag";
}

export function formatImportConfidence(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}

export function formatAiEntityType(value: string | null | undefined): string | null {
  switch (value) {
    case "commercial":
      return "Kommersiell";
    case "municipalPublic":
      return "Kommunal / publik";
    default:
      return value?.trim() || null;
  }
}

export function formatAiClaimPath(value: string | null | undefined): string | null {
  switch (value) {
    case "in_app":
      return "I appen";
    case "email":
      return "Via e-post till TooDoo";
    default:
      return value?.trim() || null;
  }
}

export function formatAiPriceLevel(value: string | null | undefined): string | null {
  switch (value) {
    case "budget":
      return "Budget";
    case "mid":
      return "Mellan";
    case "premium":
      return "Premium";
    default:
      return value?.trim() || null;
  }
}

export function formatAiOutletsEstimate(value: string | null | undefined): string | null {
  switch (value) {
    case "1":
      return "1 i staden";
    case "2+":
      return "2+ i staden";
    case "unknown":
      return "Okänt";
    default:
      return value?.trim() || null;
  }
}

export function formatImportedAt(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
