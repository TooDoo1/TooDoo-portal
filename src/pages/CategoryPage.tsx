import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Trash2, Mail, Calendar, Tag, User, Building2, Eye, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { activeCompanies, pendingCompanies, type Company } from "@/data/dummy-data";
import { toast } from "sonner";

type DialogAction = { company: Company; action: "approve" | "remove" };

export default function CategoryPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(name || "");

  const [active, setActive] = useState<Company[]>(
    activeCompanies.filter((c) => c.category === categoryName)
  );
  const [pending, setPending] = useState<Company[]>(
    pendingCompanies.filter((c) => c.category === categoryName)
  );
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<DialogAction | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const filteredActive = active.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
  const filteredPending = pending.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const handleAction = () => {
    if (!dialogState) return;
    const { company, action } = dialogState;

    if (action === "approve") {
      setPending((prev) => prev.filter((c) => c.id !== company.id));
      setActive((prev) => [...prev, { ...company, status: "active", joinedAt: new Date().toISOString().split("T")[0] }]);
      toast.success(`${company.name} har godkänts och flyttats till aktiva!`);
    } else {
      setActive((prev) => prev.filter((c) => c.id !== company.id));
      setPending((prev) => prev.filter((c) => c.id !== company.id));
      toast.success(`${company.name} har tagits bort.`);
    }
    setDialogState(null);
    if (selectedCompany?.id === company.id) setSelectedCompany(null);
  };

  const allCompanies = [...active, ...pending];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{categoryName}</h1>
            <span className="text-xs bg-accent/15 text-accent px-2.5 py-1 rounded-full font-medium">
              {allCompanies.length} företag
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5">Alla företag inom kategorin {categoryName}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök företag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Active */}
          {filteredActive.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aktiva företag ({filteredActive.length})</h2>
              <div className="space-y-3">
                {filteredActive.map((company) => (
                  <Card
                    key={company.id}
                    className={`card-hover bg-card border-border cursor-pointer transition-all ${selectedCompany?.id === company.id ? "ring-2 ring-accent border-accent/50" : ""}`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={company.name} logo={company.logo} />
                          <div>
                            <p className="font-semibold text-foreground">{company.name}</p>
                            <p className="text-sm text-muted-foreground">{company.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status="active" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                            onClick={(e) => { e.stopPropagation(); setDialogState({ company, action: "remove" }); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {filteredPending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Väntande ({filteredPending.length})</h2>
              <div className="space-y-3">
                {filteredPending.map((company) => (
                  <Card
                    key={company.id}
                    className={`card-hover bg-card border-border cursor-pointer transition-all ${selectedCompany?.id === company.id ? "ring-2 ring-accent border-accent/50" : ""}`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={company.name} />
                          <div>
                            <p className="font-semibold text-foreground">{company.name}</p>
                            <p className="text-sm text-muted-foreground">{company.contactPerson} · {company.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status="pending" />
                          <Button
                            size="sm"
                            className="h-8 bg-success hover:bg-success/90 text-success-foreground"
                            onClick={(e) => { e.stopPropagation(); setDialogState({ company, action: "approve" }); }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                            onClick={(e) => { e.stopPropagation(); setDialogState({ company, action: "remove" }); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredActive.length === 0 && filteredPending.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">{search ? "Inga företag hittades" : "Inga företag i denna kategori"}</p>
                {search ? (
                  <p className="text-sm mt-2">Försök ändra dina sökkriterier</p>
                ) : (
                  <Button variant="outline" className="mt-4 border-border" onClick={() => navigate("/companies")}>
                    Tillbaka till alla företag
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          {selectedCompany ? (
            <Card className="bg-card border-border sticky top-20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={selectedCompany.name} logo={selectedCompany.logo} />
                  <div>
                    <p className="font-bold text-foreground text-lg">{selectedCompany.name}</p>
                    <StatusBadge status={selectedCompany.status} />
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-foreground/80">{selectedCompany.email}</span>
                  </div>
                  {selectedCompany.contactPerson && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-foreground/80">{selectedCompany.contactPerson}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span className="text-foreground/80">{selectedCompany.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-foreground/80">
                      {selectedCompany.status === "pending"
                        ? `Ansökte: ${new Date(selectedCompany.appliedAt!).toLocaleDateString("sv-SE")}`
                        : `Gick med: ${new Date(selectedCompany.joinedAt).toLocaleDateString("sv-SE")}`}
                    </span>
                  </div>
                </div>

                {selectedCompany.description && (
                  <>
                    <Separator className="bg-border/50" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Beskrivning</p>
                      <p className="text-sm text-foreground/70 leading-relaxed">{selectedCompany.description}</p>
                    </div>
                  </>
                )}

                <Separator className="bg-border/50" />

                <div className="flex flex-col gap-2">
                  {selectedCompany.status === "pending" && (
                    <Button
                      className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => setDialogState({ company: selectedCompany, action: "approve" })}
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Godkänn företag
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                    onClick={() => setDialogState({ company: selectedCompany, action: "remove" })}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Ta bort företag
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Eye className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">Välj ett företag</p>
                <p className="text-xs mt-1">Klicka på ett företag för att se detaljer</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
        title={dialogState?.action === "approve" ? "Godkänn företag" : "Ta bort företag"}
        description={
          dialogState?.action === "approve"
            ? `Är du säker på att du vill godkänna ${dialogState?.company.name}?`
            : `Är du säker på att du vill ta bort ${dialogState?.company.name}?`
        }
        confirmLabel={dialogState?.action === "approve" ? "Godkänn" : "Ta bort"}
        onConfirm={handleAction}
        variant={dialogState?.action === "remove" ? "destructive" : "default"}
      />
    </div>
  );
}
