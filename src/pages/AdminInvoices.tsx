import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ReceiptText, Search, Save, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getInvoiceDefaultPercentage, setInvoiceDefaultPercentage } from "@/lib/invoicePercent";
import {
  listInvoices,
  getInvoiceById,
  updateInvoicePercentage,
  listBusinesses,
  type Business,
  type Invoice,
  type InvoicePaymentStatus,
} from "@/lib/api";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function formatKr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString("sv-SE", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 1 : 0,
  });
}

function formatPaymentStatus(status: InvoicePaymentStatus | undefined) {
  switch (status) {
    case "PAID":
      return { label: "Betald", className: "bg-success/15 text-success" };
    case "OVERDUE":
      return { label: "Försenad", className: "bg-destructive/15 text-destructive" };
    case "LATE":
      return { label: "Sen", className: "bg-destructive/15 text-destructive" };
    case "PENDING":
    default:
      return { label: "Väntande", className: "bg-warning/15 text-warning" };
  }
}

export default function AdminInvoices() {
  const [businessId, setBusinessId] = useState("");
  const [status, setStatus] = useState<InvoicePaymentStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businessById, setBusinessById] = useState<Map<string, Business>>(new Map());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [percentageDraft, setPercentageDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [bulkPercent, setBulkPercent] = useState<string>(() => String(getInvoiceDefaultPercentage()));

  const hydratePercentages = async (list: Invoice[]) => {
    const toHydrate = list.filter(
      (inv) =>
        inv?.id &&
        (typeof inv.pricePercentage !== "number" || !Number.isFinite(inv.pricePercentage) || inv.pricePercentage <= 0),
    );
    if (toHydrate.length === 0) return list;

    // Cap hydration to avoid hammering backend.
    const capped = toHydrate.slice(0, 150);
    const settled = await Promise.allSettled(capped.map((inv) => getInvoiceById(String(inv.id))));
    const byId = new Map<string, Invoice>();
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value?.id) byId.set(String(r.value.id), r.value);
    }
    if (byId.size === 0) return list;
    return list.map((inv) => {
      const full = byId.get(String(inv.id));
      return full ? { ...inv, ...full } : inv;
    });
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      setPage(1);

      // If admin specifies a businessId, use the backend endpoint directly.
      if (businessId.trim()) {
        const response = await listInvoices({
          businessId: businessId.trim(),
          paymentStatus: status ? (status as InvoicePaymentStatus) : undefined,
        });
        const list = Array.isArray(response)
          ? response
          : Array.isArray((response as { invoices?: Invoice[] }).invoices)
            ? (response as { invoices: Invoice[] }).invoices
            : [];
        setBusinessById(new Map());
        setInvoices(await hydratePercentages(list));
        return;
      }

      // Otherwise, load across all companies. If no filters, stop after we have ~25*2
      // to keep initial load fast; pagination is client-side for now.
      const businesses = await listBusinesses();
      const byId = new Map<string, Business>(businesses.map((b) => [String(b.id), b]));
      setBusinessById(byId);

      const merged: Invoice[] = [];
      let failed = 0;
      let firstError: string | null = null;
      const targetCount = status ? 500 : PAGE_SIZE * 2;

      for (const b of businesses.slice(0, 200)) {
        if (merged.length >= targetCount) break;
        try {
          const response = await listInvoices({
            businessId: String(b.id),
            paymentStatus: status ? (status as InvoicePaymentStatus) : undefined,
          });
          const list = Array.isArray(response)
            ? response
            : Array.isArray((response as { invoices?: Invoice[] }).invoices)
              ? (response as { invoices: Invoice[] }).invoices
              : [];
          merged.push(...list.map((inv) => ({ ...inv, businessId: inv.businessId ?? b.id })));
        } catch (error) {
          failed++;
          if (!firstError) {
            firstError = error instanceof Error ? error.message : "Okänt fel vid hämtning av fakturor.";
          }
        }
      }

      if (failed > 0) {
        toast.error(`Kunde inte hämta fakturor för ${failed} företag. Första fel: ${firstError ?? "-"}`);
      }

      setInvoices(await hydratePercentages(merged));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte hämta fakturor.";
      toast.error(message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoice(null);
      setPercentageDraft("");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setDetailsLoading(true);
      try {
        const inv = await getInvoiceById(selectedInvoiceId);
        if (cancelled) return;
        setSelectedInvoice(inv);
        setPercentageDraft(typeof inv.pricePercentage === "number" ? String(inv.pricePercentage) : "");
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Kunde inte läsa fakturan.";
          toast.error(message);
        }
        setSelectedInvoiceId(null);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedInvoiceId]);

  const totals = useMemo(() => {
    const fee = invoices.reduce((s, inv) => s + toNumber(inv.totalPrice), 0);
    const paid = invoices.filter((i) => i.paymentStatus === "PAID").length;
    return { fee, paid, count: invoices.length };
  }, [invoices]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invoices.slice(start, start + PAGE_SIZE);
  }, [invoices, page]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Fakturor</h1>
        <p className="text-muted-foreground mt-1">Adminvy: lista fakturor och justera procent.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            Översikt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">businessId (valfritt)</div>
              <Input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Lämna tomt för alla företag"
                className="h-11 bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Status-filter (valfritt)</div>
              <Input
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoicePaymentStatus | "")}
                placeholder="PENDING / PAID / OVERDUE / LATE"
                className="h-11 bg-background border-border text-foreground"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={loadInvoices}
                disabled={loading}
                className="h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Search className="h-4 w-4" />
                {loading ? "Söker..." : "Sök"}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Totalt: {totals.count} • Betalda: {totals.paid} • Avgift: {formatKr(totals.fee)} kr
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent" />
              Procent för nya fakturor
            </div>
            <div className="grid gap-2 md:grid-cols-[220px_auto_1fr] items-center">
              <Input
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
                placeholder="10"
                inputMode="numeric"
                className="h-11 bg-background border-border text-foreground"
              />
              <Button
                type="button"
                disabled={loading}
                onClick={async () => {
                  const value = Number(bulkPercent);
                  if (!Number.isFinite(value) || value < 0) {
                    toast.error("Procent måste vara ett nummer ≥ 0.");
                    return;
                  }
                  try {
                    setInvoiceDefaultPercentage(value);
                  } catch {
                    /* ignore */
                  }
                  toast.success("Procent sparad. Gäller nya fakturor framåt.");
                }}
                className="h-11 gap-2"
              >
                <Save className="h-4 w-4" />
                Spara
              </Button>
              <div className="text-xs text-muted-foreground">
                Ändrar inte befintliga fakturor.
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Backend-stöd krävs för att detta ska påverka nya fakturor automatiskt. (UI sparar en default.)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between gap-2">
            <span>Lista</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Föregående sida"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Sida {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Nästa sida"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-6 gap-2 px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
            <span>ID</span>
            <span>Företag</span>
            <span>Skapad</span>
            <span className="text-right">Procent</span>
            <span className="text-right">Total</span>
            <span className="text-right">Status</span>
          </div>

          {pagedInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Inga fakturor att visa.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {pagedInvoices.map((inv) => {
                const s = formatPaymentStatus(inv.paymentStatus);
                const companyName = (() => {
                  const bid = inv.businessId ? String(inv.businessId) : "";
                  if (!bid) return "—";
                  const b = businessById.get(bid);
                  return b?.name ? b.name : bid;
                })();
                return (
                  <button
                    type="button"
                    key={String(inv.id)}
                    onClick={() => setSelectedInvoiceId(String(inv.id))}
                    className="w-full text-left grid grid-cols-6 gap-2 px-5 py-3.5 text-sm hover:bg-muted/30 transition-colors items-center"
                  >
                    <span className="font-mono font-semibold text-foreground text-xs truncate">{String(inv.id)}</span>
                    <span className="text-muted-foreground text-xs truncate">{companyName}</span>
                    <span className="text-muted-foreground text-xs">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleString("sv-SE") : "—"}
                    </span>
                    <span className="text-right text-muted-foreground text-xs">
                      {typeof inv.pricePercentage === "number" && inv.pricePercentage > 0
                        ? `${inv.pricePercentage}%`
                        : "10%"}
                    </span>
                    <span className="text-right font-semibold text-foreground">{formatKr(toNumber(inv.totalPrice))} kr</span>
                    <div className="flex justify-end">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedInvoiceId)} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Uppdatera procent</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="text-sm text-muted-foreground">Laddar faktura…</div>
          ) : selectedInvoice ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <div className="text-xs text-muted-foreground">Faktura</div>
                <div className="font-mono text-sm font-semibold text-foreground break-all">{String(selectedInvoice.id)}</div>
                <div className="mt-3 text-xs text-muted-foreground">Nuvarande procent</div>
                <div className="text-sm font-semibold text-foreground">
                  {typeof selectedInvoice.pricePercentage === "number" ? `${selectedInvoice.pricePercentage}%` : "—"}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Nuvarande total</div>
                <div className="text-sm font-semibold text-foreground">{formatKr(toNumber(selectedInvoice.totalPrice))} kr</div>
              </div>

              <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2">
                <div className="text-sm font-semibold text-foreground">Ny procent</div>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <Input
                    value={percentageDraft}
                    onChange={(e) => setPercentageDraft(e.target.value)}
                    placeholder="10"
                    inputMode="numeric"
                    className="h-11 bg-background border-border text-foreground"
                  />
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      const value = Number(percentageDraft);
                      if (!Number.isFinite(value) || value < 0) {
                        toast.error("Procent måste vara ett nummer ≥ 0.");
                        return;
                      }
                      if (!selectedInvoiceId) return;
                      setSaving(true);
                      try {
                        const updated = await updateInvoicePercentage(selectedInvoiceId, value);
                        setSelectedInvoice(updated);
                        setInvoices((prev) => prev.map((i) => (String(i.id) === String(updated.id) ? { ...i, ...updated } : i)));
                        toast.success("Procent uppdaterad.");
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Kunde inte uppdatera procent.";
                        toast.error(message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="h-11 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Sparar..." : "Spara"}
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Backend räknar om totalen när procenten uppdateras.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Kunde inte läsa fakturan.</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedInvoiceId(null)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

