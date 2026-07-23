import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Clock, Search, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CompanyDetailsDialog } from "@/components/CompanyDetailsDialog";
import { refreshAdminPendingCounts } from "@/lib/adminPendingCounts";
import { hasAdminAccess } from "@/lib/adminAccess";
import { getBusinessCategoryNames, matchesCategoryName } from "@/lib/businessCategories";
import { inviteManagerToBusiness, listBusinesses, listCategories, updateBusinessStatus, type Business } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { CategoryBadges } from "@/components/CategoryBadges";
import { toast } from "sonner";

type ActionType = "approve" | "deny";

type Company = {
  id: string;
  name: string;
  email: string;
  categoryNames: string[];
  status: "pending" | "active" | "inactive";
  description?: string;
  appliedAt?: string;
};

function mapBusinessStatusToBadge(status: unknown): Company["status"] {
  const normalized = typeof status === "string" ? status.toUpperCase() : "";
  if (normalized === "APPROVED") return "active";
  if (normalized === "REJECTED") return "inactive";
  return "pending";
}

export default function Pending() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<string[]>(["Alla"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [dialogState, setDialogState] = useState<{ company: Company; action: ActionType } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Company | null>(null);

  const load = useCallback(async () => {
    try {
      const [businessRows, categoryRows] = await Promise.all([
        listBusinesses("PENDING", true, undefined, "SELF_REGISTERED"),
        listCategories(),
      ]);

      setCompanies(
        businessRows.map((business) => ({
          id: business.id,
          name: business.name,
          email: business.contactEmail ?? "",
          categoryNames: getBusinessCategoryNames(business),
          status: mapBusinessStatusToBadge(business.status),
          description: business.description,
          appliedAt: business.createdAt || new Date().toISOString(),
        })),
      );
      setCategories(["Alla", ...categoryRows.map((row) => row.name)]);
    } catch {
      setCompanies([]);
      setCategories(["Alla"]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime((event) => {
    if (event.type === "business.updated") {
      void load();
      refreshAdminPendingCounts();
    }
  });

  const filtered = useMemo(() => companies.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q);
    const matchCategory = category === "Alla" || matchesCategoryName(c.categoryNames, category);
    return matchSearch && matchCategory;
  }), [companies, search, category]);

  const handleAction = async () => {
    if (!dialogState) return;
    const { company, action } = dialogState;

    try {
      const isAdmin = await hasAdminAccess();

      if (isAdmin) {
        await updateBusinessStatus(company.id, action === "approve" ? "APPROVED" : "REJECTED");
        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
        refreshAdminPendingCounts();
        toast.success(action === "approve" ? `${company.name} har godkänts!` : `${company.name} har nekats.`);
      } else {
        toast.error("Saknar admin-behörighet. Du kan inte uppdatera företagsstatus.");
        setDialogState(null);
        return;
      }

      if (action === "approve" && company.email.trim()) {
        const inviteResponse = await inviteManagerToBusiness(company.email, company.id);

        if (inviteResponse.emailSent) {
          toast.success(`Inbjudan skickad till ${company.email}`);
        } else {
          const errorMsg = inviteResponse.emailError || "Okänt fel";
          toast.warning(`Inbjudan skapades men kunde inte skicka e-post: ${errorMsg}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte uppdatera företagsstatus.";
      toast.error(message);
    }

    setDialogState(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Väntande företag</h1>
        <p className="text-muted-foreground mt-1">Granska företag som registrerat sig själva via portalen</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök företag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border text-foreground">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">{search || category !== "Alla" ? "Inga företag hittades" : "Inga väntande företag"}</p>
            <p className="text-sm">{search || category !== "Alla" ? "Försök ändra dina sökkriterier" : "Backend saknar lista för väntande företag just nu"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((company) => (
            <Card key={company.id} className="card-hover bg-card border-border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <CompanyAvatar name={company.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{company.name}</p>
                        <StatusBadge status={company.status} />
                        <CategoryBadges names={company.categoryNames} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{company.email}</p>
                      <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{company.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ansökte: {new Date(company.appliedAt!).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col sm:min-w-[110px]">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none bg-accent hover:bg-accent/90 text-accent-foreground"
                      onClick={() => setDetailTarget(company)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Visa detaljer
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => setDialogState({ company, action: "approve" })}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Godkänn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                      onClick={() => setDialogState({ company, action: "deny" })}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Neka
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CompanyDetailsDialog
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        companyId={detailTarget?.id ?? null}
        companyName={detailTarget?.name}
        category={detailTarget?.categoryNames[0]}
        initialBusiness={detailTarget as Business}
      />

      <ConfirmDialog
        open={!!dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
        title={dialogState?.action === "approve" ? "Godkänn företag" : "Neka företag"}
        description={
          dialogState?.action === "approve"
            ? `Är du säker på att du vill godkänna ${dialogState?.company.name}?`
            : `Är du säker på att du vill neka ${dialogState?.company.name}?`
        }
        confirmLabel={dialogState?.action === "approve" ? "Godkänn" : "Neka"}
        onConfirm={handleAction}
        variant={dialogState?.action === "deny" ? "destructive" : "default"}
      />
    </div>
  );
}
