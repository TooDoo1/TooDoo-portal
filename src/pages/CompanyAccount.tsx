import { useEffect, useState } from "react";
import { Building2, ImageIcon, Mail, MapPin, Phone, Save, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getAuthEmail,
  getBusinessId,
  getUserByEmail,
  listBusinesses,
  listCategories,
  setBusinessId,
  updateBusiness,
  type Business,
  type BusinessStatus,
} from "@/lib/api";
import { toast } from "sonner";

type CompanyAccountForm = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  city: string;
  logoUrl: string;
  description: string;
};

const emptyForm: CompanyAccountForm = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  address: "",
  city: "",
  logoUrl: "",
  description: "",
};

function businessToForm(business: Business): CompanyAccountForm {
  return {
    name: business.name ?? "",
    contactEmail: business.contactEmail ?? "",
    contactPhone: business.contactPhone ?? "",
    website: business.website ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
    logoUrl: business.logoUrl ?? "",
    description: business.description ?? "",
  };
}

function mapStatusToBadge(status: BusinessStatus | undefined) {
  if (status === "APPROVED") return "active" as const;
  if (status === "REJECTED") return "inactive" as const;
  return "pending" as const;
}

export default function CompanyAccount() {
  const [form, setForm] = useState<CompanyAccountForm>(emptyForm);
  const [originalForm, setOriginalForm] = useState<CompanyAccountForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessId, setActiveBusinessId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [status, setStatus] = useState<BusinessStatus | undefined>(undefined);

  const updateField = (field: keyof CompanyAccountForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadBusiness = async () => {
      setIsLoading(true);
      try {
        let resolvedBusinessId = getBusinessId();

        if (!resolvedBusinessId) {
          const authEmail = getAuthEmail();
          if (authEmail) {
            const user = await getUserByEmail(authEmail);
            if (user.businessId) {
              resolvedBusinessId = user.businessId;
              setBusinessId(user.businessId);
            }
          }
        }

        if (!resolvedBusinessId) {
          throw new Error("Saknar businessId. Logga in igen.");
        }

        const [businesses, categories] = await Promise.all([listBusinesses(), listCategories()]);
        const business = businesses.find((b) => b.id === resolvedBusinessId);

        if (!business) {
          throw new Error("Kunde inte hitta ditt företag.");
        }

        const categoryById = new Map(categories.map((cat) => [cat.id, cat.name]));
        const resolvedCategory = business.categoryName ?? categoryById.get(business.categoryId) ?? "";

        const nextForm = businessToForm(business);
        setActiveBusinessId(business.id);
        setCategoryName(resolvedCategory);
        setStatus(business.status);
        setForm(nextForm);
        setOriginalForm(nextForm);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte ladda kontoinformation.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadBusiness();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) {
      toast.error("Saknar businessId. Logga in igen.");
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedEmail = form.contactEmail.trim();
    const trimmedPhone = form.contactPhone.trim();
    const trimmedAddress = form.address.trim();
    const trimmedCity = form.city.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      toast.error("Företagsnamn får inte vara tomt.");
      return;
    }
    if (!trimmedEmail) {
      toast.error("E-post får inte vara tom.");
      return;
    }
    if (!trimmedPhone) {
      toast.error("Telefon får inte vara tomt.");
      return;
    }
    if (!trimmedAddress) {
      toast.error("Adress får inte vara tom.");
      return;
    }
    if (!trimmedCity) {
      toast.error("Stad får inte vara tom.");
      return;
    }
    if (!trimmedDescription) {
      toast.error("Beskrivning får inte vara tom.");
      return;
    }

    const trimmedWebsite = form.website.trim();
    const trimmedLogoUrl = form.logoUrl.trim();

    setIsSaving(true);
    try {
      const updated = await updateBusiness(businessId, {
        name: trimmedName,
        description: trimmedDescription,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        website: trimmedWebsite ? trimmedWebsite : null,
        address: trimmedAddress,
        city: trimmedCity,
        logoUrl: trimmedLogoUrl ? trimmedLogoUrl : null,
      });

      const nextForm = businessToForm({
        ...updated,
        name: updated.name ?? trimmedName,
        description: updated.description ?? trimmedDescription,
        contactEmail: updated.contactEmail ?? trimmedEmail,
        contactPhone: updated.contactPhone ?? trimmedPhone,
        address: updated.address ?? trimmedAddress,
        city: updated.city ?? trimmedCity,
      });
      setForm(nextForm);
      setOriginalForm(nextForm);
      if (updated.status) setStatus(updated.status);
      toast.success("Kontoinformation uppdaterad.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte spara kontoinformation.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm(originalForm);
    toast.info("Ändringar återställda.");
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(originalForm);

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Konto</h1>
          <p className="text-muted-foreground mt-1">Hantera och uppdatera företagets information</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {status && <StatusBadge status={mapStatusToBadge(status)} />}
          {categoryName && (
            <span className="text-xs bg-accent/15 text-accent px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {categoryName}
            </span>
          )}
        </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Företagsnamn</label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={isLoading}
                placeholder="Mitt företag AB"
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Logo URL <span className="text-xs text-muted-foreground">(valfri)</span>
              </label>
              <Input
                value={form.logoUrl}
                onChange={(e) => updateField("logoUrl", e.target.value)}
                disabled={isLoading}
                placeholder="https://example.com/logo.png"
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
              {form.logoUrl.trim() && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border border-border bg-background overflow-hidden flex items-center justify-center">
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Förhandsvisning</p>
                </div>
              )}
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
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> E-post
                </label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  disabled={isLoading}
                  placeholder="kontakt@foretag.se"
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> Telefon
                </label>
                <Input
                  value={form.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  disabled={isLoading}
                  placeholder="070-123 45 67"
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Hemsida <span className="text-xs text-muted-foreground">(valfri)</span>
                </label>
                <Input
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  disabled={isLoading}
                  placeholder="https://foretag.se"
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Adress
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={isLoading}
                  placeholder="Storgatan 1"
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stad</label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  disabled={isLoading}
                  placeholder="Stockholm"
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
              <label className="text-sm font-medium text-foreground">Beskrivning av företaget</label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                disabled={isLoading}
                placeholder="Berätta kort om vad ditt företag gör..."
                className="min-h-32 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
              <p className="text-xs text-muted-foreground">Syns på ditt företags publika sida.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || isSaving || !isDirty}
            className="border-border"
          >
            Återställ
          </Button>
          <Button
            type="submit"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={isLoading || isSaving || !isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Sparar..." : "Spara ändringar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
