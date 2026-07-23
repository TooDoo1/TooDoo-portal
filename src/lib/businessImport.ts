import type { Business, BusinessImportMetadata, BusinessSource } from "@/lib/api";

export function isBusinessImportEnriched(business: {
  googlePlaceId?: string | null;
  importMetadata?: BusinessImportMetadata | null;
}): boolean {
  if (business.googlePlaceId) return true;
  const enrichedAt = business.importMetadata?.google?.enrichedAt;
  return typeof enrichedAt === "string" && enrichedAt.length > 0;
}

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

export function getBusinessEnrichmentLabel(business: Pick<Business, "source" | "googlePlaceId" | "importMetadata">): string | null {
  if (business.source !== "IMPORTED") return null;
  return isBusinessImportEnriched(business) ? "Google-enrichat" : null;
}

export function buildGoogleMapsUrl(business: Pick<Business, "latitude" | "longitude" | "address" | "city">): string | null {
  if (typeof business.latitude === "number" && typeof business.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`;
  }
  const query = [business.address, business.city].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatImportGoogleScore(importMetadata?: BusinessImportMetadata | null): string | null {
  const score = importMetadata?.google?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return `${Math.round(score * 100)}%`;
}
