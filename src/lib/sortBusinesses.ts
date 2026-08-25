/** Swedish A–Z sort for admin business lists. */
export function compareBusinessName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "sv", { sensitivity: "base" });
}

export type ImportedBusinessSort =
  | "confidence_desc"
  | "confidence_asc"
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc";

export const IMPORTED_BUSINESS_SORT_OPTIONS: Array<{
  value: ImportedBusinessSort;
  label: string;
}> = [
  { value: "confidence_desc", label: "Högst confidence" },
  { value: "confidence_asc", label: "Lägst confidence" },
  { value: "newest", label: "Senast importerad" },
  { value: "oldest", label: "Äldst importerad" },
  { value: "name_asc", label: "Namn A–Ö" },
  { value: "name_desc", label: "Namn Ö–A" },
];
