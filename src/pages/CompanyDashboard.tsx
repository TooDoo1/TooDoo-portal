import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Gift,
  ScanLine,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessId, listOrders, type Order } from "@/lib/api";

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
  {
    title: "Veckointäkt & fakturor",
    description: "Se intäktsgraf och transaktionshistorik.",
    to: "/company/revenue",
    icon: TrendingUp,
  },
];

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const businessId = getBusinessId();
        const data = await listOrders(undefined, businessId ?? undefined);
        setOrders(data);
      } catch {
        setOrders([]);
      }
    };

    void load();
  }, []);

  const activeOffers = useMemo(() => {
    const now = Date.now();
    return orders.filter((order) => new Date(String(order.validTo)).getTime() > now);
  }, [orders]);

  const totalClaims = activeOffers.reduce(
    (sum, offer) => sum + Number(offer.maxRedemptions ?? 0),
    0,
  );
  const totalEarnings = activeOffers.reduce(
    (sum, offer) => sum + Number(offer.price ?? 0),
    0,
  );

  const stats = [
    {
      label: "Aktiva erbjudanden",
      value: activeOffers.length,
      detail: `${orders.length - activeOffers.length} utgångna`,
      icon: Gift,
      color: "bg-accent/15 text-accent",
      onClick: () => navigate("/company/offers"),
    },
    {
      label: "Aktiverade kuponger",
      value: totalClaims,
      detail: "Från maxRedemptions",
      icon: BadgeCheck,
      color: "bg-success/15 text-success",
      onClick: () => navigate("/company/verification"),
    },
    {
      label: "Ej använda kuponger",
      value: 0,
      detail: "Kräver claim-statistik endpoint",
      icon: Wallet,
      color: "bg-warning/15 text-warning",
      onClick: () => navigate("/company/revenue"),
    },
    {
      label: "Veckointäkt",
      value: `${totalEarnings.toLocaleString("sv-SE")} kr`,
      detail: "Klicka för att se detaljer →",
      icon: CircleDollarSign,
      color: "bg-primary/15 text-primary",
      onClick: () => navigate("/company/revenue"),
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Översikt över dina erbjudanden och kuponger
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              onClick={stat.onClick}
              className="cursor-pointer card-hover"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
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

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Snabbnavigering</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <Card className="card-hover h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-accent/15 text-accent">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            `Live orders hämtade: ${orders.length}`,
            `${activeOffers.length} erbjudanden aktiva just nu`,
            "Mock-data borttagen från dashboard",
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm text-muted-foreground border-b border-border/50 pb-2 last:border-0"
            >
              <span>{activity}</span>
              <span className="text-xs">Nu</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}