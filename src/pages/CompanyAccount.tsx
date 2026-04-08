import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyAccount() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Konto</h1>
        <p className="text-muted-foreground mt-1">Hantera kontoinformation och inställningar</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Kontodetaljer</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Här kan du uppdatera information om ditt konto.
        </CardContent>
      </Card>
    </div>
  );
}
