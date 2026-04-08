import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyOffers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Erbjudanden</h1>
        <p className="text-muted-foreground mt-1">Hantera företagets erbjudanden</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Inga erbjudanden ännu</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          När du skapar erbjudanden visas de här.
        </CardContent>
      </Card>
    </div>
  );
}
