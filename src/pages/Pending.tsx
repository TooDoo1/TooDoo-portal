import { useEffect, useMemo, useState } from "react";
import { Check, X, Clock, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { refreshAdminPendingCounts } from "@/lib/adminPendingCounts";
import { getAuthEmail, getAuthRole, getUserByEmail, inviteManagerToBusiness, listBusinesses, listCategories, updateBusinessStatus } from "@/lib/api";
import { toast } from "sonner";

type ActionType = "approve" | "deny";

type Company = {
  id: string;
  name: string;
  email: string;
  category: string;
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

async function hasAdminAccess() {
  const storedRole = getAuthRole();
  if (typeof storedRole === "string" && storedRole.toLowerCase() === "admin") {
    return true;
  }

  const email = getAuthEmail();
  if (!email) {
    return false;
  }

  try {
    const user = await getUserByEmail(email);
    return typeof user.role === "string" && user.role.toLowerCase() === "admin";
  } catch {
    return false;
  }
}

export default function Pending() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<string[]>(["Alla"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [dialogState, setDialogState] = useState<{ company: Company; action: ActionType } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [businessRows, categoryRows] = await Promise.all([listBusinesses(), listCategories()]);

        const pendingRows = businessRows.filter((business) => mapBusinessStatusToBadge(business.status) === "pending");

        setCompanies(
          pendingRows.map((business) => ({
            id: business.id,
            name: business.name,
            email: business.contactEmail,
            category: String(business.categoryName ?? "Okategoriserad"),
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
    };

    void load();
  }, []);

  const filtered = useMemo(() => companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Alla" || c.category === category;
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

      if (action === "approve") {
        // Send invite via the seamless invite endpoint
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
        <p className="text-muted-foreground mt-1">Granska och hantera företag som ansökt om att gå med</p>
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
                        <span className="text-xs bg-accent/15 text-accent px-2.5 py-0.5 rounded-full font-medium">
                          {company.category}
                        </span>
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
