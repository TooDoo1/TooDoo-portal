import { describe, expect, it } from "vitest";

import { formatOpeningHoursLines, groupOpeningHoursRanges } from "@/lib/openingHours";

describe("groupOpeningHoursRanges", () => {
  it("folds neighboring days that share hours and keeps a different day separate", () => {
    const lines = formatOpeningHoursLines({
      monday: { from: "10:00", to: "18:00" },
      tuesday: { from: "10:00", to: "18:00" },
      wednesday: { from: "10:00", to: "18:00" },
      thursday: { from: "10:00", to: "18:00" },
      friday: { from: "10:00", to: "18:00" },
      saturday: { from: "10:00", to: "16:00" },
      sunday: { from: "11:00", to: "16:00" },
    });

    expect(groupOpeningHoursRanges(lines ?? [])).toEqual([
      { key: "monday-friday", label: "Måndag–fredag", hours: "10:00–18:00" },
      { key: "saturday-saturday", label: "Lördag", hours: "10:00–16:00" },
      { key: "sunday-sunday", label: "Söndag", hours: "11:00–16:00" },
    ]);
  });

  it("does not bridge a missing or closed day", () => {
    const lines = formatOpeningHoursLines({
      monday: { from: "10:00", to: "18:00" },
      tuesday: { closed: true },
      wednesday: { from: "10:00", to: "18:00" },
      friday: { from: "12:00", to: "15:00" },
    });

    expect(groupOpeningHoursRanges(lines ?? []).map((range) => range.label)).toEqual([
      "Måndag",
      "Onsdag",
      "Fredag",
    ]);
  });

  it("returns nothing when no day has hours", () => {
    expect(formatOpeningHoursLines({ monday: { closed: true } })).toBeNull();
    expect(formatOpeningHoursLines(null)).toBeNull();
    expect(groupOpeningHoursRanges([])).toEqual([]);
  });
});
