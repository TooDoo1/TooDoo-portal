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

const REGISTRY_TAG_LABELS: Record<string, string> = {
  "org-nr-saknas": "Org.nr saknas",
  "org-nr-ej-i-scb": "Org.nr ej i SCB",
  "fel-org-nr": "Fel org.nr",
  "org-nr-osaker": "Osäker org.nr",
  "cfar-matchad": "CFAR matchad",
  "cfar-ej-matchad": "CFAR ej matchad",
  "scb-ej-tillganglig": "SCB ej tillgänglig",
};

export function getRegistryTagLabel(tag: string): string {
  return REGISTRY_TAG_LABELS[tag] ?? tag;
}

export function getRegistryTags(metadata: BusinessImportMetadata | null | undefined): string[] {
  const ai = getAiImportMetadata(metadata);
  const fromRegistry = ai?.registry?.tags ?? [];
  const fromSearch = ai?.searchMetadata?.tags ?? [];
  const merged = [...fromRegistry, ...fromSearch].filter(
    (tag): tag is string => Boolean(tag?.trim()),
  );
  return [...new Set(merged.filter((tag) => tag in REGISTRY_TAG_LABELS))];
}

export function formatRegistryStatus(status: string | null | undefined): string | null {
  switch (status) {
    case "verified":
      return "Verifierad";
    case "cfar_matched":
      return "CFAR matchad";
    case "missing_org_nr":
      return "Org.nr saknas";
    case "org_nr_not_in_scb":
      return "Org.nr ej i SCB";
    case "org_nr_mismatch":
      return "Fel org.nr";
    case "org_nr_uncertain":
      return "Osäker org.nr";
    case "cfar_unmatched":
      return "CFAR ej matchad";
    case "scb_unavailable":
      return "SCB ej tillgänglig";
    default:
      return status?.trim() || null;
  }
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
