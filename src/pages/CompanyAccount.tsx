import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ImageIcon, Mail, MapPin, Moon, Phone, Save, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { BusinessAppPreviewCard } from "@/components/BusinessAppPreviewCard";
import { ImageGalleryDialog } from "@/components/ImageGalleryDialog";
import { cn } from "@/lib/utils";
import { setMonochromeEnabled } from "@/lib/monochrome";
import { setMeteorsEnabled } from "@/lib/meteors";
import { useMonochrome } from "@/hooks/useMonochrome";
import { useMeteors } from "@/hooks/useMeteors";
import { TimePicker } from "@/components/TimePicker";
import {
  getAuthEmail,
  getBusinessId,
  changeMyPassword,
  getUserByEmail,
  getBusinessById,
  getBusinessDefaultImages,
  listCategories,
  listImages,
  setBusinessId,
  submitBusinessImageRequest,
  updateBusiness,
  type Business,
  type BusinessStatus,
} from "@/lib/api";
import { toast } from "sonner";

type OpeningHoursDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type OpeningHoursDayValue = { closed: boolean; from: string; to: string };
type OpeningHoursState = Record<OpeningHoursDayKey, OpeningHoursDayValue>;

const defaultOpeningHours: OpeningHoursState = {
  monday: { closed: false, from: "09:00", to: "17:00" },
  tuesday: { closed: false, from: "09:00", to: "17:00" },
  wednesday: { closed: false, from: "09:00", to: "17:00" },
  thursday: { closed: false, from: "09:00", to: "17:00" },
  friday: { closed: false, from: "09:00", to: "17:00" },
  saturday: { closed: true, from: "09:00", to: "17:00" },
  sunday: { closed: true, from: "09:00", to: "17:00" },
};

const openingHoursLabels: Record<OpeningHoursDayKey, string> = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
  saturday: "Lördag",
  sunday: "Söndag",
};

const weekdayKeys: OpeningHoursDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const weekendKeys: OpeningHoursDayKey[] = ["saturday", "sunday"];

function getBusinessImageUrl(business: Business) {
  if (typeof business.imageUrl === "string" && business.imageUrl.trim()) return business.imageUrl.trim();
  const asset = (business as unknown as { imageAsset?: { url?: unknown } }).imageAsset;
  if (asset && typeof asset.url === "string" && asset.url.trim()) return asset.url.trim();
  const publicUrl = (business as unknown as { imageAsset?: { publicUrl?: unknown } }).imageAsset?.publicUrl;
  if (typeof publicUrl === "string" && publicUrl.trim()) return publicUrl.trim();
  const imagePublicUrl = (business as unknown as { image?: { publicUrl?: unknown } }).image?.publicUrl;
  if (typeof imagePublicUrl === "string" && imagePublicUrl.trim()) return imagePublicUrl.trim();
  return "";
}

function compareTime(a: string, b: string) {
  const matchA = (a ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  const matchB = (b ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matchA || !matchB) return 0;
  const ah = Number(matchA[1]);
  const am = Number(matchA[2]);
  const bh = Number(matchB[1]);
  const bm = Number(matchB[2]);
  if (![ah, am, bh, bm].every((n) => Number.isFinite(n))) return 0;
  return ah !== bh ? ah - bh : am - bm;
}

function toOpeningHoursState(value: Business["openingHours"]): OpeningHoursState {
  const base: OpeningHoursState = structuredClone(defaultOpeningHours);
  const raw = (value ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(base) as OpeningHoursDayKey[]) {
    const day = raw[key] as { from?: unknown; to?: unknown } | undefined;
    if (day && typeof day === "object") {
      const from = typeof day.from === "string" ? day.from : base[key].from;
      const to = typeof day.to === "string" ? day.to : base[key].to;
      base[key] = { closed: false, from, to };
    } else {
      base[key] = { ...base[key], closed: true };
    }
  }
  return base;
}

function toOpeningHoursPayload(state: OpeningHoursState) {
  const payload = Object.fromEntries(
    Object.entries(state)
      .filter(([, v]) => !v.closed)
      .map(([day, v]) => [day, { from: v.from, to: v.to }]),
  );
  return Object.keys(payload).length > 0 ? (payload as Record<string, unknown>) : undefined;
}

type CompanyAccountForm = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  city: string;
  imageUrl: string;
  description: string;
};

const emptyForm: CompanyAccountForm = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  address: "",
  city: "",
  imageUrl: "",
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
    imageUrl: business.imageUrl ?? "",
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [isImageFromGallery, setIsImageFromGallery] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHoursState>(defaultOpeningHours);
  const [originalOpeningHours, setOriginalOpeningHours] = useState<OpeningHoursState>(defaultOpeningHours);
  const [groupWeekdays, setGroupWeekdays] = useState(true);
  const [weekdayGroup, setWeekdayGroup] = useState<OpeningHoursDayValue>({ closed: false, from: "09:00", to: "17:00" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [businessId, setActiveBusinessId] = useState<string | null>(null);
  const [categoryId, setActiveCategoryId] = useState<string>("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [status, setStatus] = useState<BusinessStatus | undefined>(undefined);
  const monochrome = useMonochrome();
  const meteorsEnabled = useMeteors();
  const formRef = useRef<HTMLFormElement | null>(null);

  const imageFilePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!imageFilePreviewUrl) return;
    return () => URL.revokeObjectURL(imageFilePreviewUrl);
  }, [imageFilePreviewUrl]);

  useEffect(() => {
    if (!imageFilePreviewUrl) {
      setUploadedImageUrl("");
      return;
    }
    setUploadedImageUrl(imageFilePreviewUrl);
  }, [imageFilePreviewUrl]);

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

        const [business, categories] = await Promise.all([
          getBusinessById(resolvedBusinessId),
          listCategories(),
        ]);

        if (!business) {
          throw new Error("Kunde inte hitta ditt företag.");
        }

        const categoryById = new Map(categories.map((cat) => [cat.id, cat.name]));
        const resolvedCategory = business.categoryName ?? categoryById.get(business.categoryId) ?? "";

        const nextForm = {
          ...businessToForm(business),
          imageUrl: getBusinessImageUrl(business),
        };
        setImageFile(null);
        setUploadedImageUrl("");
        setIsImageFromGallery(true);
        const nextOpeningHours = toOpeningHoursState(business.openingHours);
        setActiveBusinessId(business.id);
        setActiveCategoryId(business.categoryId ?? "");
        setCategoryName(resolvedCategory);
        setStatus(business.status);
        setForm(nextForm);
        setOriginalForm(nextForm);
        setOpeningHours(nextOpeningHours);
        setOriginalOpeningHours(nextOpeningHours);
        setWeekdayGroup({ ...nextOpeningHours.monday });
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
    const trimmedImageUrl = form.imageUrl.trim();
    const originalImageUrl = (originalForm.imageUrl ?? "").trim();
    let galleryImageSource: "UPLOADED" | "EXTERNAL_URL" | null = null;
    let galleryImageUrls = new Set<string>();

    if (trimmedImageUrl && trimmedImageUrl !== originalImageUrl) {
      const [managerImages, defaultImagesResponse] = await Promise.all([
        listImages().catch(() => []),
        categoryId ? getBusinessDefaultImages(categoryId).catch(() => null) : Promise.resolve(null),
      ]);

      const managerImageUrls = new Set(
        managerImages
          .map((image) => image.publicUrl || image.originalUrl || "")
          .filter((url): url is string => Boolean(url)),
      );
      const defaultImageUrls = new Set(defaultImagesResponse?.images ?? []);
      galleryImageUrls = new Set([...managerImageUrls, ...defaultImageUrls]);

      if (managerImageUrls.has(trimmedImageUrl)) {
        galleryImageSource = "UPLOADED";
      } else if (defaultImageUrls.has(trimmedImageUrl)) {
        galleryImageSource = "EXTERNAL_URL";
      }
    }

    const shouldRequestReview = imageFile !== null || (trimmedImageUrl && trimmedImageUrl !== originalImageUrl && !galleryImageUrls.has(trimmedImageUrl));
    const effectiveOpeningHours: OpeningHoursState = groupWeekdays
      ? {
          ...openingHours,
          monday: { ...weekdayGroup },
          tuesday: { ...weekdayGroup },
          wednesday: { ...weekdayGroup },
          thursday: { ...weekdayGroup },
          friday: { ...weekdayGroup },
        }
      : openingHours;
    const openingHoursPayload = toOpeningHoursPayload(effectiveOpeningHours);

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
        ...(galleryImageSource && trimmedImageUrl && trimmedImageUrl !== originalImageUrl
          ? { imageSourceType: galleryImageSource, imageUrl: trimmedImageUrl }
          : {}),
        openingHours: openingHoursPayload,
      });

      if (shouldRequestReview) {
        try {
          await submitBusinessImageRequest(
            imageFile
              ? { imageSourceType: "UPLOADED", imageFile }
              : { imageSourceType: "EXTERNAL_URL", imageUrl: trimmedImageUrl },
          );
          toast.success("Bildförfrågan skickad till admin för granskning.");
          setIsImageFromGallery(true);
          setImageFile(null);
          setUploadedImageUrl("");
        } catch (requestError) {
          const message = requestError instanceof Error ? requestError.message : "Kunde inte skicka bildförfrågan.";
          toast.warning(message);
        }
      }

      const nextForm = businessToForm({
        ...updated,
        name: updated.name ?? trimmedName,
        description: updated.description ?? trimmedDescription,
        contactEmail: updated.contactEmail ?? trimmedEmail,
        contactPhone: updated.contactPhone ?? trimmedPhone,
        website: updated.website ?? (trimmedWebsite ? trimmedWebsite : null),
        address: updated.address ?? trimmedAddress,
        city: updated.city ?? trimmedCity,
        imageUrl: getBusinessImageUrl(updated) || originalImageUrl || null,
      });
      setForm(nextForm);
      setOriginalForm(nextForm);
      setImageFile(null);
      setUploadedImageUrl("");
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
    setOpeningHours(originalOpeningHours);
    setWeekdayGroup({ ...originalOpeningHours.monday });
    toast.info("Ändringar återställda.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmNewPassword.trim();

    if (!current || !next || !confirm) {
      toast.error("Fyll i nuvarande lösenord och nytt lösenord.");
      return;
    }
    if (next.length < 8) {
      toast.error("Nytt lösenord måste vara minst 8 tecken.");
      return;
    }
    if (next !== confirm) {
      toast.error("Nya lösenorden matchar inte.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Lösenord uppdaterat.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte uppdatera lösenord.";
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(originalForm) ||
    JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours) ||
    (groupWeekdays && JSON.stringify(weekdayGroup) !== JSON.stringify(originalOpeningHours.monday)) ||
    imageFile !== null;

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

      <form ref={formRef} onSubmit={handleSave} className="space-y-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Utseende</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  Svartvitt läge
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Gör hela företagspanelen svartvit (black &amp; white).
                </div>
              </div>
              <button
                type="button"
                aria-pressed={monochrome}
                onClick={() => {
                  setMonochromeEnabled(!monochrome);
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  monochrome
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent/15",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                    monochrome
                      ? "border-accent-foreground/30 bg-accent-foreground/10"
                      : "border-border bg-background/40",
                  )}
                  aria-hidden="true"
                >
                  {monochrome ? "✓" : ""}
                </span>
                {monochrome ? "På" : "Av"}
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-4 w-4 text-muted-foreground grid place-items-center leading-none" aria-hidden="true">
                    ✦
                  </span>
                  Meteorer i bakgrunden
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Visar animerade meteorer bakom sidan.
                </div>
              </div>
              <button
                type="button"
                aria-pressed={meteorsEnabled}
                onClick={() => {
                  setMeteorsEnabled(!meteorsEnabled);
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  meteorsEnabled
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent/15",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                    meteorsEnabled
                      ? "border-accent-foreground/30 bg-accent-foreground/10"
                      : "border-border bg-background/40",
                  )}
                  aria-hidden="true"
                >
                  {meteorsEnabled ? "✓" : ""}
                </span>
                {meteorsEnabled ? "På" : "Av"}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Öppettider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Samma tider Mån–Fre</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Komprimerar vardagar till en rad.
                </div>
              </div>
              <button
                type="button"
                aria-pressed={groupWeekdays}
                onClick={() => {
                  const next = !groupWeekdays;
                  setGroupWeekdays(next);
                  if (next) setWeekdayGroup({ ...openingHours.monday });
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  groupWeekdays
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent/15",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                    groupWeekdays
                      ? "border-accent-foreground/30 bg-accent-foreground/10"
                      : "border-border bg-background/40",
                  )}
                  aria-hidden="true"
                >
                  {groupWeekdays ? "✓" : ""}
                </span>
                {groupWeekdays ? "På" : "Av"}
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
              <div className="space-y-2">
                {groupWeekdays ? (
                  <div className="grid grid-cols-[170px_1fr] items-center gap-2 rounded-lg bg-background/60 p-2">
                    <button
                      type="button"
                      aria-pressed={weekdayGroup.closed}
                      onClick={() => setWeekdayGroup((prev) => ({ ...prev, closed: !prev.closed }))}
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                        weekdayGroup.closed
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent/15",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                          weekdayGroup.closed
                            ? "border-destructive-foreground/30 bg-destructive-foreground/10"
                            : "border-border bg-background/40",
                        )}
                        aria-hidden="true"
                      >
                        {weekdayGroup.closed ? "✕" : ""}
                      </span>
                      <span className="flex flex-col items-start leading-tight">
                        <span>Mån–Fre</span>
                        <span className={cn("text-[11px] font-medium", weekdayGroup.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
                          {weekdayGroup.closed ? "Stängt" : "Öppet"}
                        </span>
                      </span>
                    </button>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TimePicker
                        label="Välj starttid"
                        disabled={weekdayGroup.closed || isLoading}
                        value={weekdayGroup.from}
                        onChange={(from) =>
                          setWeekdayGroup((prev) => {
                            const next = { ...prev, from };
                            if (!next.closed && next.to && compareTime(next.from, next.to) > 0) {
                              next.to = next.from;
                            }
                            return next;
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground text-center">–</span>
                      <TimePicker
                        label="Välj sluttid"
                        disabled={weekdayGroup.closed || isLoading}
                        value={weekdayGroup.to}
                        minTime={weekdayGroup.from || undefined}
                        onChange={(to) =>
                          setWeekdayGroup((prev) => {
                            const next = { ...prev, to };
                            if (!next.closed && next.from && compareTime(next.from, next.to) > 0) {
                              next.to = next.from;
                            }
                            return next;
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  weekdayKeys.map((dayKey) => {
                    const value = openingHours[dayKey];
                    return (
                      <div key={dayKey} className="grid grid-cols-[170px_1fr] items-center gap-2 rounded-lg bg-background/60 p-2">
                        <button
                          type="button"
                          aria-pressed={value.closed}
                          disabled={isLoading}
                          onClick={() =>
                            setOpeningHours((prev) => ({
                              ...prev,
                              [dayKey]: { ...prev[dayKey], closed: !prev[dayKey].closed },
                            }))
                          }
                          className={cn(
                            "inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:opacity-50",
                            value.closed
                              ? "border-destructive bg-destructive text-destructive-foreground"
                              : "border-border bg-background text-foreground hover:bg-accent/15",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                              value.closed
                                ? "border-destructive-foreground/30 bg-destructive-foreground/10"
                                : "border-border bg-background/40",
                            )}
                            aria-hidden="true"
                          >
                            {value.closed ? "✕" : ""}
                          </span>
                          <span className="flex flex-col items-start leading-tight">
                            <span>{openingHoursLabels[dayKey]}</span>
                            <span className={cn("text-[11px] font-medium", value.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
                              {value.closed ? "Stängt" : "Öppet"}
                            </span>
                          </span>
                        </button>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <TimePicker
                            label="Välj starttid"
                            disabled={value.closed || isLoading}
                            value={value.from}
                            onChange={(from) =>
                              setOpeningHours((prev) => {
                                const nextDay = { ...prev[dayKey], from };
                                if (!nextDay.closed && nextDay.to && compareTime(nextDay.from, nextDay.to) > 0) {
                                  nextDay.to = nextDay.from;
                                }
                                return { ...prev, [dayKey]: nextDay };
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground text-center">–</span>
                          <TimePicker
                            label="Välj sluttid"
                            disabled={value.closed || isLoading}
                            value={value.to}
                            minTime={value.from || undefined}
                            onChange={(to) =>
                              setOpeningHours((prev) => {
                                const nextDay = { ...prev[dayKey], to };
                                if (!nextDay.closed && nextDay.from && compareTime(nextDay.from, nextDay.to) > 0) {
                                  nextDay.to = nextDay.from;
                                }
                                return { ...prev, [dayKey]: nextDay };
                              })
                            }
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {weekendKeys.map((dayKey) => {
                  const value = openingHours[dayKey];
                  return (
                    <div key={dayKey} className="grid grid-cols-[170px_1fr] items-center gap-2 rounded-lg bg-background/60 p-2">
                      <button
                        type="button"
                        aria-pressed={value.closed}
                        disabled={isLoading}
                        onClick={() =>
                          setOpeningHours((prev) => ({
                            ...prev,
                            [dayKey]: { ...prev[dayKey], closed: !prev[dayKey].closed },
                          }))
                        }
                        className={cn(
                          "inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:opacity-50",
                          value.closed
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent/15",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
                            value.closed
                              ? "border-destructive-foreground/30 bg-destructive-foreground/10"
                              : "border-border bg-background/40",
                          )}
                          aria-hidden="true"
                        >
                          {value.closed ? "✕" : ""}
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span>{openingHoursLabels[dayKey]}</span>
                          <span className={cn("text-[11px] font-medium", value.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
                            {value.closed ? "Stängt" : "Öppet"}
                          </span>
                        </span>
                      </button>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <TimePicker
                          label="Välj starttid"
                          disabled={value.closed || isLoading}
                          value={value.from}
                          onChange={(from) =>
                            setOpeningHours((prev) => {
                              const nextDay = { ...prev[dayKey], from };
                              if (!nextDay.closed && nextDay.to && compareTime(nextDay.from, nextDay.to) > 0) {
                                nextDay.to = nextDay.from;
                              }
                              return { ...prev, [dayKey]: nextDay };
                            })
                          }
                        />
                        <span className="text-xs text-muted-foreground text-center">–</span>
                        <TimePicker
                          label="Välj sluttid"
                          disabled={value.closed || isLoading}
                          value={value.to}
                          minTime={value.from || undefined}
                          onChange={(to) =>
                            setOpeningHours((prev) => {
                              const nextDay = { ...prev[dayKey], to };
                              if (!nextDay.closed && nextDay.from && compareTime(nextDay.from, nextDay.to) > 0) {
                                nextDay.to = nextDay.from;
                              }
                              return { ...prev, [dayKey]: nextDay };
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

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
                Bildförfrågan till admin <span className="text-xs text-muted-foreground">(valfri)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Bilder från galleriet uppdateras direkt. Egna bilder eller länkar som inte finns i galleriet skickas till admin för granskning.
              </p>

              <div className="space-y-3 rounded-xl border border-border bg-background/30 p-3">
                <div className="flex gap-2">
                  <Input
                    value={imageFile ? uploadedImageUrl : form.imageUrl}
                    onChange={(e) => {
                      const next = e.target.value;
                      setIsImageFromGallery(false);
                      if (imageFile) {
                        if (!next.trim()) {
                          setImageFile(null);
                          setUploadedImageUrl("");
                          updateField("imageUrl", "");
                          return;
                        }
                        if (next !== uploadedImageUrl) {
                          setImageFile(null);
                          setUploadedImageUrl("");
                          updateField("imageUrl", next);
                        }
                        return;
                      }
                      updateField("imageUrl", next);
                    }}
                    disabled={isLoading}
                    placeholder="https://example.com/image.png"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                  />
                  <Button
                    type="button"
                    variant="default"
                    disabled={isLoading}
                    className="h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => imageFileInputRef.current?.click()}
                  >
                    Välj bild
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className="h-11 shrink-0"
                    onClick={() => setGalleryDialogOpen(true)}
                  >
                    Välj från galleri
                  </Button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageFile(file);
                      if (file) {
                        updateField("imageUrl", "");
                        setIsImageFromGallery(false);
                      }
                      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
                    }}
                  />
                </div>

                {isImageFromGallery && form.imageUrl.trim() && (
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-lg border border-border bg-background overflow-hidden flex items-center justify-center">
                      <img
                        src={form.imageUrl}
                        alt="Image preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Förhandsvisning</p>
                  </div>
                )}

                {!isImageFromGallery && (
                  <BusinessAppPreviewCard
                    companyName={form.name.trim() || originalForm.name || "Ditt företag"}
                    categoryName={categoryName}
                    imageUrl={imageFilePreviewUrl || form.imageUrl.trim() || undefined}
                  />
                )}

                {!isImageFromGallery && (
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      onClick={() => formRef.current?.requestSubmit()}
                      disabled={isLoading || isSaving}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Skicka bild
                    </Button>
                  </div>
                )}
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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Byt lösenord</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuvarande lösenord</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading || isSavingPassword}
                    placeholder="••••••••"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nytt lösenord</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading || isSavingPassword}
                    placeholder="Minst 8 tecken"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bekräfta nytt lösenord</label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isLoading || isSavingPassword}
                    placeholder="Upprepa lösenord"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || isSavingPassword}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSavingPassword ? "Sparar..." : "Uppdatera lösenord"}
                </Button>
              </div>
            </form>
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

      <ImageGalleryDialog
        open={galleryDialogOpen}
        onOpenChange={setGalleryDialogOpen}
        onSelect={(imageUrl) => {
          updateField("imageUrl", imageUrl);
          setImageFile(null);
          setUploadedImageUrl("");
          setIsImageFromGallery(true);
        }}
        categoryName={categoryName}
        categoryId={categoryId || undefined}
      />
    </div>
  );
}
