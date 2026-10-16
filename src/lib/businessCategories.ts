import type { Business } from "@/lib/api";

function normalizeCategoryName(value: string): string {
  return value.trim().toLocaleLowerCase("sv-SE");
}

export function matchesCategoryName(names: string[], categoryName: string): boolean {
  const needle = normalizeCategoryName(categoryName);
  if (!needle) {
    return false;
  }
  return names.some((name) => normalizeCategoryName(name) === needle);
}

export function getBusinessCategoryIds(business: Business): string[] {
  const ids = new Set<string>();
  if (business.categoryId) {
    ids.add(business.categoryId);
  }
  for (const category of business.categories ?? []) {
    if (category.id) {
      ids.add(category.id);
    }
  }
  return [...ids];
}

export function getBusinessCategoryNames(business: Business): string[] {
  if (business.categoryNames && business.categoryNames.length > 0) {
    return [...new Set(business.categoryNames.map((name) => name.trim()).filter(Boolean))];
  }

  const names = new Set<string>();
  const primary = business.categoryName ?? business.category?.name;
  if (primary?.trim()) {
    names.add(primary.trim());
  }
  for (const category of business.categories ?? []) {
    if (category.name?.trim()) {
      names.add(category.name.trim());
    }
  }
  return [...names];
}

export function businessMatchesCategoryName(business: Business, categoryName: string): boolean {
  return matchesCategoryName(getBusinessCategoryNames(business), categoryName);
}

function addUniqueName(names: string[], seen: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const key = normalizeCategoryName(trimmed);
  if (seen.has(key)) return;
  seen.add(key);
  names.push(trimmed);
}

/** Subcategory labels when a business has them, otherwise the parent categories. */
export function getBusinessDisplayCategoryNames(business: Business): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const categories = business.categories ?? [];

  if (categories.length > 0) {
    for (const category of categories) {
      const children = (category.subcategories ?? [])
        .map((subcategory) => subcategory.name?.trim())
        .filter((name): name is string => Boolean(name));
      if (children.length > 0) {
        for (const child of children) addUniqueName(names, seen, child);
      } else {
        addUniqueName(names, seen, category.name);
      }
    }
    if (names.length > 0) return names;
  }

  return getBusinessCategoryNames(business);
}

export function getPrimaryCategoryName(business: Business): string {
  return business.categoryName ?? business.category?.name ?? business.categories?.[0]?.name ?? "Okategoriserad";
}

export function formatCategoryNames(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  return unique.join(", ");
}
