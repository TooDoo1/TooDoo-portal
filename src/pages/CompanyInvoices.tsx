import { useEffect, useMemo, useState } from "react";
import { ReceiptText, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listInvoices, type Invoice, type InvoicePaymentStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

function getInvoiceStatusBadge(status: InvoicePaymentStatus | undefined) {
  if (status === "PAID") return "bg-success/15 text-success";
  if (status === "OVERDUE" || status === "LATE") return "bg-destructive/15 text-destructive";
  return "bg-warning/15 text-warning";
}

export default function CompanyInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await listInvoices();
      const items = Array.isArray(res)
        ? res
        : Array.isArray((res as { invoices?: Invoice[] }).invoices)
          ? (res as { invoices: Invoice[] }).invoices
          : [];
      setInvoices(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte hämta fakturor.";
      toast.error(message);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((i) => i.paymentStatus !== "PAID")
      .reduce((sum, i) => sum + Number(i.totalPrice ?? 0), 0);
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Fakturor</h1>
        <p className="text-muted-foreground mt-1">Se och ladda ner dina fakturor</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            Fakturahistorik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">Utestående</div>
                <div className="text-sm font-semibold text-foreground">
                  {Math.round(totalOutstanding).toLocaleString("sv-SE")} kr
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {invoices.length} {invoices.length === 1 ? "faktura" : "fakturor"} totalt
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">Laddar fakturor…</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">
                Inga fakturor att visa ännu. När ni börjar få debiteringar kommer de dyka upp här.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices
                .slice()
                .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
                .map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">Faktura #{invoice.id}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Skapad:{" "}
                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("sv-SE") : "-"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {Number(invoice.totalPrice ?? 0).toLocaleString("sv-SE")} kr
                        </div>
                        <Badge className={`${getInvoiceStatusBadge(invoice.paymentStatus)} mt-1`}>
                          {invoice.paymentStatus ?? "PENDING"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              className="border-border"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Uppdatera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

