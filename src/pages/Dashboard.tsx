import { Building2, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { activeCompanies, pendingCompanies } from "@/data/dummy-data";

const stats = [
  { label: "Aktiva företag", value: activeCompanies.length, icon: Building2, color: "text-primary" },
  { label: "Väntande ansökningar", value: pendingCompanies.length, icon: Clock, color: "text-warning" },
  { label: "Godkända denna månad", value: 4, icon: CheckCircle, color: "text-success" },
  { label: "Tillväxt", value: "+12%", icon: TrendingUp, color: "text-primary" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Översikt av företagshantering</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} bg-secondary p-3 rounded-xl`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
