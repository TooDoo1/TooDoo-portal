import { useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { pendingCompanies, type Company } from "@/data/dummy-data";
import { toast } from "sonner";

type ActionType = "approve" | "deny";

export default function Pending() {
  const [companies, setCompanies] = useState<Company[]>(pendingCompanies);
  const [dialogState, setDialogState] = useState<{ company: Company; action: ActionType } | null>(null);

  const handleAction = () => {
    if (!dialogState) return;
    const { company, action } = dialogState;
    setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    if (action === "approve") {
      toast.success(`${company.name} har godkänts!`);
    } else {
      toast.error(`${company.name} har nekats.`);
    }
    setDialogState(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Väntande företag</h1>
        <p className="text-muted-foreground mt-1">Granska och hantera företag som ansökt om att gå med</p>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Inga väntande företag</p>
            <p className="text-sm">Alla ansökningar har behandlats</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <Card key={company.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <CompanyAvatar name={company.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{company.name}</p>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{company.contactPerson} · {company.email}</p>
                      <p className="text-sm text-foreground/80 mt-2">{company.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">Ansökte: {new Date(company.appliedAt!).toLocaleDateString("sv-SE")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => setDialogState({ company, action: "approve" })}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Godkänn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
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
