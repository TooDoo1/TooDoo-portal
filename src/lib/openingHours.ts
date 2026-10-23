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

export type OpeningHoursRange = {
  key: string;
  label: string;
  hours: string;
};

/** Fold neighboring days that share the same hours. A gap stays split, so a missing day is not shown as open. */
export function groupOpeningHoursRanges(lines: OpeningHoursLine[]): OpeningHoursRange[] {
  const ranges: Array<{ start: OpeningHoursDayKey; end: OpeningHoursDayKey; hours: string }> = [];

  for (const line of lines) {
    const currentIndex = OPENING_HOURS_DAY_KEYS.indexOf(line.key);
    const previous = ranges[ranges.length - 1];
    const previousIndex = previous ? OPENING_HOURS_DAY_KEYS.indexOf(previous.end) : -2;
    if (previous && previous.hours === line.hours && currentIndex === previousIndex + 1) {
      previous.end = line.key;
      continue;
    }
    ranges.push({ start: line.key, end: line.key, hours: line.hours });
  }

  return ranges.map((range) => {
    const startLabel = OPENING_HOURS_DAY_LABELS[range.start];
    const endLabel = OPENING_HOURS_DAY_LABELS[range.end];
    const label =
      range.start === range.end
        ? startLabel
        : `${startLabel}–${endLabel.toLocaleLowerCase("sv-SE")}`;
    return { key: `${range.start}-${range.end}`, label, hours: range.hours };
  });
}
