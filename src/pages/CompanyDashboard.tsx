import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Gift,
  ScanLine,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companyOffers } from "@/data/dummy-data";

const activeOffers = companyOffers.filter((offer) => offer.status === "active");
const draftOffers = companyOffers.filter((offer) => offer.status === "draft");
const totalClaims = activeOffers.reduce((sum, offer) => sum + offer.claimsClaimed, 0);
const usedClaims = activeOffers.reduce((sum, offer) => sum + offer.claimsUsed, 0);
const remainingClaims = Math.max(totalClaims - usedClaims, 0);
const totalEarnings = activeOffers.reduce(
  (sum, offer) => sum + offer.claimsUsed * Math.max(offer.discountedPrice, 0),
  0,
);

const stats = [
  {
    label: "Aktiva erbjudanden",
    value: activeOffers.length,
    detail: `${draftOffers.length} utkast`,
    icon: Gift,
    color: "bg-accent/15 text-accent",
  },
  {
    label: "Aktiverade kuponger",
    value: totalClaims,
    detail: `${usedClaims} använda`,
    icon: BadgeCheck,
    color: "bg-success/15 text-success",
  },
  {
    label: "Ej använda kuponger",
    value: remainingClaims,
    detail: "Kan fortfarande lösas in",
    icon: Wallet,
    color: "bg-warning/15 text-warning",
  },
  {
    label: "Vecko intäkt",
    value: `${totalEarnings.toLocaleString("sv-SE")} kr`,
    detail: "Beräknat från använda kuponger",
    icon: CircleDollarSign,
    color: "bg-primary/15 text-primary",
  },
];

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Översikt över dina erbjudanden och kuponger</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-hover bg-card border-border">
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
        ))}
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
            `Nytt erbjudande skapades: ${companyOffers[0]?.title ?? "Erbjudande"}`,
            `${usedClaims} kuponger har verifierats hittills`,
            `${remainingClaims} kuponger väntar på användning`,
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
