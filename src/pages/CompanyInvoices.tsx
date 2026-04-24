import { ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CompanyInvoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Fakturor</h1>
        <p className="text-muted-foreground mt-1">Se och ladda ner dina fakturor</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            Fakturahistorik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">
              Inga fakturor att visa ännu. När ni börjar få debiteringar kommer de dyka upp här.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Kommer snart: export / ladda ner fakturor.")}
              className="border-border"
            >
              Exportera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

