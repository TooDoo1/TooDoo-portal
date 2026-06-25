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

export function getPrimaryCategoryName(business: Business): string {
  return business.categoryName ?? business.category?.name ?? business.categories?.[0]?.name ?? "Okategoriserad";
}

export function formatCategoryNames(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  return unique.join(", ");
}
