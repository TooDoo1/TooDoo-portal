import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listCategorySubcategories, type Subcategory } from "@/lib/api";
import type { CategorySelection } from "@/lib/businessCategories";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; name: string };

type CategoryRow = CategorySelection & { key: string };

type CategoryRowPickerProps = {
  options: CategoryOption[];
  value: CategorySelection[];
  onChange: (value: CategorySelection[]) => void;
  disabled?: boolean;
  loadSubcategories?: (categoryId: string) => Promise<Subcategory[]>;
};

function newRowKey() {
  return crypto.randomUUID();
}

function filledRows(rows: CategoryRow[]): CategorySelection[] {
  return rows
    .filter((row) => row.categoryId)
    .map((row) => ({ categoryId: row.categoryId, subcategoryIds: row.subcategoryIds }));
}

function rowsFromValue(value: CategorySelection[]): CategoryRow[] {
  return [
    ...value.map((row) => ({ ...row, key: newRowKey() })),
    { key: newRowKey(), categoryId: "", subcategoryIds: [] },
  ];
}

function sameSelection(left: CategorySelection[], right: CategorySelection[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function CategoryRowPicker({
  options,
  value,
  onChange,
  disabled = false,
  loadSubcategories = listCategorySubcategories,
}: CategoryRowPickerProps) {
  const [rows, setRows] = useState<CategoryRow[]>(() => rowsFromValue(value));
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>({});
  const subcategoryCache = useRef(new Map<string, Subcategory[]>());

  useEffect(() => {
    let cancelled = false;
    for (const row of value) {
      if (!row.categoryId || subcategoryCache.current.has(row.categoryId)) {
        const cached = subcategoryCache.current.get(row.categoryId);
        if (cached) {
          setSubcategoryNames((current) => ({
            ...current,
            ...Object.fromEntries(cached.map((child) => [child.id, child.name])),
          }));
        }
        continue;
      }
      void loadSubcategories(row.categoryId).then((loaded) => {
        if (cancelled) return;
        subcategoryCache.current.set(row.categoryId, loaded);
        setSubcategoryNames((current) => ({
          ...current,
          ...Object.fromEntries(loaded.map((child) => [child.id, child.name])),
        }));
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [value, loadSubcategories]);

  useEffect(() => {
    setRows((current) => {
      if (sameSelection(filledRows(current), value)) return current;
      return rowsFromValue(value);
    });
  }, [value]);

  const publish = (nextRows: CategoryRow[]) => {
    const withBlank = nextRows.some((row) => !row.categoryId)
      ? nextRows
      : [...nextRows, { key: newRowKey(), categoryId: "", subcategoryIds: [] }];
    setRows(withBlank);
    const nextValue = filledRows(withBlank);
    if (!sameSelection(nextValue, value)) onChange(nextValue);
  };

  const updateRow = (key: string, next: Partial<CategorySelection>) => {
    publish(rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  };

  const removeRow = (key: string) => {
    publish(rows.filter((row) => row.key !== key));
  };

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <CategoryRowField
          key={row.key}
          row={row}
          options={options}
          takenCategoryIds={rows.map((entry) => entry.categoryId).filter((id) => id && id !== row.categoryId)}
          disabled={disabled}
          cache={subcategoryCache.current}
          subcategoryNames={subcategoryNames}
          loadSubcategories={loadSubcategories}
          onChange={(next) => updateRow(row.key, next)}
          onRemove={() => removeRow(row.key)}
        />
      ))}
      <p className="text-xs text-muted-foreground">Välj en kategori per rad. Underkategorier är valfria.</p>
    </div>
  );
}

function CategoryRowField({
  row,
  options,
  takenCategoryIds,
  disabled,
  cache,
  subcategoryNames,
  loadSubcategories,
  onChange,
  onRemove,
}: {
  row: CategoryRow;
  options: CategoryOption[];
  takenCategoryIds: string[];
  disabled: boolean;
  cache: Map<string, Subcategory[]>;
  subcategoryNames: Record<string, string>;
  loadSubcategories: (categoryId: string) => Promise<Subcategory[]>;
  onChange: (next: Partial<CategorySelection>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"parents" | "children">("parents");
  const [query, setQuery] = useState("");
  const [children, setChildren] = useState<Subcategory[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const parent = options.find((option) => option.id === row.categoryId);
  const childLabel = row.subcategoryIds
    .map((id) => subcategoryNames[id] ?? children.find((child) => child.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");

  const showChildren = async (categoryId: string) => {
    setView("children");
    setQuery("");
    const cached = cache.get(categoryId);
    if (cached) {
      setChildren(cached);
      return;
    }
    setLoadingChildren(true);
    setChildren([]);
    try {
      const loaded = await loadSubcategories(categoryId);
      cache.set(categoryId, loaded);
      setChildren(loaded);
    } catch {
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  const visibleParents = options.filter((option) => {
    if (takenCategoryIds.includes(option.id)) return false;
    return option.name.toLocaleLowerCase("sv-SE").includes(query.trim().toLocaleLowerCase("sv-SE"));
  });
  const visibleChildren = children.filter((child) =>
    child.name.toLocaleLowerCase("sv-SE").includes(query.trim().toLocaleLowerCase("sv-SE")),
  );

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setQuery("");
            if (row.categoryId) void showChildren(row.categoryId);
            else setView("parents");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-background px-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {parent ? (
              <span className="min-w-0 truncate">
                <span>{parent.name}</span>
                {childLabel ? <span className="text-muted-foreground"> · {childLabel}</span> : null}
              </span>
            ) : (
              <span className="text-muted-foreground">Välj kategori</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] overflow-hidden border-border bg-popover p-0" align="start">
          <div className="overflow-hidden">
            <div
              data-testid="category-slide-track"
              className={cn(
                "flex w-[200%] transition-transform duration-200 ease-out",
                view === "children" ? "-translate-x-1/2" : "translate-x-0",
              )}
            >
              <div className="w-1/2">
                <input
                  value={view === "parents" ? query : ""}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Sök kategori..."
                  className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none"
                />
                <div className="max-h-64 overflow-y-auto p-1">
                  {visibleParents.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">Inga kategorier hittades.</p>
                  ) : (
                    visibleParents.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-accent/15"
                        onClick={() => {
                          const sameParent = option.id === row.categoryId;
                          onChange({
                            categoryId: option.id,
                            subcategoryIds: sameParent ? row.subcategoryIds : [],
                          });
                          void showChildren(option.id);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", option.id === row.categoryId ? "opacity-100" : "opacity-0")} />
                        <span className="min-w-0 flex-1 truncate">{option.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="w-1/2">
                <button
                  type="button"
                  className="flex h-10 w-full items-center gap-2 border-b border-border px-3 text-left text-sm font-medium"
                  onClick={() => {
                    setView("parents");
                    setQuery("");
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="truncate">{parent?.name ?? "Underkategorier"}</span>
                </button>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Sök underkategori..."
                  className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none"
                />
                <div className="max-h-64 overflow-y-auto p-1">
                  {loadingChildren ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">Laddar underkategorier...</p>
                  ) : visibleChildren.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">Inga underkategorier.</p>
                  ) : (
                    visibleChildren.map((child) => {
                      const selected = row.subcategoryIds.includes(child.id);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-accent/15"
                          onClick={() => {
                            onChange({
                              subcategoryIds: selected
                                ? row.subcategoryIds.filter((id) => id !== child.id)
                                : [...row.subcategoryIds, child.id],
                            });
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">{child.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {row.categoryId ? (
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent/10 hover:text-foreground"
          aria-label={`Ta bort ${parent?.name ?? "kategori"}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
