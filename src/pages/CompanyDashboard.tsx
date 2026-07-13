import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Gift,
  ScanLine,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportedBusinessBanner } from "@/components/ImportedBusinessBanner";
import { getBusinessDailySummary, resolveBusinessId, type BusinessDailySummary } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";

const quickLinks = [
  {
    title: "Hantera erbjudanden",
    description: "Skapa, redigera och följ upp dina kampanjer.",
    to: "/company/offers",
    icon: Gift,
  },
  {
    title: "Verifiera kuponger",
    description: "Skanna eller skriv in kod manuellt i kassan.",
    to: "/company/verification",
    icon: ScanLine,
  },
  {
    title: "Uppdatera konto",
    description: "Ändra företagsuppgifter och kontaktinfo.",
    to: "/company/account",
    icon: BadgeCheck,
  },
];

export default function CompanyDashboard() {
  const [summary, setSummary] = useState<BusinessDailySummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryError(null);
      const businessId = await resolveBusinessId();
      if (!businessId) {
        setSummary(null);
        setSummaryError("Saknar businessId. Logga in igen.");
        return;
      }
      const data = await getBusinessDailySummary(businessId);
      setSummary(data);
    } catch (error) {
      setSummary(null);
      setSummaryError(error instanceof Error ? error.message : "Kunde inte hämta dagens sammanfattning.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useRealtime((event) => {
    if (event.type === "order.updated") {
      void loadSummary();
    }
  });

  const claimedNotRedeemedToday = useMemo(
    () => Math.max((summary?.claimsToday ?? 0) - (summary?.redemptionsToday ?? 0), 0),
    [summary],
  );
  const redemptionRate = summary && summary.claimsToday > 0
    ? Math.round((summary.redemptionsToday / summary.claimsToday) * 100)
    : 0;
  const summaryDate = summary?.dateLabel
    ? new Date(`${summary.dateLabel}T12:00:00`).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "idag";
  const displayValue = (value: number) => (isLoadingSummary ? "..." : value);

  const stats = [
    {
      label: "Erbjudanden uppe idag",
      value: displayValue(summary?.offersUpToday ?? 0),
      detail: `Stockholmstid, ${summaryDate}`,
      icon: Gift,
      color: "bg-accent/15 text-accent",
      to: null as string | null,
    },
    {
      label: "Claimade idag",
      value: displayValue(summary?.claimsToday ?? 0),
      detail: "Skapade kuponger idag",
      icon: BadgeCheck,
      color: "bg-success/15 text-success",
      to: null as string | null,
    },
    {
      label: "Inlösta idag",
      value: displayValue(summary?.redemptionsToday ?? 0),
      detail: `${redemptionRate}% av dagens claims`,
      icon: ScanLine,
      color: "bg-primary/15 text-primary",
      to: null as string | null,
    },
    {
      label: "Claimade ej inlösta",
      value: displayValue(claimedNotRedeemedToday),
      detail: "Återstår från dagens claims",
      icon: Wallet,
      color: "bg-warning/15 text-warning",
      to: null as string | null,
    },
  ];

  return (
    <div className="space-y-8">
      <ImportedBusinessBanner />
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Dagens sammanfattning över erbjudanden och kuponger</p>
      </div>

      {summaryError ? (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            {summaryError}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const card = (
            <Card key={stat.label} className={`h-full bg-card border-border ${stat.to ? "card-hover cursor-pointer" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowUpRight className="h-3 w-3 text-success" />
                      {stat.detail}
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          return stat.to ? (
            <Link key={stat.label} to={stat.to} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={stat.label} className="h-full">{card}</div>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Snabbnavigering</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="card-hover bg-card border-border group cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 bg-accent/15 text-accent">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs mt-1 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            summary
              ? `Dagens sammanfattning hämtad för ${summary.businessName}`
              : "Dagens sammanfattning hämtas",
            `${summary?.offersUpToday ?? 0} erbjudanden är uppe idag`,
            `${summary?.claimsToday ?? 0} claimade, ${summary?.redemptionsToday ?? 0} inlösta`,
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-foreground/80">{activity}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">Nu</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}