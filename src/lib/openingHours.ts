import type { Business } from "@/lib/api";

export const OPENING_HOURS_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type OpeningHoursDayKey = (typeof OPENING_HOURS_DAY_KEYS)[number];

export const OPENING_HOURS_DAY_LABELS: Record<OpeningHoursDayKey, string> = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
  saturday: "Lördag",
  sunday: "Söndag",
};

export type OpeningHoursLine = {
  key: OpeningHoursDayKey;
  label: string;
  hours: string;
};

export function formatOpeningHoursLines(
  openingHours: Business["openingHours"],
): OpeningHoursLine[] | null {
  if (!openingHours || typeof openingHours !== "object") return null;

  const record = openingHours as Record<string, unknown>;
  const lines = OPENING_HOURS_DAY_KEYS.flatMap((day) => {
    const value = record[day];
    if (!value || typeof value !== "object") return [];
    const hours = value as { from?: unknown; to?: unknown; closed?: unknown };
    if (hours.closed === true) return [];
    const from = typeof hours.from === "string" ? hours.from.trim() : "";
    const to = typeof hours.to === "string" ? hours.to.trim() : "";
    if (!from || !to) return [];
    return [{ key: day, label: OPENING_HOURS_DAY_LABELS[day], hours: `${from}–${to}` }];
  });

  return lines.length > 0 ? lines : null;
}
