import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyVerification() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Verifiering</h1>
        <p className="text-muted-foreground mt-1">Fyll i och följ status för företagets verifiering</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Verifiering påbörjad</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Här kommer status och krav för verifiering visas.
        </CardContent>
      </Card>
    </div>
  );
}
