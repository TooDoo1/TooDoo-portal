import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ImageIcon, Link2, Loader2, Plus, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategoryMultiSelect } from "@/components/CategoryMultiSelect";
import {
  addBusinessImage,
  createAdminBusiness,
  listCategories,
  lookupClaimableImport,
  searchScbWorkplacesByOrgNumber,
  updateBusiness,
  type ClaimableImport,
  type ScbCompanySearchHit,
} from "@/lib/api";
import { pickCategoryBySni } from "@/lib/sniCategoryMap";
import { cn } from "@/lib/utils";

type CompanyForm = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  city: string;
  description: string;
};

const emptyForm: CompanyForm = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  address: "",
  city: "",
  description: "",
};

type ImageMode = "upload" | "url";

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Unsupported protocol");
  }
  return parsed.toString();
}

export default function AdminCompanyNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [orgNumber, setOrgNumber] = useState("");
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [orgSearchResults, setOrgSearchResults] = useState<ScbCompanySearchHit[]>([]);
  const [orgResultFilter, setOrgResultFilter] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
  const [selectedCfarNr, setSelectedCfarNr] = useState<string | null>(null);
  const [claimableImport, setClaimableImport] = useState<ClaimableImport | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  const showRestOfForm = Boolean(selectedCfarNr) || manualEntry;

  const filePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const filteredOrgSearchResults = useMemo(() => {
    const q = orgResultFilter.trim().toLowerCase();
    if (!q) return orgSearchResults;
    return orgSearchResults.filter((c) => {
      const haystack = [
        c.name,
        c.companyName,
        c.workplaceName ?? "",
        c.addressLine,
        c.city,
        c.cfarNr,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orgResultFilter, orgSearchResults]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  useEffect(() => {
    void (async () => {
      try {
        const categories = await listCategories();
        setCategoryOptions(categories.map((cat) => ({ id: cat.id, name: cat.name })));
      } catch {
        setCategoryOptions([]);
        toast.error("Kunde inte ladda kategorier.");
      }
    })();
  }, []);

  const updateField = (field: keyof CompanyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetWorkplaceSelection = () => {
    setSelectedCompanyName(null);
    setSelectedCfarNr(null);
    setClaimableImport(null);
    setManualEntry(false);
  };

  const applySelectedCompany = async (c: ScbCompanySearchHit) => {
    setSelectedCompanyName(c.name);
    setSelectedCfarNr(c.cfarNr || null);
    setManualEntry(false);
    setClaimableImport(null);

    let matchedImport: ClaimableImport | null = null;
    if (c.cfarNr) {
      try {
        matchedImport = await lookupClaimableImport(c.cfarNr);
        setClaimableImport(matchedImport);
      } catch {
        setClaimableImport(null);
      }
    }

    setForm({
      name: matchedImport?.name ?? c.name,
      contactEmail: matchedImport?.contactEmail ?? c.email ?? "",
      contactPhone: matchedImport?.contactPhone ?? c.phone ?? "",
      website: "",
      address: matchedImport?.address ?? c.street ?? "",
      city: matchedImport?.city ?? c.city ?? "",
      description: matchedImport?.description ?? "",
    });

    const matchedCategoryId = pickCategoryBySni(
      categoryOptions,
      c.industryCode,
      c.industry,
      c.industryCategory,
    );
    if (matchedCategoryId) {
      setCategoryIds([matchedCategoryId]);
    } else if (matchedImport?.categoryNames?.length) {
      const importCategory = categoryOptions.find((option) =>
        matchedImport!.categoryNames.some((name) => name.toLowerCase() === option.name.toLowerCase()),
      );
      if (importCategory) {
        setCategoryIds([importCategory.id]);
      }
    }
  };

  const handleOrgSearch = async () => {
    const raw = orgNumber.trim();
    if (!raw) {
      toast.error("Fyll i organisationsnummer.");
      return;
    }

    setOrgSearchLoading(true);
    setOrgResultFilter("");
    resetWorkplaceSelection();
    try {
      const mapped = await searchScbWorkplacesByOrgNumber(raw);
      setOrgSearchResults(mapped);
      if (mapped.length === 0) {
        toast.info("Inga arbetsställen hittades i SCB:s företagsregister.");
        return;
      }
      if (mapped.length === 1) {
        await applySelectedCompany(mapped[0]);
        toast.success(`${mapped[0].name} valdes automatiskt.`);
        return;
      }
      toast.info(`${mapped.length} arbetsställen hittades — välj rätt arbetsställe nedan.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte söka i SCB:s företagsregister.";
      toast.error(message);
    } finally {
      setOrgSearchLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!showRestOfForm) {
      toast.error("Sök upp företaget via organisationsnummer, eller fortsätt manuellt.");
      return;
    }

    if (claimableImport) {
      toast.error(
        "Detta arbetsställe finns redan som godkänd import. Öppna företaget under Företag eller Importerade istället för att skapa en dubblett.",
      );
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedEmail = form.contactEmail.trim();
    const trimmedPhone = form.contactPhone.trim();
    const trimmedAddress = form.address.trim();
    const trimmedCity = form.city.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedAddress || !trimmedCity || !trimmedDescription) {
      toast.error("Fyll i alla obligatoriska fält.");
      return;
    }
    if (categoryIds.length === 0) {
      toast.error("Välj minst en kategori.");
      return;
    }

    if (imageMode === "url" && imageUrl.trim()) {
      try {
        normalizeExternalUrl(imageUrl);
      } catch {
        toast.error("Bildlänken måste vara en giltig http- eller https-URL.");
        return;
      }
    }

    setSaving(true);
    try {
      const created = await createAdminBusiness({
        name: trimmedName,
        description: trimmedDescription,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        website: form.website.trim() || undefined,
        address: trimmedAddress,
        city: trimmedCity,
        categoryIds,
        ...(orgNumber.trim() ? { orgNr: orgNumber.trim() } : {}),
        ...(selectedCfarNr ? { cfarNr: selectedCfarNr } : {}),
      });

      const businessId = created.id;
      if (!businessId) {
        throw new Error("Företaget skapades utan id.");
      }

      const wantsCustomImage =
        (imageMode === "upload" && Boolean(imageFile)) ||
        (imageMode === "url" && Boolean(imageUrl.trim()));

      if (wantsCustomImage) {
        const galleryImage =
          imageMode === "upload" && imageFile
            ? await addBusinessImage(businessId, { imageSourceType: "UPLOADED", imageFile })
            : await addBusinessImage(businessId, {
                imageSourceType: "EXTERNAL_URL",
                imageUrl: normalizeExternalUrl(imageUrl),
              });

        await updateBusiness(businessId, { imageAssetId: galleryImage.id });
      }

      toast.success(`${trimmedName} är skapat och godkänt.`);
      navigate(`/companies/${businessId}/edit`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa företaget.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 border-border"
          onClick={() => navigate("/companies")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nytt företag</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sök via organisationsnummer (samma flöde som registrering). Företaget godkänns direkt.
          </p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Hitta företaget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="admin-org-number" className="text-sm font-medium text-foreground">
              Organisationsnummer
            </label>
            <div className="flex gap-2">
              <Input
                id="admin-org-number"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="556703-7485"
              />
              <Button
                type="button"
                className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={orgSearchLoading}
                onClick={() => void handleOrgSearch()}
              >
                {orgSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sök"}
              </Button>
            </div>
          </div>

          {orgSearchResults.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border bg-background/30 p-2">
              {orgSearchResults.length > 1 ? (
                <>
                  <div className="px-1 text-xs font-semibold text-muted-foreground">
                    {orgSearchResults.length} arbetsställen — välj rätt arbetsställe
                  </div>
                  <Input
                    value={orgResultFilter}
                    onChange={(e) => setOrgResultFilter(e.target.value)}
                    placeholder="Sök på namn, stad, adress eller CFAR-nr..."
                    className="h-9"
                  />
                </>
              ) : null}
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {filteredOrgSearchResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Inga arbetsställen matchar sökningen.</div>
                ) : (
                  filteredOrgSearchResults.map((c) => {
                    const primaryLabel = c.workplaceName || c.companyName || c.addressLine || c.cfarNr;
                    const secondaryParts = [
                      c.workplaceName ? c.companyName : null,
                      c.addressLine || null,
                      c.cfarNr ? `CFAR ${c.cfarNr}` : null,
                    ].filter(Boolean) as string[];
                    return (
                      <button
                        key={c.cfarNr || `${c.orgNumber}-${c.name}`}
                        type="button"
                        onClick={() => void applySelectedCompany(c)}
                        className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/20"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {primaryLabel}
                              {c.isMainWorkplace ? (
                                <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                                  Huvudkontor
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{secondaryParts.join(" · ")}</div>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              selectedCfarNr === c.cfarNr ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {!showRestOfForm ? (
            <button
              type="button"
              onClick={() => {
                setManualEntry(true);
                setSelectedCfarNr(null);
                setSelectedCompanyName(null);
                setClaimableImport(null);
              }}
              className="text-xs font-semibold text-accent underline underline-offset-4 hover:opacity-90"
            >
              Företaget finns inte i SCB → fortsätt manuellt
            </button>
          ) : selectedCfarNr ? (
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    Valt företag: {selectedCompanyName ?? "Okänt"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    Org.nr {orgNumber.trim()} · CFAR {selectedCfarNr}
                  </div>
                  {claimableImport ? (
                    <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                      Detta arbetsställe finns redan som godkänd import i TooDoo
                      {claimableImport.pendingClaimRequest
                        ? " (ägarskapsansökan väntar)."
                        : "."}{" "}
                      Skapa inte en dubblett — öppna befintligt företag istället.
                      {claimableImport.id ? (
                        <button
                          type="button"
                          className="ml-1 font-semibold text-accent underline underline-offset-2"
                          onClick={() => navigate(`/companies/${claimableImport.id}/edit`)}
                        >
                          Öppna
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={resetWorkplaceSelection}
                  className="shrink-0 text-xs font-semibold text-muted-foreground underline underline-offset-2"
                >
                  Byt
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Manuell registrering — inget SCB-uppslag. Org.nr/CFAR sparas inte.
            </div>
          )}
        </CardContent>
      </Card>

      {showRestOfForm ? (
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Företagsuppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-name">
                    Företagsnamn
                  </label>
                  <Input
                    id="new-company-name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-email">
                    E-post
                  </label>
                  <Input
                    id="new-company-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-phone">
                    Telefon
                  </label>
                  <Input
                    id="new-company-phone"
                    value={form.contactPhone}
                    onChange={(e) => updateField("contactPhone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-website">
                    Webbplats
                  </label>
                  <Input
                    id="new-company-website"
                    value={form.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-address">
                    Adress
                  </label>
                  <Input
                    id="new-company-address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-company-city">
                    Stad
                  </label>
                  <Input
                    id="new-company-city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="new-company-description">
                  Beskrivning
                </label>
                <Textarea
                  id="new-company-description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Kategorier</p>
                <CategoryMultiSelect
                  options={categoryOptions}
                  selectedIds={categoryIds}
                  onChange={setCategoryIds}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Bild (valfritt)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ladda upp en profilbild nu, eller hoppa över — då används en kategoribild som standard.
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={imageMode === "upload" ? "default" : "outline"}
                  className={cn(imageMode === "upload" && "bg-accent text-accent-foreground hover:bg-accent/90")}
                  onClick={() => setImageMode("upload")}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Ladda upp
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={imageMode === "url" ? "default" : "outline"}
                  className={cn(imageMode === "url" && "bg-accent text-accent-foreground hover:bg-accent/90")}
                  onClick={() => setImageMode("url")}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  URL
                </Button>
              </div>

              {imageMode === "upload" ? (
                <div className="space-y-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Förhandsvisning"
                      className="h-32 w-32 rounded-lg border border-border object-cover"
                    />
                  ) : null}
                </div>
              ) : (
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/bild.jpg"
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-border" onClick={() => navigate("/companies")}>
              Avbryt
            </Button>
            <Button
              type="submit"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={saving || Boolean(claimableImport)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Skapa och godkänn
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
