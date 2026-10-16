import { describe, expect, it } from "vitest";

import { scrollRestoreTarget } from "@/lib/scrollRestore";

describe("scrollRestoreTarget", () => {
  it("starts a page at the top when nothing was saved", () => {
    expect(scrollRestoreTarget(undefined, 400, 800, 0)).toBe(0);
  });

  it("waits until the list is tall enough to reach the saved position", () => {
    expect(scrollRestoreTarget(2400, 900, 800, 0)).toBeNull();
    expect(scrollRestoreTarget(2400, 4000, 800, 20)).toBe(2400);
  });

  it("uses the bottom of a shorter list after the content has had time to load", () => {
    expect(scrollRestoreTarget(2400, 1200, 800, 4000)).toBe(400);
  });
});
