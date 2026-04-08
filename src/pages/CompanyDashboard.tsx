import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Company Dashboard</h1>
        <p className="text-muted-foreground mt-1">Översikt för ditt företagskonto</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Välkommen</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Härifrån kan du hantera dina erbjudanden och verifieringsuppgifter.
        </CardContent>
      </Card>
    </div>
  );
}
