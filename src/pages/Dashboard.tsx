import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Clock, CheckCircle, TrendingUp, ArrowUpRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listBusinesses, listCategories, listOrders, type Order } from "@/lib/api";

type CategoryCard = {
  name: string;
  total: number;
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pendingBusinessIds, setPendingBusinessIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersData, categoriesData, pendingBusinesses] = await Promise.all([
          listOrders(),
          listCategories(),
          listBusinesses("PENDING"),
        ]);
        setOrders(ordersData);
        setCategories(categoriesData.map((category) => category.name));
        setPendingBusinessIds(Array.from(new Set(pendingBusinesses.map((business) => business.id))));
      } catch {
        setOrders([]);
        setCategories([]);
        setPendingBusinessIds([]);
      }
    };

    void load();
  }, []);

  const uniqueBusinesses = useMemo(() => {
    return new Set(orders.map((order) => order.businessId)).size;
  }, [orders]);

  const activeOrderCount = useMemo(() => {
    const now = Date.now();
    return orders.filter((order) => new Date(order.validTo).getTime() > now).length;
  }, [orders]);

  const pendingBusinessCount = useMemo(() => pendingBusinessIds.length, [pendingBusinessIds]);

  const stats = [
    { label: "Aktiva företag", value: uniqueBusinesses, icon: Building2, trend: "Från live orders", color: "bg-accent/15 text-accent" },
    { label: "Väntande", value: pendingBusinessCount, icon: Clock, trend: "Unika företag med status PENDING", color: "bg-warning/15 text-warning" },
    { label: "Aktiva erbjudanden", value: activeOrderCount, icon: CheckCircle, trend: "Giltiga just nu", color: "bg-success/15 text-success" },
    { label: "Tillväxt", value: "-", icon: TrendingUp, trend: "Kräver historikdata", color: "bg-primary/15 text-primary" },
  ];

  const categoryData: CategoryCard[] = useMemo(() => {
    return categories.map((name) => ({
      name,
      total: orders.filter((order) => String(order.categoryName ?? "") === name).length,
    }));
  }, [categories, orders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Välkommen tillbaka! Här är en översikt.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-hover bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-success" />
                    {stat.trend}
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

      {/* Category cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Kategorier</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categoryData.map((cat) => (
            <Link key={cat.name} to={`/category/${encodeURIComponent(cat.name)}`}>
              <Card className="card-hover bg-card border-border group cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{cat.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{cat.total} erbjudanden</span>
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
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Senaste aktivitet</h2>
          <div className="space-y-3">
            {[
              { text: `${orders.length} orders hämtade från API`, time: "Nu" },
              { text: `${categories.length} kategorier hämtade`, time: "Nu" },
              { text: "Mock-data borttagen från dashboard", time: "Nu" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground/80">{activity.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
