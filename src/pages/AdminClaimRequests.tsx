import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { refreshAdminPendingCounts } from "@/lib/adminPendingCounts";
import { hasAdminAccess } from "@/lib/adminAccess";
import { listBusinessClaimRequests, reviewBusinessClaimRequest, type BusinessClaimRequest } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "sonner";

type ReviewAction = "approve" | "reject";

export default function AdminClaimRequests() {
  const [requests, setRequests] = useState<BusinessClaimRequest[]>([]);
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<{ request: BusinessClaimRequest; action: ReviewAction } | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listBusinessClaimRequests("PENDING");
      setRequests(rows);
    } catch {
      setRequests([]);
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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return requests;
    return requests.filter((request) => {
      const haystack = [
        request.businessName,
        request.businessCity,
        request.applicantEmail,
        request.cfarNr,
        request.orgNr,
        request.proposedContactPhone,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [requests, search]);

  const handleReview = async () => {
    if (!dialogState) return;

    try {
      const isAdmin = await hasAdminAccess();
      if (!isAdmin) {
        toast.error("Saknar admin-behörighet.");
        setDialogState(null);
        return;
      }

      await reviewBusinessClaimRequest(dialogState.request.id, {
        status: dialogState.action === "approve" ? "APPROVED" : "REJECTED",
      });

      setRequests((prev) => prev.filter((row) => row.id !== dialogState.request.id));
      toast.success(
        dialogState.action === "approve"
          ? "Ägarskapsansökan godkänd och managerinbjudan skickad."
          : "Ägarskapsansökan avvisad.",
      );
      refreshAdminPendingCounts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte uppdatera ansökan.";
      toast.error(message);
    } finally {
      setDialogState(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Ägarskapsansökningar</h1>
        <p className="text-muted-foreground mt-1">
          Granska ansökningar från företag som vill ta över importerade profiler
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök företag, e-post, CFAR eller org.nr..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Inga väntande ansökningar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((request) => (
            <Card key={request.id} className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{request.proposedName ?? request.businessName}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.businessCity} · CFAR {request.cfarNr} · Org.nr {request.orgNr}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                    Väntar
                  </Badge>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p>
                    Sökande: <span className="text-foreground">{request.applicantEmail}</span>
                  </p>
                  <p>
                    Kontakt: <span className="text-foreground">{request.proposedContactPhone}</span>
                  </p>
                  <p className="md:col-span-2">
                    Adress:{" "}
                    <span className="text-foreground">
                      {[request.proposedAddress ?? "", request.proposedCity ?? request.businessCity]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                  {request.proposedDescription ? (
                    <p className="md:col-span-2">
                      Beskrivning: <span className="text-foreground">{request.proposedDescription}</span>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => setDialogState({ request, action: "approve" })}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Godkänn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    onClick={() => setDialogState({ request, action: "reject" })}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Avvisa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={dialogState != null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        title={dialogState?.action === "approve" ? "Godkänn ägarskapsansökan?" : "Avvisa ägarskapsansökan?"}
        description={
          dialogState?.action === "approve"
            ? `Detta markerar företaget som ägt och skickar en managerinbjudan till ${dialogState.request.applicantEmail}.`
            : `Detta avvisar ansökan från ${dialogState?.request.applicantEmail ?? "sökanden"}.`
        }
        confirmLabel={dialogState?.action === "approve" ? "Godkänn" : "Avvisa"}
        onConfirm={handleReview}
      />
    </div>
  );
}
