import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Search, Filter, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CompanyDetailsDialog } from "@/components/CompanyDetailsDialog";
import { BusinessImportBadges } from "@/components/BusinessImportBadges";
import { refreshAdminPendingCounts } from "@/lib/adminPendingCounts";
import { hasAdminAccess } from "@/lib/adminAccess";
import { getBusinessCategoryNames, getPrimaryCategoryName, matchesCategoryName } from "@/lib/businessCategories";
import { listBusinesses, listCategories, updateBusinessStatus, type Business, type BusinessImportMetadata, type BusinessSource } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { CategoryBadges } from "@/components/CategoryBadges";
import { toast } from "sonner";

type ActionType = "approve" | "deny";

type ImportedCompany = {
  id: string;
  name: string;
  address: string;
  city: string;
  categoryNames: string[];
  category: string;
  orgNr?: string | null;
  cfarNr?: string | null;
  sniCode?: string | null;
  description?: string;
  source: BusinessSource;
  importMetadata?: BusinessImportMetadata | null;
  importedAt?: string;
};

export default function AdminImportedBusinesses() {
  const [companies, setCompanies] = useState<ImportedCompany[]>([]);
  const [categories, setCategories] = useState<string[]>(["Alla"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [dialogState, setDialogState] = useState<{ company: ImportedCompany; action: ActionType } | null>(null);
  const [detailTarget, setDetailTarget] = useState<ImportedCompany | null>(null);

  const load = useCallback(async () => {
    try {
      const [businessRows, categoryRows] = await Promise.all([
        listBusinesses("PENDING", true, undefined, "IMPORTED"),
        listCategories(),
      ]);

      setCompanies(
        businessRows.map((business) => ({
          id: business.id,
          name: business.name,
          address: business.address,
          city: business.city,
          categoryNames: getBusinessCategoryNames(business),
          category: getPrimaryCategoryName(business),
          orgNr: business.orgNr,
          cfarNr: business.cfarNr,
          sniCode: business.sniCode,
          description: business.description,
          source: business.source ?? "IMPORTED",
          importMetadata: business.importMetadata,
          importedAt: business.createdAt || new Date().toISOString(),
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

  const filtered = useMemo(
    () =>
      companies.filter((company) => {
        const haystack = [
          company.name,
          company.address,
          company.city,
          company.orgNr ?? "",
          company.cfarNr ?? "",
          company.sniCode ?? "",
        ]
          .join(" ")
          .toLowerCase();
        const matchSearch = haystack.includes(search.toLowerCase());
        const matchCategory = category === "Alla" || matchesCategoryName(company.categoryNames, category);
        return matchSearch && matchCategory;
      }),
    [companies, search, category],
  );

  const handleAction = async () => {
    if (!dialogState) return;
    const { company, action } = dialogState;

    try {
      const isAdmin = await hasAdminAccess();
      if (!isAdmin) {
        toast.error("Saknar admin-behörighet. Du kan inte uppdatera företagsstatus.");
        setDialogState(null);
        return;
      }

      await updateBusinessStatus(company.id, action === "approve" ? "APPROVED" : "REJECTED");
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      refreshAdminPendingCounts();

      if (action === "approve") {
        toast.success(`${company.name} är godkänt och synligt i appen.`);
      } else {
        toast.success(`${company.name} har nekats.`);
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
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Importerade företag</h1>
        <p className="text-muted-foreground mt-1">
          Företag hämtade från SCB. Godkänn för att visa dem i appen, eller neka om de inte hör hemma här.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök namn, ort, org.nr, CFAR..."
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
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Download className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">
              {search || category !== "Alla" ? "Inga importerade företag hittades" : "Inga väntande importer"}
            </p>
            <p className="text-sm text-center max-w-md">
              {search || category !== "Alla"
                ? "Försök ändra dina sökkriterier"
                : "Kör bulk-import i backend när du vill fylla på med SCB-data."}
            </p>
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
                        <StatusBadge status="pending" />
                        <CategoryBadges names={company.categoryNames} />
                        <BusinessImportBadges business={company} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {[company.address, company.city].filter(Boolean).join(", ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {company.orgNr ? <span>Org.nr: {company.orgNr}</span> : null}
                        {company.cfarNr ? <span>CFAR: {company.cfarNr}</span> : null}
                        {company.sniCode ? <span>SNI: {company.sniCode}</span> : null}
                      </div>
                      {company.description ? (
                        <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{company.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2">
                        Importerad: {new Date(company.importedAt!).toLocaleDateString("sv-SE")}
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
        category={detailTarget?.category}
        initialBusiness={detailTarget as Business}
      />

      <ConfirmDialog
        open={!!dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
        title={dialogState?.action === "approve" ? "Godkänn import" : "Neka import"}
        description={
          dialogState?.action === "approve"
            ? `Är du säker på att du vill godkänna ${dialogState?.company.name}? Företaget blir synligt i appen utan managerinbjudan.`
            : `Är du säker på att du vill neka ${dialogState?.company.name}?`
        }
        confirmLabel={dialogState?.action === "approve" ? "Godkänn" : "Neka"}
        onConfirm={handleAction}
        variant={dialogState?.action === "deny" ? "destructive" : "default"}
      />
    </div>
  );
}
