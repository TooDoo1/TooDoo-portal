import { useEffect, useState } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  listCategories,
  listCategorySubcategories,
  type Category,
  type Subcategory,
} from "@/lib/api";

type DeleteTarget = { id: string; name: string; kind: "category" | "subcategory" };

function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("still has subcategories")) return "Ta bort underkategorierna först.";
  if (message.includes("still used by businesses")) return "Kategorin används av företag och kan inte tas bort.";
  if (message.includes("already exists")) return "Namnet finns redan.";
  if (message.includes("not found")) return "Kategorin hittades inte.";
  if (message.includes("invalid")) return "Namnet kan inte användas.";
  return fallback;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<string, Subcategory[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await listCategories();
        if (cancelled) return;
        setCategories(rows);
        setSelectedId((current) => current ?? rows[0]?.id ?? null);
        const grouped = await Promise.all(
          rows.map(async (row) => {
            try {
              const children = await listCategorySubcategories(row.id);
              return [row.id, children] as const;
            } catch {
              return [row.id, []] as const;
            }
          }),
        );
        if (!cancelled) setChildrenByParent(Object.fromEntries(grouped));
      } catch (error) {
        if (!cancelled) {
          toast.error(errorMessage(error, "Kunde inte ladda kategorier."));
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = categories.find((category) => category.id === selectedId) ?? null;
  const subcategories = selected ? (childrenByParent[selected.id] ?? []) : [];

  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const created = await createCategory({ name });
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, "sv")));
      setChildrenByParent((current) => ({ ...current, [created.id]: [] }));
      setSelectedId(created.id);
      setCategoryName("");
      toast.success(`${created.name} har skapats`);
    } catch (error) {
      toast.error(errorMessage(error, "Kunde inte skapa kategorin."));
    } finally {
      setSavingCategory(false);
    }
  };

  const addSubcategory = async () => {
    if (!selected) return;
    const name = subcategoryName.trim();
    if (!name) return;
    setSavingSubcategory(true);
    try {
      const created = await createSubcategory(selected.id, name);
      setChildrenByParent((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), created].sort((a, b) =>
          a.name.localeCompare(b.name, "sv"),
        ),
      }));
      setSubcategoryName("");
      toast.success(`${created.name} har skapats`);
    } catch (error) {
      toast.error(errorMessage(error, "Kunde inte skapa underkategorin."));
    } finally {
      setSavingSubcategory(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      if (deleteTarget.kind === "category") {
        const remaining = categories.filter((category) => category.id !== deleteTarget.id);
        setCategories(remaining);
        setChildrenByParent((current) => {
          const next = { ...current };
          delete next[deleteTarget.id];
          return next;
        });
        setSelectedId((current) => (current === deleteTarget.id ? (remaining[0]?.id ?? null) : current));
      } else if (selected) {
        setChildrenByParent((current) => ({
          ...current,
          [selected.id]: (current[selected.id] ?? []).filter((child) => child.id !== deleteTarget.id),
        }));
      }
      toast.success(`${deleteTarget.name} har tagits bort`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Kunde inte ta bort."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kategorier</h1>
        <p className="mt-1 text-muted-foreground">Skapa och ta bort kategorier och underkategorier</p>
      </div>

      {loading ? (
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="h-24 animate-pulse rounded-md bg-muted/60" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 p-5">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addCategory();
                }}
              >
                <Input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Ny kategori"
                  aria-label="Ny kategori"
                  className="border-border bg-background text-foreground"
                />
                <Button type="submit" disabled={savingCategory || !categoryName.trim()} className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Lägg till
                </Button>
              </form>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga kategorier ännu.</p>
              ) : (
                <ul className="space-y-1">
                  {categories.map((category) => {
                    const active = category.id === selectedId;
                    return (
                      <li key={category.id}>
                        <div
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${active ? "bg-accent/15" : "hover:bg-secondary/60"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(category.id)}
                            className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
                          >
                            {category.name}
                          </button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Ta bort ${category.name}`}
                            onClick={() => setDeleteTarget({ id: category.id, name: category.name, kind: "category" })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="space-y-4 p-5">
              {selected ? (
                <>
                  <div className="flex items-center gap-2 text-foreground">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold">{selected.name}</h2>
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addSubcategory();
                    }}
                  >
                    <Input
                      value={subcategoryName}
                      onChange={(event) => setSubcategoryName(event.target.value)}
                      placeholder="Ny underkategori"
                      aria-label="Ny underkategori"
                      className="border-border bg-background text-foreground"
                    />
                    <Button
                      type="submit"
                      disabled={savingSubcategory || !subcategoryName.trim()}
                      className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Lägg till
                    </Button>
                  </form>
                  {subcategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Inga underkategorier ännu.</p>
                  ) : (
                    <ul className="space-y-1">
                      {subcategories.map((subcategory) => (
                        <li key={subcategory.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{subcategory.name}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Ta bort ${subcategory.name}`}
                            onClick={() =>
                              setDeleteTarget({ id: subcategory.id, name: subcategory.name, kind: "subcategory" })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Välj eller skapa en kategori.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title={`Ta bort ${deleteTarget?.name ?? ""}?`}
        description={
          deleteTarget?.kind === "category"
            ? "Underkategorier måste tas bort först. En kategori som fortfarande är primär för ett företag kan inte tas bort."
            : "Företag som är märkta med underkategorin behåller sin kategori, men tappar den här märkningen."
        }
        confirmLabel={deleting ? "Tar bort..." : "Ta bort"}
        onConfirm={() => void confirmDelete()}
        variant="destructive"
      />
    </div>
  );
}
