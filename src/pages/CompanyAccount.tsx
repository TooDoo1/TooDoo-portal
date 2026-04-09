import { useState } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CompanyAccountForm = {
  companyName: string;
  orgNumber: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  address: string;
  shortDescription: string;
  longDescription: string;
};

const initialForm: CompanyAccountForm = {
  companyName: "TooDoo AB",
  orgNumber: "559123-4567",
  contactName: "Elliot Svensson",
  email: "kontakt@toodoo.se",
  phone: "070-123 45 67",
  website: "https://toodoo.se",
  city: "Stockholm",
  address: "Sveavägen 10",
  shortDescription: "Vi bygger digitala lösningar för smartare erbjudandehantering.",
  longDescription:
    "TooDoo hjälper företag att skapa, spåra och verifiera kampanjer via kupongkoder och QR. Fokus är snabb hantering, tydlig statistik och en enkel upplevelse för både personal och kunder.",
};

export default function CompanyAccount() {
  const [form, setForm] = useState<CompanyAccountForm>(initialForm);

  const updateField = (field: keyof CompanyAccountForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyName.trim() || !form.email.trim() || !form.contactName.trim()) {
      toast.error("Fyll i företagsnamn, kontaktperson och e-post.");
      return;
    }

    toast.success("Kontoinformation uppdaterad (mock).");
  };

  const handleReset = () => {
    setForm(initialForm);
    toast.info("Ändringar återställda.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Konto</h1>
        <p className="text-muted-foreground mt-1">Hantera och uppdatera företagets information</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Företagsinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Företagsnamn</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Organisationsnummer</label>
                <Input
                  value={form.orgNumber}
                  onChange={(e) => updateField("orgNumber", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kontaktperson</label>
                <Input
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Kontaktuppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-post</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telefon</label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Hemsida</label>
                <Input
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stad</label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Adress</label>
                <Input
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Beskrivning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Kort beskrivning</label>
              <Textarea
                value={form.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                className="min-h-20 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Detaljerad beskrivning</label>
              <Textarea
                value={form.longDescription}
                onChange={(e) => updateField("longDescription", e.target.value)}
                className="min-h-32 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleReset}>
            Återställ
          </Button>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="mr-2 h-4 w-4" />
            Spara ändringar
          </Button>
        </div>
      </form>
    </div>
  );
}
