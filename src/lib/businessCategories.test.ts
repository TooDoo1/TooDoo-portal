import { describe, expect, it } from "vitest";

import type { Business } from "@/lib/api";
import { getBusinessDisplayCategoryNames } from "@/lib/businessCategories";

function business(categories: Business["categories"], categoryName = "Mat"): Business {
  return {
    id: "b1",
    name: "Test",
    description: "",
    contactEmail: null,
    contactPhone: null,
    address: "",
    city: "",
    categoryId: "c1",
    categoryName,
    category: { id: "c1", name: categoryName },
    categories,
  };
}

describe("getBusinessDisplayCategoryNames", () => {
  it("shows subcategory names when a parent has them", () => {
    expect(
      getBusinessDisplayCategoryNames(
        business([
          {
            id: "c1",
            name: "Mat",
            subcategories: [
              { id: "s1", name: "Pizza" },
              { id: "s2", name: "Café & fika" },
            ],
          },
        ]),
      ),
    ).toEqual(["Pizza", "Café & fika"]);
  });

  it("keeps a parent that has no subcategory beside parents that do", () => {
    expect(
      getBusinessDisplayCategoryNames(
        business([
          { id: "c1", name: "Mat", subcategories: [{ id: "s1", name: "Pizza" }] },
          { id: "c2", name: "Familj", subcategories: [] },
        ]),
      ),
    ).toEqual(["Pizza", "Familj"]);
  });

  it("falls back to the basic categories when there is no subcategory", () => {
    expect(
      getBusinessDisplayCategoryNames(
        business([
          { id: "c1", name: "Mat", subcategories: [] },
          { id: "c2", name: "Shopping" },
        ]),
      ),
    ).toEqual(["Mat", "Shopping"]);
  });
});
