/**
 * SNI 2007 → TooDoo category resolver.
 *
 * The TooDoo backend now annotates every SCB response with `industryCategory`
 * (see README §SCB) — a coarse category derived from the two-digit SNI prefix
 * via `src/data/sni-industry-categories.json`. This module maps either:
 *
 *   1. that backend category id (e.g. `accommodation-food`),
 *   2. the two-digit SNI prefix (e.g. `56` for restaurants), or
 *   3. the full SNI code / Swedish industry label
 *
 * to whichever portal categories the admin has actually created in
 * `GET /category`. The fallback keyword lists are intentionally over-inclusive
 * so we still get a hit on Swedish or English category names.
 */

export type CategoryLike = { id: string; name: string };

/** Industry-category passed back from the backend (see ScbIndustryCategory in api.ts). */
export type IndustryCategoryLike = {
  id?: string | null;
  name?: string | null;
  sniPrefix?: string | null;
};

/** Backend industryCategory.id → ordered list of keywords/synonyms. */
const BACKEND_CATEGORY_KEYWORDS: Record<string, string[]> = {
  // SCB section I — Hotell- och restaurangverksamhet
  "accommodation-food": [
    "restaurang", "café", "cafe", "fika", "bageri", "konditori", "lunch", "bar", "pub",
    "catering", "snabbmat", "mat", "food", "hotell", "boende", "logi", "vandrarhem", "hotel",
  ],
  "hospitality": [
    "restaurang", "café", "cafe", "hotell", "bar", "pub", "mat",
  ],

  // SCB section G — Handel; reparation av motorfordon
  "wholesale-retail": [
    "butik", "shop", "handel", "detaljhandel", "shopping", "kläder", "skor",
    "presentbutik", "leksaker", "bok", "elektronik", "livsmedel", "mat", "grossist", "partihandel",
  ],
  "retail-trade": [
    "butik", "shop", "handel", "detaljhandel", "kläder", "skor", "livsmedel", "elektronik",
  ],

  // SCB section S — Annan serviceverksamhet (frisör, skönhet, tvätt, etc.)
  "other-services": [
    "frisör", "salong", "skönhet", "spa", "barber", "massage", "nagelsalong", "hudvård",
    "tvätt", "tatuering", "reparation", "service",
  ],
  "personal-services": [
    "frisör", "salong", "skönhet", "spa", "tvätt",
  ],

  // SCB section Q — Vård och omsorg
  "health-social": [
    "hälsa", "vård", "klinik", "läkare", "tandläkare", "sjukvård",
    "fysioterapi", "omsorg", "äldreboende", "social",
  ],
  "human-health": ["hälsa", "vård", "klinik", "läkare", "tandläkare"],

  // SCB section R — Kultur, nöje och fritid
  "arts-entertainment-recreation": [
    "kultur", "konst", "teater", "museum", "bibliotek", "djurpark", "akvarium", "tropikariet",
    "botanisk", "trädgård", "nöje", "nöjespark", "attraktion", "upplevelse",
    "gym", "träning", "sport", "fritid", "bowling", "padel", "yoga", "fitness",
    "spel", "vadhållning", "kasino",
  ],
  "culture-recreation": [
    "kultur", "museum", "nöje", "fritid", "sport", "gym",
  ],

  // SCB section H — Transport och magasinering
  "transport-storage": ["transport", "taxi", "buss", "logistik", "lager", "flyg"],

  // SCB section P — Utbildning
  "education": ["utbildning", "skola", "kurs", "körskola", "musikskola"],

  // SCB section F — Byggverksamhet
  "construction": ["bygg", "snickeri", "hantverk", "el", "vvs", "målning", "rör", "anläggning"],

  // SCB section K — Finans- och försäkringsverksamhet (catch-all so it doesn't false-match retail)
  "finance-insurance": ["finans", "bank", "försäkring"],

  // SCB section L — Fastighetsverksamhet
  "real-estate": ["fastighet", "fastigheter", "mäklare"],

  // SCB section J — Informations- och kommunikationsverksamhet
  "information-communication": ["it", "media", "kommunikation", "tele", "data"],
};

/**
 * Two-digit SNI division → keyword list. Used when the backend hasn't
 * tagged a category but we still have an `industryCode` like `91.410`.
 */
const SNI_DIVISION_KEYWORDS: Record<string, string[]> = {
  // 55 - Hotell- och logiverksamhet
  "55": ["hotell", "boende", "logi", "vandrarhem", "hotel"],
  // 56 - Restaurang-, catering- och barverksamhet
  "56": ["restaurang", "café", "cafe", "fika", "bageri", "bakery", "konditori", "lunch", "bar", "pub", "catering", "snabbmat", "food", "mat"],

  // 47 - Detaljhandel (utom motorfordon)
  "47": ["butik", "shop", "handel", "detaljhandel", "shopping", "kläder", "skor", "presentbutik", "leksaker", "bok", "elektronik", "mat", "livsmedel"],
  // 46 - Partihandel
  "46": ["partihandel", "grossist", "lager"],
  // 45 - Handel/reparation av motorfordon
  "45": ["bil", "verkstad", "motorcykel", "reparation"],

  // 96 - Andra konsumenttjänster
  "96": ["frisör", "salong", "skönhet", "spa", "barber", "massage", "nagelsalong", "hudvård", "tvätt", "tatuering"],

  // 86 - Hälso- och sjukvård
  "86": ["hälsa", "vård", "klinik", "läkare", "tandläkare", "sjukvård", "fysioterapi"],
  // 87 - Vård och omsorg med boende
  "87": ["omsorg", "äldreboende"],
  // 88 - Öppna sociala insatser
  "88": ["omsorg", "social"],

  // 93 - Sport-, fritids- och nöjesverksamhet
  "93": ["gym", "träning", "sport", "fritid", "nöje", "bowling", "padel", "yoga", "fitness"],
  // 92 - Spel och vadhållning
  "92": ["spel", "vadhållning", "kasino"],
  // 91 - Bibliotek, museer, djurparker, botaniska trädgårdar m.m.
  "91": ["museum", "bibliotek", "djurpark", "akvarium", "tropikariet", "botanisk", "trädgård", "nöje", "kultur"],
  // 90 - Konstnärlig och kulturell verksamhet
  "90": ["kultur", "konst", "teater"],

  // 79 - Resebyrå- och researrangörsverksamhet
  "79": ["resa", "resor", "resebyrå"],
  // 49 - Landtransport
  "49": ["transport", "taxi", "buss"],
  // 50 - Sjötransport
  "50": ["transport", "båt", "färja"],
  // 51 - Lufttransport
  "51": ["flyg", "transport"],
  // 52 - Magasinering & stödtjänster till transport
  "52": ["logistik", "lager", "transport"],

  // 85 - Utbildning
  "85": ["utbildning", "skola", "kurs", "körskola", "musikskola"],

  // 95 - Reparation av datorer och hushållsartiklar
  "95": ["reparation", "service", "verkstad"],
  // 97 - Förvärvsarbete i hushåll
  "97": ["städ", "städning", "hushåll"],

  // 41/42/43 - Byggverksamhet
  "41": ["bygg", "snickeri", "hantverk"],
  "42": ["bygg", "anläggning"],
  "43": ["bygg", "el", "vvs", "målning", "rör", "snickeri"],
};

/** Group-level (3-digit) overrides for cases where 2-digit precision isn't enough. */
const SNI_GROUP_KEYWORDS: Record<string, string[]> = {
  // 471 - Detaljhandel med brett sortiment (storbutiker / livsmedel)
  "471": ["livsmedel", "mat", "stormarknad", "supermarket", "ica", "coop"],
  // 472 - Detaljhandel med livsmedel, drycker och tobak i specialbutiker
  "472": ["livsmedel", "mat", "bageri", "konditori", "delikatess"],
  // 477 - Detaljhandel med övriga varor i specialbutiker
  "477": ["kläder", "skor", "bok", "leksaker", "presentbutik"],
  // 561 - Restauranger
  "561": ["restaurang", "lunch", "mat"],
  // 562 - Cateringverksamhet
  "562": ["catering"],
  // 563 - Barer och pubar
  "563": ["bar", "pub", "café", "cafe"],
  // 914 - Botaniska trädgårdar, djurparker och naturreservat
  "914": ["djurpark", "akvarium", "tropikariet", "botanisk", "trädgård", "nöje"],
  // 932 - Tivoli- och nöjesparker
  "932": ["nöje", "nöjespark", "attraktion"],
  // 960 - Tvätteri, frisör, kropps-/skönhetsvård etc.
  "960": ["frisör", "salong", "skönhet", "spa", "tvätt"],
};

/** Strip everything except digits and return the first n. */
function digitsPrefix(code: string | null | undefined, n: number): string {
  if (!code) return "";
  return code.replace(/[^0-9]/g, "").slice(0, n);
}

function matchByKeywords(keywords: string[], categories: CategoryLike[]): CategoryLike | undefined {
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    if (!kw) continue;
    for (const cat of categories) {
      const name = (cat.name ?? "").toLowerCase();
      if (!name) continue;
      if (name === kw || name.includes(kw) || kw.includes(name)) return cat;
    }
  }
  return undefined;
}

/** Free-text fallback — match SCB `industry` label against category names. */
function matchByIndustryLabel(industry: string, categories: CategoryLike[]): CategoryLike | undefined {
  const needle = industry.toLowerCase().trim();
  if (!needle) return undefined;
  for (const cat of categories) {
    if (!cat.name) continue;
    const name = cat.name.toLowerCase();
    if (needle.includes(name) || name.includes(needle)) return cat;
  }
  return undefined;
}

/**
 * Picks the best-matching TooDoo category id for a SCB workplace/company.
 * Returns `undefined` if nothing matches — caller should keep current selection.
 */
export function pickCategoryBySni(
  categories: CategoryLike[],
  industryCode: string | null | undefined,
  industry: string | null | undefined,
  industryCategory?: IndustryCategoryLike | null,
): string | undefined {
  if (!Array.isArray(categories) || categories.length === 0) return undefined;

  // 1) Backend-tagged industryCategory.id — most reliable.
  const backendId = industryCategory?.id?.trim().toLowerCase();
  if (backendId) {
    const keywords = BACKEND_CATEGORY_KEYWORDS[backendId];
    if (keywords) {
      const hit = matchByKeywords(keywords, categories);
      if (hit) return hit.id;
    }
    // Also try matching the backend category name directly against portal names.
    const englishName = industryCategory?.name?.trim();
    if (englishName) {
      const hit = matchByIndustryLabel(englishName, categories);
      if (hit) return hit.id;
    }
  }

  // 2) Two/three-digit SNI prefix from the backend or the raw industryCode.
  const sniSource = industryCode || industryCategory?.sniPrefix || "";
  const group = digitsPrefix(sniSource, 3);
  if (group) {
    const groupKeywords = SNI_GROUP_KEYWORDS[group];
    if (groupKeywords) {
      const hit = matchByKeywords(groupKeywords, categories);
      if (hit) return hit.id;
    }
  }
  const division = digitsPrefix(sniSource, 2);
  if (division) {
    const divisionKeywords = SNI_DIVISION_KEYWORDS[division];
    if (divisionKeywords) {
      const hit = matchByKeywords(divisionKeywords, categories);
      if (hit) return hit.id;
    }
  }

  // 3) Last resort: scan the Swedish industry label for any category name.
  if (industry) {
    const hit = matchByIndustryLabel(industry, categories);
    if (hit) return hit.id;
  }

  return undefined;
}
