import { Link } from "react-router-dom";
import { Building2, Clock, CheckCircle, TrendingUp, ArrowUpRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { activeCompanies, pendingCompanies, categories } from "@/data/dummy-data";

const stats = [
  { label: "Aktiva företag", value: activeCompanies.length, icon: Building2, trend: "+2 denna vecka", color: "bg-accent/15 text-accent" },
  { label: "Väntande", value: pendingCompanies.length, icon: Clock, trend: "3 nya idag", color: "bg-warning/15 text-warning" },
  { label: "Godkända", value: 4, icon: CheckCircle, trend: "Denna månad", color: "bg-success/15 text-success" },
  { label: "Tillväxt", value: "+12%", icon: TrendingUp, trend: "vs förra månaden", color: "bg-primary/15 text-primary" },
];

const allCompanies = [...activeCompanies, ...pendingCompanies];
const categoryData = categories
  .filter((c) => c !== "Alla")
  .map((cat) => ({
    name: cat,
    total: allCompanies.filter((c) => c.category === cat).length,
    active: activeCompanies.filter((c) => c.category === cat).length,
    pending: pendingCompanies.filter((c) => c.category === cat).length,
  }));

export default function Dashboard() {
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
                      <span>{cat.active} aktiva</span>
                      {cat.pending > 0 && (
                        <span className="text-warning">{cat.pending} väntande</span>
                      )}
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
              { text: "TechNova AB uppdaterade sin profil", time: "2 min sedan" },
              { text: "StartUp Innovations skickade en ansökan", time: "1 timme sedan" },
              { text: "GreenBuild Sverige lade till nytt erbjudande", time: "3 timmar sedan" },
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
