import { describe, expect, it } from "vitest";

import type { Business } from "@/lib/api";
import {
  getBusinessCategorySelections,
  getBusinessDisplayCategoryNames,
  getBusinessSubcategoryIds,
  matchesAnySubcategory,
} from "@/lib/businessCategories";

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

describe("getBusinessCategorySelections", () => {
  it("keeps each parent with its own subcategories", () => {
    expect(
      getBusinessCategorySelections(
        business([
          { id: "c1", name: "Mat", subcategories: [{ id: "s1", name: "Pizza" }] },
          { id: "c2", name: "Shopping", subcategories: [] },
        ]),
      ),
    ).toEqual([
      { categoryId: "c1", subcategoryIds: ["s1"] },
      { categoryId: "c2", subcategoryIds: [] },
    ]);
  });
});

describe("matchesAnySubcategory", () => {
  const cafeAndBurger = business([
    {
      id: "c1",
      name: "Mat",
      subcategories: [
        { id: "cafe", name: "Café" },
        { id: "burger", name: "Hamburgare" },
      ],
    },
  ]);

  it("collects the subcategory ids on a business", () => {
    expect(getBusinessSubcategoryIds(cafeAndBurger)).toEqual(["cafe", "burger"]);
  });

  it("matches when any selected subcategory is on the business", () => {
    const ids = getBusinessSubcategoryIds(cafeAndBurger);
    expect(matchesAnySubcategory(ids, [])).toBe(true);
    expect(matchesAnySubcategory(ids, ["cafe"])).toBe(true);
    expect(matchesAnySubcategory(ids, ["cafe", "pizza"])).toBe(true);
    expect(matchesAnySubcategory(ids, ["pizza"])).toBe(false);
  });
});
