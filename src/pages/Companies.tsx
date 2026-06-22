import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Eye, Trash2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { CategoryBadges } from "@/components/CategoryBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CompanyDetailsDialog } from "@/components/CompanyDetailsDialog";
import { inviteManagerToBusiness, listBusinesses, listCategories } from "@/lib/api";
import { hasAdminAccess } from "@/lib/adminAccess";
import { getBusinessCategoryNames, getPrimaryCategoryName } from "@/lib/businessCategories";
import { toast } from "sonner";

type Company = {
  id: string;
  name: string;
  email: string;
  logo?: string;
  status: "active";
  joinedAt: string;
  category: string;
  categoryNames: string[];
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<string[]>(["Alla"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [detailTarget, setDetailTarget] = useState<Company | null>(null);
  const [invitingCompanyId, setInvitingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [businessRows, categoryRows] = await Promise.all([
          listBusinesses("APPROVED"),
          listCategories(),
        ]);

        setCompanies(
          businessRows.map((business) => ({
            id: business.id,
            name: business.name,
            email: business.contactEmail,
            status: "active",
            joinedAt: business.createdAt || new Date().toISOString(),
            categoryNames: getBusinessCategoryNames(business),
            category: getPrimaryCategoryName(business),
          })),
        );
        setCategories(["Alla", ...categoryRows.map((row) => row.name)]);
      } catch {
        setCompanies([]);
        setCategories(["Alla"]);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Alla" || c.categoryNames.includes(category);
    return matchSearch && matchCategory;
  }), [companies, search, category]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success(`${deleteTarget.name} har inaktiverats`);
    setDeleteTarget(null);
  };

  const handleInviteManager = async (company: Company) => {
    if (!company.email.trim()) {
      toast.error("Företaget saknar kontakt-e-post.");
      return;
    }

    try {
      const isAdmin = await hasAdminAccess();
      if (!isAdmin) {
        toast.error("Saknar admin-behörighet.");
        return;
      }

      setInvitingCompanyId(company.id);
      const inviteResponse = await inviteManagerToBusiness(company.email, company.id);

      if (inviteResponse.emailSent) {
        toast.success(`Inbjudan skickad till ${company.email}`);
      } else {
        const errorMsg = inviteResponse.emailError || "Okänt fel";
        toast.warning(`Inbjudan skapades men kunde inte skicka e-post: ${errorMsg}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skicka inbjudan.";
      toast.error(message);
    } finally {
      setInvitingCompanyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Företag</h1>
        <p className="text-muted-foreground mt-1">Hantera alla aktiva företag i systemet</p>
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
            <EmptyIcon className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Inga företag hittades</p>
            <p className="text-sm">Försök ändra dina sökkriterier</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company) => (
            <Card key={company.id} className="card-hover bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CompanyAvatar name={company.name} logo={company.logo} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate" title={company.name}>{company.name}</p>
                      <p className="text-sm text-muted-foreground truncate" title={company.email}>{company.email}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={company.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                  <span>Gick med: {new Date(company.joinedAt).toLocaleDateString("sv-SE")}</span>
                  <CategoryBadges names={company.categoryNames} linkToCategory />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => setDetailTarget(company)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Visa detaljer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    disabled={invitingCompanyId === company.id}
                    onClick={() => void handleInviteManager(company)}
                    title="Skicka managerinbjudan"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                    onClick={() => setDeleteTarget(company)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Inaktivera företag"
        description={`Är du säker på att du vill inaktivera ${deleteTarget?.name}?`}
        confirmLabel="Inaktivera"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

function EmptyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  );
}
