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

export function getBusinessSubcategoryIds(business: Business): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const category of business.categories ?? []) {
    for (const subcategory of category.subcategories ?? []) {
      const id = subcategory.id?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Empty selection matches every business. Any selected subcategory is enough. */
export function matchesAnySubcategory(ids: string[], selectedIds: string[]): boolean {
  if (selectedIds.length === 0) return true;
  const owned = new Set(ids);
  return selectedIds.some((id) => owned.has(id));
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

export type CategorySelection = {
  categoryId: string;
  subcategoryIds: string[];
};

export function getBusinessCategorySelections(business: Business): CategorySelection[] {
  const categories = business.categories ?? [];
  const rows = categories
    .filter((category): category is typeof category & { id: string } => Boolean(category.id))
    .map((category) => ({
      categoryId: category.id,
      subcategoryIds: (category.subcategories ?? [])
        .map((subcategory) => subcategory.id)
        .filter((id): id is string => Boolean(id)),
    }));
  if (rows.length > 0) return rows;
  if (business.categoryId) return [{ categoryId: business.categoryId, subcategoryIds: [] }];
  return [];
}

export function formatCategoryNames(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  return unique.join(", ");
}
