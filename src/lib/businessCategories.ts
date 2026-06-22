import type { Business } from "@/lib/api";

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
  const names = new Set<string>();
  const primary = business.categoryName ?? business.category?.name;
  if (primary) names.add(primary);
  for (const category of business.categories ?? []) {
    if (category.name) names.add(category.name);
  }
  return [...names];
}

export function businessMatchesCategoryName(business: Business, categoryName: string): boolean {
  return getBusinessCategoryNames(business).includes(categoryName);
}

export function getPrimaryCategoryName(business: Business): string {
  return business.categoryName ?? business.category?.name ?? business.categories?.[0]?.name ?? "Okategoriserad";
}

export function formatCategoryNames(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  return unique.join(", ");
}
