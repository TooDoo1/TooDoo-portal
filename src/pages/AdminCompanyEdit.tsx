import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ImageIcon, Link2, Loader2, Plus, Save, Star, Tag, Trash2, Upload } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CategoryMultiSelect } from "@/components/CategoryMultiSelect";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  addBusinessImage,
  deleteBusinessEvent,
  deleteBusinessImage,
  deleteOrder,
  getBusinessById,
  listBusinessEvents,
  listBusinessImages,
  listCategories,
  listOrders,
  resolveImageUrl,
  updateBusiness,
  type Business,
  type BusinessEvent,
  type BusinessStatus,
  type ImageGalleryItem,
  type Order,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { getBusinessCategoryIds } from "@/lib/businessCategories";

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

function businessToForm(business: Business): CompanyForm {
  return {
    name: business.name ?? "",
    contactEmail: business.contactEmail ?? "",
    contactPhone: business.contactPhone ?? "",
    website: business.website ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
    description: business.description ?? "",
  };
}

function mapStatus(status: BusinessStatus | undefined) {
  if (status === "APPROVED") return "active" as const;
  if (status === "REJECTED") return "inactive" as const;
  return "pending" as const;
}

function formatDate(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

type ImageMode = "upload" | "url";

function getGalleryImageUrl(image: ImageGalleryItem) {
  const rawUrl = image.publicUrl || image.originalUrl || "";
  return rawUrl ? resolveImageUrl(rawUrl) : "";
}

function getBusinessPrimaryImageUrl(business: Business) {
  if (typeof business.imageUrl === "string" && business.imageUrl.trim()) {
    return resolveImageUrl(business.imageUrl.trim());
  }
  const assetUrl = business.imageAsset?.publicUrl ?? business.imageAsset?.url;
  if (typeof assetUrl === "string" && assetUrl.trim()) {
    return resolveImageUrl(assetUrl.trim());
  }
  return "";
}

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

export default function AdminCompanyEdit() {
  const { businessId = "" } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backPath = searchParams.get("from") === "imported" ? "/admin/imported" : "/companies";
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [status, setStatus] = useState<BusinessStatus | undefined>();
  const [isImported, setIsImported] = useState(false);
  const [offers, setOffers] = useState<Order[]>([]);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<Order | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<BusinessEvent | null>(null);
  const [businessImages, setBusinessImages] = useState<ImageGalleryItem[]>([]);
  const [defaultImages, setDefaultImages] = useState<ImageGalleryItem[]>([]);
  const [primaryImageAssetId, setPrimaryImageAssetId] = useState<string | null>(null);
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<ImageGalleryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [business, categories, orderRows, eventRows, gallery] = await Promise.all([
        getBusinessById(businessId, true),
        listCategories(),
        listOrders(undefined, businessId),
        listBusinessEvents({ businessId }),
        listBusinessImages(businessId),
      ]);

      const resolvedCategoryIds = getBusinessCategoryIds(business);
      setForm(businessToForm(business));
      setStatus(business.status);
      setIsImported(business.source === "IMPORTED");
      setCategoryIds(resolvedCategoryIds);
      setOriginalCategoryIds(resolvedCategoryIds);
      setCategoryOptions(categories.map((cat) => ({ id: cat.id, name: cat.name })));
      setOffers(orderRows);
      setEvents(eventRows);
      setBusinessImages(gallery.businessImages ?? []);
      setDefaultImages(gallery.defaultImages ?? []);
      setPrimaryImageAssetId(business.imageAsset?.id ?? null);
      setPrimaryImageUrl(getBusinessPrimaryImageUrl(business));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ladda företaget.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = (field: keyof CompanyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessId) return;

    const trimmedName = form.name.trim();
    const trimmedEmail = form.contactEmail.trim();
    const trimmedPhone = form.contactPhone.trim();
    const trimmedAddress = form.address.trim();
    const trimmedCity = form.city.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName || !trimmedAddress || !trimmedCity || !trimmedDescription) {
      toast.error("Fyll i namn, adress, ort och beskrivning.");
      return;
    }
    if (categoryIds.length === 0) {
      toast.error("Välj minst en kategori.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateBusiness(businessId, {
        name: trimmedName,
        description: trimmedDescription,
        ...(trimmedEmail ? { contactEmail: trimmedEmail } : {}),
        ...(trimmedPhone ? { contactPhone: trimmedPhone } : {}),
        website: form.website.trim() ? form.website.trim() : null,
        address: trimmedAddress,
        city: trimmedCity,
        ...(JSON.stringify(categoryIds) !== JSON.stringify(originalCategoryIds) ? { categoryIds } : {}),
      });
      setForm(businessToForm(updated));
      const nextCategoryIds = getBusinessCategoryIds(updated);
      setCategoryIds(nextCategoryIds);
      setOriginalCategoryIds(nextCategoryIds);
      if (updated.status) setStatus(updated.status);
      toast.success("Företaget har uppdaterats.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte spara ändringar.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async () => {
    if (!deleteOfferTarget) return;
    try {
      await deleteOrder(deleteOfferTarget.id);
      setOffers((prev) => prev.filter((offer) => offer.id !== deleteOfferTarget.id));
      toast.success("Erbjudandet har tagits bort.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort erbjudandet.";
      toast.error(message);
    } finally {
      setDeleteOfferTarget(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      await deleteBusinessEvent(deleteEventTarget.id);
      setEvents((prev) => prev.filter((item) => item.id !== deleteEventTarget.id));
      toast.success("Eventet har tagits bort.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort eventet.";
      toast.error(message);
    } finally {
      setDeleteEventTarget(null);
    }
  };

  const resetImageForm = () => {
    setImageFile(null);
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddImage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessId) return;

    setIsAddingImage(true);
    try {
      let created: ImageGalleryItem;
      if (imageMode === "upload") {
        if (!imageFile) {
          toast.error("Välj en bildfil först.");
          return;
        }
        created = await addBusinessImage(businessId, { imageSourceType: "UPLOADED", imageFile });
      } else {
        let normalizedUrl: string;
        try {
          normalizedUrl = normalizeExternalUrl(imageUrl);
        } catch {
          toast.error("Bildlänken måste vara en giltig http- eller https-URL.");
          return;
        }
        created = await addBusinessImage(businessId, {
          imageSourceType: "EXTERNAL_URL",
          imageUrl: normalizedUrl,
        });
      }

      setBusinessImages((prev) => [created, ...prev]);

      if (!primaryImageAssetId) {
        const updated = await updateBusiness(businessId, { imageAssetId: created.id });
        setPrimaryImageAssetId(created.id);
        setPrimaryImageUrl(getBusinessPrimaryImageUrl(updated));
        toast.success("Bilden har lagts till och satts som profilbild.");
      } else {
        toast.success("Bilden har lagts till i företagets galleri.");
      }
      resetImageForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte lägga till bilden.";
      toast.error(message);
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleSetPrimaryImage = async (image: ImageGalleryItem) => {
    if (!businessId) return;
    setIsSettingPrimary(image.id);
    try {
      const updated = await updateBusiness(businessId, { imageAssetId: image.id });
      setPrimaryImageAssetId(image.id);
      setPrimaryImageUrl(getBusinessPrimaryImageUrl(updated));
      toast.success("Profilbild uppdaterad.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte uppdatera profilbilden.";
      toast.error(message);
    } finally {
      setIsSettingPrimary(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImageTarget || !businessId) return;
    try {
      await deleteBusinessImage(businessId, deleteImageTarget.id);
      setBusinessImages((prev) => prev.filter((image) => image.id !== deleteImageTarget.id));
      if (primaryImageAssetId === deleteImageTarget.id) {
        setPrimaryImageAssetId(null);
        setPrimaryImageUrl("");
      }
      toast.success("Bilden har tagits bort.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort bilden.";
      toast.error(message);
    } finally {
      setDeleteImageTarget(null);
    }
  };

  const renderGalleryImage = (image: ImageGalleryItem, options: { canDelete: boolean }) => {
    const url = getGalleryImageUrl(image);
    if (!url) return null;
    const isPrimary = primaryImageAssetId === image.id;

    return (
      <div
        key={image.id}
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-secondary/20",
          isPrimary ? "border-accent ring-2 ring-accent/40" : "border-border",
        )}
      >
        <img src={url} alt="" className="aspect-square w-full object-cover" />
        {isPrimary && (
          <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
            Profilbild
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 flex-1 text-xs"
            disabled={isPrimary || isSettingPrimary === image.id}
            onClick={() => void handleSetPrimaryImage(image)}
          >
            {isSettingPrimary === image.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Star className="mr-1 h-3 w-3" />
                Profilbild
              </>
            )}
          </Button>
          {options.canDelete && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 px-2"
              onClick={() => setDeleteImageTarget(image)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!businessId) {
    return <div className="py-12 text-center text-destructive">Ogiltigt företags-id.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Laddar företag...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0 border-border" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              {primaryImageUrl ? (
                <img src={primaryImageUrl} alt={form.name || "Företag"} className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <CompanyAvatar name={form.name || "Företag"} />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{form.name || "Redigera företag"}</h1>
                <div className="mt-1">
                  <StatusBadge status={mapStatus(status)} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isImported
                ? "Granska och komplettera importerade uppgifter, ladda upp bild, sedan godkänn från Importerade-kön."
                : "Hantera företagsinformation, bilder, erbjudanden och event."}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="details">Uppgifter</TabsTrigger>
          <TabsTrigger value="images">Bilder ({businessImages.length})</TabsTrigger>
          <TabsTrigger value="offers">Erbjudanden ({offers.length})</TabsTrigger>
          <TabsTrigger value="events">Event ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Företagsuppgifter</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-name">Företagsnamn</label>
                    <Input id="company-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-email">
                      E-post{isImported ? " (valfritt)" : ""}
                    </label>
                    <Input id="company-email" type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-phone">
                      Telefon{isImported ? " (valfritt)" : ""}
                    </label>
                    <Input id="company-phone" value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-website">Webbplats</label>
                    <Input id="company-website" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-address">Adress</label>
                    <Input id="company-address" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="company-city">Stad</label>
                    <Input id="company-city" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="company-description">Beskrivning</label>
                  <Textarea
                    id="company-description"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Tag className="h-4 w-4" />
                    Kategorier
                  </div>
                  <CategoryMultiSelect
                    options={categoryOptions}
                    selectedIds={categoryIds}
                    onChange={setCategoryIds}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Spara ändringar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-accent" />
                  Lägg till bild
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(event) => void handleAddImage(event)}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageMode("upload");
                        setImageUrl("");
                      }}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-colors",
                        imageMode === "upload"
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      )}
                    >
                      <Upload className="mb-2 h-5 w-5" />
                      <div className="text-sm font-semibold">Ladda upp bild</div>
                      <div className="mt-1 text-xs">Bilden kopplas direkt till företaget.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageMode("url");
                        setImageFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-colors",
                        imageMode === "url"
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      )}
                    >
                      <Link2 className="mb-2 h-5 w-5" />
                      <div className="text-sm font-semibold">Bildlänk</div>
                      <div className="mt-1 text-xs">Använd en extern bild-URL.</div>
                    </button>
                  </div>

                  {imageMode === "upload" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Bildfil</label>
                      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center">
                        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAddingImage}>
                          Välj fil
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {imageFile ? imageFile.name : "Ingen fil vald"}
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.svg,image/svg+xml"
                          className="hidden"
                          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                      {filePreviewUrl && (
                        <img src={filePreviewUrl} alt="" className="h-32 w-32 rounded-lg object-cover border border-border" />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Bildlänk</label>
                      <Input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={isAddingImage}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetImageForm} disabled={isAddingImage}>
                      Rensa
                    </Button>
                    <Button type="submit" disabled={isAddingImage} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {isAddingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Lägg till bild
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Företagsgalleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Uppladdade bilder</p>
                  {businessImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Inga uppladdade bilder ännu.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {businessImages.map((image) => renderGalleryImage(image, { canDelete: true }))}
                    </div>
                  )}
                </div>

                {defaultImages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Standardbilder</p>
                    <p className="text-xs text-muted-foreground">Kan användas som profilbild men tas inte bort härifrån.</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {defaultImages.map((image) => renderGalleryImage(image, { canDelete: false }))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="offers">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Erbjudanden</CardTitle>
              <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to={`/companies/${businessId}/offers/new`}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Lägg till erbjudande
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga erbjudanden ännu.</p>
              ) : (
                offers.map((offer) => (
                  <div key={offer.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{offer.title}</p>
                      {offer.description?.trim() && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(offer.orderTimeFrom)} – {formatDate(offer.orderTimeTo)} · {Number(offer.price)} kr
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                      onClick={() => setDeleteOfferTarget(offer)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Event</CardTitle>
              <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to={`/companies/${businessId}/events/new`}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Lägg till event
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga event ännu.</p>
              ) : (
                events.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.description?.trim() && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(item.startsAt)} – {formatDate(item.endsAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-[#ff3b30] bg-[#ff3b30] text-white hover:bg-[#e5362c] hover:border-[#e5362c]"
                      onClick={() => setDeleteEventTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteOfferTarget}
        onOpenChange={(open) => !open && setDeleteOfferTarget(null)}
        title="Ta bort erbjudande"
        description={`Är du säker på att du vill ta bort "${deleteOfferTarget?.title}"?`}
        confirmLabel="Ta bort"
        onConfirm={() => void handleDeleteOffer()}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteImageTarget}
        onOpenChange={(open) => !open && setDeleteImageTarget(null)}
        title="Ta bort bild"
        description="Är du säker på att du vill ta bort den här bilden från företagets galleri?"
        confirmLabel="Ta bort"
        onConfirm={() => void handleDeleteImage()}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteEventTarget}
        onOpenChange={(open) => !open && setDeleteEventTarget(null)}
        title="Ta bort event"
        description={`Är du säker på att du vill ta bort "${deleteEventTarget?.title}"?`}
        confirmLabel="Ta bort"
        onConfirm={() => void handleDeleteEvent()}
        variant="destructive"
      />
    </div>
  );
}
