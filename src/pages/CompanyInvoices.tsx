import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Receipt,
  BadgeCheck,
  CircleDollarSign,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  Table2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportInvoicesToExcel, exportInvoicesToKalkylark, type InvoiceExportRow } from "@/lib/invoiceExport";
import {
  listInvoices,
  getInvoiceById,
  getBusinessRedemptions,
  resolveBusinessId,
  type Invoice,
  type InvoicePaymentStatus,
  type Redemption,
} from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "sonner";

// ─── helpers ────────────────────────────────────────────────────────────────

function getWeekLabel(date: Date): string {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
  );
  return `V${week}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function toMonthKey(input: unknown) {
  const d = new Date(String(input ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatKr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString("sv-SE", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 1 : 0,
  });
}

function getInvoiceBreakdown(inv: Invoice, grossOverride?: number | null) {
  const PERCENT = 10; // TooDoo takes 10%
  const gross =
    typeof grossOverride === "number" && Number.isFinite(grossOverride) ? grossOverride : null;

  if (gross !== null) {
    const fee = (gross * PERCENT) / 100;
    const earnings = Math.max(0, gross - fee);
    return { fee, gross, earnings, pct: PERCENT };
  }

  // Fallback: if we can't map redemptions->invoice, infer gross from invoice total
  const fee = toNumber(inv.totalPrice);
  const inferredGross = PERCENT > 0 ? (fee * 100) / PERCENT : 0;
  const earnings = Math.max(0, inferredGross - fee);
  return { fee, gross: inferredGross, earnings, pct: PERCENT };
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

// ─── types ───────────────────────────────────────────────────────────────────

interface WeekData {
  week: string;
  earnings: number;
  fee: number;
  fakturor: number;
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-foreground font-bold">
        {formatKr(Number(payload[0]?.value ?? 0))} kr
      </p>
      <p className="text-muted-foreground text-xs">
        {formatKr(Number(payload[1]?.value ?? 0))} kr avgift • {payload[2]?.value ?? 0} fakturor
      </p>
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

export default function CompanyInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadInvoices = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const businessId = await resolveBusinessId();
      if (!businessId) throw new Error("Saknar businessId.");
      const [response, reds] = await Promise.all([
        listInvoices({ businessId }),
        getBusinessRedemptions(businessId),
      ]);
      const list = Array.isArray(response)
        ? response
        : Array.isArray((response as { invoices?: Invoice[] }).invoices)
          ? (response as { invoices: Invoice[] }).invoices
          : [];
      setInvoices(list);
      setRedemptions(Array.isArray(reds) ? reds : []);
    } catch {
      setInvoices([]);
      setRedemptions([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useRealtime((event) => {
    if (event.type === "order.updated") {
      void loadInvoices({ silent: true });
    }
  });

  const grossByInvoiceId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of redemptions) {
      const invoiceId = String((r as unknown as { invoiceId?: unknown }).invoiceId ?? "");
      if (!invoiceId) continue;
      const price = toNumber((r as unknown as { order?: { price?: unknown } }).order?.price);
      if (!price) continue;
      map.set(invoiceId, (map.get(invoiceId) ?? 0) + price);
    }
    return map;
  }, [redemptions]);

  const grossByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of redemptions) {
      const key = toMonthKey((r as unknown as { redeemedAt?: unknown }).redeemedAt);
      if (!key) continue;
      const price = toNumber((r as unknown as { order?: { price?: unknown } }).order?.price);
      if (!price) continue;
      map.set(key, (map.get(key) ?? 0) + price);
    }
    return map;
  }, [redemptions]);

  const getGrossOverrideForInvoice = (inv: Invoice) => {
    const byId = grossByInvoiceId.get(String(inv.id));
    if (typeof byId === "number" && Number.isFinite(byId) && byId > 0) return byId;
    const monthKey = toMonthKey(inv.createdAt);
    const byMonth = grossByMonth.get(monthKey);
    return typeof byMonth === "number" && Number.isFinite(byMonth) && byMonth > 0 ? byMonth : null;
  };

  const buildExportRows = (): InvoiceExportRow[] => {
    const exportedAt = new Date().toLocaleString("sv-SE");
    const rows: InvoiceExportRow[] = [
      ["TooDoo – transaktionshistorik"],
      [`Exporterad: ${exportedAt}`],
      [],
      ["Faktura", "Skapad", "Omsättning (kr)", "Avgift (kr)", "Din intäkt (kr)", "Procent", "Status"],
    ];

    let totalGross = 0;
    let totalFee = 0;
    let totalEarnings = 0;

    for (const inv of invoices) {
      const b = getInvoiceBreakdown(inv, getGrossOverrideForInvoice(inv));
      const status = formatPaymentStatus(inv.paymentStatus).label;
      const created = inv.createdAt
        ? new Date(inv.createdAt).toLocaleString("sv-SE")
        : "—";

      totalGross += b.gross ?? 0;
      totalFee += b.fee;
      totalEarnings += b.earnings ?? 0;

      rows.push([
        String(inv.id),
        created,
        String(b.gross ?? 0),
        String(b.fee),
        String(b.earnings ?? 0),
        b.pct !== null ? `${b.pct}%` : "—",
        status,
      ]);
    }

    rows.push([]);
    rows.push([
      "Totalt",
      `${invoices.length} fakturor`,
      String(totalGross),
      String(totalFee),
      String(totalEarnings),
      "",
      "",
    ]);

    return rows;
  };

  const handleExport = async (target: "excel" | "kalkylark") => {
    if (invoices.length === 0) {
      toast.error("Det finns inga fakturor att exportera.");
      return;
    }

    setExporting(true);
    try {
      const rows = buildExportRows();
      if (target === "excel") {
        exportInvoicesToExcel(rows);
        toast.success("Fakturan öppnas i Excel.");
      } else {
        await exportInvoicesToKalkylark(rows);
        toast.success("Nytt kalkylark öppnat. Klistra in data med Ctrl+V om det behövs.");
      }
      setExportDialogOpen(false);
    } catch {
      toast.error("Kunde inte exportera fakturan.");
    } finally {
      setExporting(false);
    }
  };

  // ── Build 8-week chart data ───────────────────────────────────────────────
  // The chart is driven by actual redemptions (redeemedAt + order.price), not
  // invoices, so today's inlösta erbjudanden show up immediately even if no
  // invoice has been created yet for the current week.
  const weeklyData = useMemo((): WeekData[] => {
    const now = new Date();
    const weeks: WeekData[] = [];
    const PERCENT = 10; // TooDoo takes 10%

    for (let w = 7; w >= 0; w--) {
      const weekStart = startOfWeek(
        new Date(now.getTime() - w * 7 * 86400000),
      );
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const label = getWeekLabel(weekStart);

      let gross = 0;
      for (const r of redemptions) {
        const t = new Date(
          String((r as unknown as { redeemedAt?: unknown }).redeemedAt ?? ""),
        ).getTime();
        if (!Number.isFinite(t)) continue;
        if (t < weekStart.getTime() || t >= weekEnd.getTime()) continue;
        gross += toNumber(
          (r as unknown as { order?: { price?: unknown } }).order?.price,
        );
      }

      const fee = (gross * PERCENT) / 100;
      const earnings = Math.max(0, gross - fee);

      const fakturor = invoices.filter((inv) => {
        const t = new Date(String(inv.createdAt ?? "")).getTime();
        return Number.isFinite(t) && t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;

      weeks.push({ week: label, earnings, fee, fakturor });
    }

    return weeks;
  }, [invoices, redemptions]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalEarnings = useMemo(
    () => weeklyData.reduce((s, w) => s + w.earnings, 0),
    [weeklyData],
  );
  const totalFee = useMemo(
    () => weeklyData.reduce((s, w) => s + w.fee, 0),
    [weeklyData],
  );
  const totalDeals = useMemo(
    () => weeklyData.reduce((s, w) => s + w.fakturor, 0),
    [weeklyData],
  );
  const lastWeek = weeklyData[weeklyData.length - 1]?.earnings ?? 0;
  const prevWeek = weeklyData[weeklyData.length - 2]?.earnings ?? 0;
  const weekGrowth =
    prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : 0;

  const summaryStats = [
    {
      label: "Din intäkt (8v)",
      value: `${formatKr(totalEarnings)} kr`,
      detail: `${weekGrowth >= 0 ? "+" : ""}${weekGrowth}% vs förra veckan`,
      icon: CircleDollarSign,
      color: "bg-primary/15 text-primary",
      positive: weekGrowth >= 0,
    },
    {
      label: "Fakturor (8v)",
      value: totalDeals,
      detail: "Antal fakturor skapade",
      icon: BadgeCheck,
      color: "bg-success/15 text-success",
      positive: true,
    },
    {
      label: "Denna vecka",
      value: `${formatKr(lastWeek)} kr`,
      detail: "Senaste 7 dagarna",
      icon: TrendingUp,
      color: "bg-accent/15 text-accent",
      positive: true,
    },
    {
      label: "Avgift (8v)",
      value: `${formatKr(totalFee)} kr`,
      detail: `${invoices.filter((i) => i.paymentStatus === "PAID").length} betalda fakturor`,
      icon: Receipt,
      color: "bg-warning/15 text-warning",
      positive: true,
    },
  ];

  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoice(null);
      return;
    }

    let cancelled = false;
    const loadDetails = async () => {
      setDetailsLoading(true);
      try {
        const inv = await getInvoiceById(selectedInvoiceId);
        if (cancelled) return;
        setSelectedInvoice(inv);
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
    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedInvoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Laddar fakturor…
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          Veckointäkt & fakturor
        </h1>
        <p className="text-muted-foreground mt-1">
          Intäktsöversikt och transaktionshistorik för dina erbjudanden
        </p>
      </header>

      {/* Summary stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p
                      className={`text-xs flex items-center gap-1 ${
                        stat.positive
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      <ArrowUpRight size={12} />
                      {stat.detail}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Area chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" />
            Din intäkt per vecka
          </CardTitle>
          <span className="text-xs text-muted-foreground">Senaste 8 veckorna</span>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorRevenue)"
                dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="fee"
                stroke="hsl(var(--accent))"
                strokeWidth={1.5}
                fill="url(#colorDeals)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded-full bg-primary inline-block" />
              Din intäkt (kr)
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded-full bg-accent inline-block" />
              Avgift (kr)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Receipt size={18} className="text-accent" />
            Transaktionshistorik
          </CardTitle>
          <button
            type="button"
            onClick={() => setExportDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded-lg px-3 py-1.5"
          >
            <Download size={13} />
            Exportera
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-2 px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
            <span>Faktura</span>
            <span>Skapad</span>
            <span className="text-right">Omsättning</span>
            <span className="text-right">Avgift</span>
            <span className="text-right">Din intäkt</span>
            <span className="text-right">Procent</span>
            <span className="text-right">Status</span>
          </div>

          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              Inga transaktioner ännu.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {invoices.map((inv) => (
                (() => {
                  const b = getInvoiceBreakdown(inv, getGrossOverrideForInvoice(inv));
                  const grossText = b.gross !== null ? `${formatKr(b.gross)} kr` : "—";
                  const feeText = `${formatKr(b.fee)} kr`;
                  const earningsText = b.earnings !== null ? `${formatKr(b.earnings)} kr` : "—";
                  const earningsMuted = b.earnings === null;
                  return (
                <button
                  type="button"
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="w-full text-left grid grid-cols-7 gap-2 px-5 py-3.5 text-sm hover:bg-muted/30 transition-colors items-center"
                >
                  {/* Faktura nr */}
                  <span className="font-mono font-semibold text-foreground text-xs">
                    {String(inv.id)}
                  </span>

                  {/* Skapad */}
                  <span className="text-muted-foreground text-xs">
                    {inv.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                      : "—"}
                  </span>

                  {/* Omsättning */}
                  <span className="text-right text-muted-foreground">{grossText}</span>

                  {/* Avgift */}
                  <span className="text-right font-semibold text-foreground">{feeText}</span>

                  {/* Din intäkt */}
                  <span className={`text-right font-semibold ${earningsMuted ? "text-muted-foreground" : "text-foreground"}`}>
                    {earningsText}
                  </span>

                  {/* Procent */}
                  <span className="text-right text-muted-foreground">
                    {b.pct !== null ? `${b.pct}%` : "—"}
                  </span>

                  {/* Status */}
                  <div className="flex justify-end">
                    {(() => {
                      const s = formatPaymentStatus(inv.paymentStatus);
                      return (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.className}`}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>
                </button>
                  );
                })()
              ))}
            </div>
          )}

          {/* Footer sum */}
          {invoices.length > 0 && (
            <div className="grid grid-cols-7 gap-2 px-5 py-3.5 border-t border-border bg-muted/20 rounded-b-xl text-sm font-semibold">
              <span className="col-span-2 text-muted-foreground">
                Totalt ({invoices.length} fakturor)
              </span>
              <span />
              <span className="text-right text-muted-foreground">
                {formatKr(invoices.reduce((s, i) => s + (getInvoiceBreakdown(i, getGrossOverrideForInvoice(i)).gross ?? 0), 0))} kr
              </span>
              <span className="text-right text-foreground">
                {formatKr(invoices.reduce((s, i) => s + getInvoiceBreakdown(i, getGrossOverrideForInvoice(i)).fee, 0))} kr
              </span>
              <span className="text-right text-foreground">
                {formatKr(invoices.reduce((s, i) => s + (getInvoiceBreakdown(i, getGrossOverrideForInvoice(i)).earnings ?? 0), 0))} kr
              </span>
              <span />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportera faktura</DialogTitle>
            <DialogDescription>
              Välj vilket program fakturan ska skapas i. Exporten innehåller hela transaktionshistoriken.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={exporting || invoices.length === 0}
              className="h-auto min-h-[7.5rem] w-full min-w-0 flex-col items-center justify-center gap-2 whitespace-normal px-3 py-4 border-border hover:bg-secondary/60"
              onClick={() => void handleExport("excel")}
            >
              <FileSpreadsheet className="!h-8 !w-8 shrink-0 text-emerald-500" />
              <span className="w-full text-center text-sm font-semibold leading-tight">Excel</span>
              <span className="w-full text-center text-xs font-normal leading-snug text-muted-foreground">
                Laddar ner och öppnar i Microsoft Excel
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={exporting || invoices.length === 0}
              className="h-auto min-h-[7.5rem] w-full min-w-0 flex-col items-center justify-center gap-2 whitespace-normal px-3 py-4 border-border hover:bg-secondary/60"
              onClick={() => void handleExport("kalkylark")}
            >
              <Table2 className="!h-8 !w-8 shrink-0 text-accent" />
              <span className="w-full text-center text-sm font-semibold leading-tight">Kalkylark</span>
              <span className="w-full text-center text-xs font-normal leading-snug text-muted-foreground">
                Öppnar Google Kalkylark med fakturadata
              </span>
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExportDialogOpen(false)}>
              Avbryt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedInvoiceId)} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Faktura</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="text-sm text-muted-foreground">Laddar faktura…</div>
          ) : selectedInvoice ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <div className="text-xs text-muted-foreground">ID</div>
                <div className="font-mono text-sm font-semibold text-foreground">{String(selectedInvoice.id)}</div>
                <div className="mt-3 text-xs text-muted-foreground">Skapad</div>
                <div className="text-sm font-semibold text-foreground">
                  {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString("sv-SE") : "—"}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Status</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatPaymentStatus(selectedInvoice.paymentStatus).label}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Total</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatKr(toNumber(selectedInvoice.totalPrice))} kr
                </div>

                <div className="mt-3 text-xs text-muted-foreground">Omsättning / Din intäkt</div>
                <div className="text-sm font-semibold text-foreground">
                  {(() => {
                    const b = getInvoiceBreakdown(selectedInvoice, getGrossOverrideForInvoice(selectedInvoice));
                    if (b.gross === null || b.earnings === null) return "—";
                    return `${formatKr(b.gross)} kr / ${formatKr(b.earnings)} kr`;
                  })()}
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground">
                  Avgiften baseras på fakturans procent (din intäkt = omsättning − avgift).
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Kunde inte läsa fakturan.</div>
          )}

          <DialogFooter>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-accent/10"
              onClick={() => setSelectedInvoiceId(null)}
            >
              Stäng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}