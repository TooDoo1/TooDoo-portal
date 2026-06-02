import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { toast } from "sonner";
import { createOrder, createOrderPreset, getBusinessById, getBusinessId, getOrderById, listOrderPresets, resolveBusinessId, updateOrder, type Business, type OrderPreset } from "@/lib/api";
import { TimePicker } from "@/components/TimePicker";

type OfferForm = {
  title: string;
  imageUrl: string;
  startAt: string;
  startTime: string;
  originalPrice: string;
  discountedPrice: string;
  claimsTotal: string;
  perPersonRedemptions: string;
  couponLifetimeMinutes: string;
  couponLifetimeUnit: "minutes" | "hours" | "days";
  expiresAt: string;
  expiresTime: string;
};

type OfferPayload = {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageSourceType?: "EXTERNAL_URL" | "UPLOADED";
  imageUrl?: string;
  imageFile?: File;
  orderTimeFrom: string;
  orderTimeTo: string;
  /** Daily redeem window start, HH:mm (24h). */
  validFrom: string;
  /** Daily redeem window end, HH:mm (24h). */
  validTo: string;
  /** How long a claimed QR remains valid (minutes). */
  expireTime?: number;
  maxRedemptions?: number;
  perPersonRedemptions?: number;
};

type PreviewBusiness = Pick<Business, "name" | "address" | "city" | "contactPhone" | "website"> & {
  imageUrl?: string | null;
};

function clamp2(value: number) {
  return String(Math.max(0, Math.min(99, value))).padStart(2, "0");
}

function normalizeTime(value: string) {
  const match = (value ?? "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return "";
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return `${clamp2(hh)}:${clamp2(mm)}`;
}

function compareTime(a: string, b: string) {
  const na = normalizeTime(a);
  const nb = normalizeTime(b);
  if (!na || !nb) return 0;
  const [ah, am] = na.split(":").map(Number);
  const [bh, bm] = nb.split(":").map(Number);
  return ah !== bh ? ah - bh : am - bm;
}

function ceilToStep(time: string, stepMinutes: number) {
  const n = normalizeTime(time);
  if (!n) return "";
  const [hStr, mStr] = n.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const total = h * 60 + m;
  const stepped = Math.ceil(total / stepMinutes) * stepMinutes;
  const hh = Math.floor(stepped / 60);
  const mm = stepped % 60;
  if (hh > 23) return "23:59";
  return `${clamp2(hh)}:${clamp2(mm)}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const n = normalizeTime(time);
  if (!n) return "";
  const [hStr, mStr] = n.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const total = h * 60 + m + minutesToAdd;
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${clamp2(hh)}:${clamp2(mm)}`;
}

function toLocalIsoWithOffset(date: Date) {
  // Backend-safe ISO string that preserves the local wall-clock time by including offset, e.g. 2026-04-23T11:40:00+02:00
  return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

function isIsoDateTime(value: string) {
  // Distinguish ISO-like timestamps from HH:mm.
  return Boolean((value ?? "").includes("T"));
}

function getOrderImageUrl(order: Record<string, unknown>) {
  const candidates: unknown[] = [
    order.imageUrl,
    (order as Record<string, unknown>)["image_url"],
    (order as Record<string, unknown>)["imageURL"],
    (order as { imageAsset?: { url?: unknown } }).imageAsset?.url,
    (order as { imageAsset?: { publicUrl?: unknown } }).imageAsset?.publicUrl,
    (order as Record<string, unknown>)["image"],
    (order as { image?: { url?: unknown } }).image?.url,
    (order as { image?: { publicUrl?: unknown } }).image?.publicUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function getPresetImageUrl(preset: Record<string, unknown>) {
  const candidates: unknown[] = [
    preset.imageUrl,
    (preset as Record<string, unknown>)["image_url"],
    (preset as Record<string, unknown>)["imageURL"],
    (preset as { imageAsset?: { url?: unknown } }).imageAsset?.url,
    (preset as { imageAsset?: { publicUrl?: unknown } }).imageAsset?.publicUrl,
    (preset as Record<string, unknown>)["image"],
    (preset as { image?: { url?: unknown } }).image?.url,
    (preset as { image?: { publicUrl?: unknown } }).image?.publicUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

type OfferPreviewCardProps = {
  businessName: string;
  offerText: string;
  priceKr: number | string;
  originalPriceKr?: number | string;
  claimedCount?: number;
  totalCount?: number;
  countdownText?: string;
  imageUrl?: string;
  ctaLabel?: string;
};

function OfferPreviewCard({
  businessName,
  offerText,
  priceKr,
  originalPriceKr,
  claimedCount = 0,
  totalCount = 1,
  countdownText = "13:52:57",
  imageUrl,
  ctaLabel = "Logga in för att claima!",
}: OfferPreviewCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const progress =
    totalCount > 0 ? Math.max(0, Math.min(100, (claimedCount / totalCount) * 100)) : 0;

  return (
    <div style={previewStyles.page}>
      <div style={previewStyles.phoneFrame}>
        <div style={previewStyles.hero} />

        <div style={previewStyles.content}>
          <div style={previewStyles.title}>{businessName}</div>

          <div style={previewStyles.pillsRow}>
            <button type="button" style={{ ...previewStyles.pill, outline: "none" }}>Hitta hit</button>
            <button type="button" style={{ ...previewStyles.pill, outline: "none" }}>Webbplats</button>
          </div>

          <div style={previewStyles.card}>
            <div style={previewStyles.cardTop}>
              <div style={previewStyles.thumbWrap}>
                {imageUrl && !imageFailed ? (
                  <img
                    alt=""
                    src={imageUrl}
                    style={previewStyles.thumbImg}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div style={previewStyles.thumbFallback} />
                )}

                <div style={previewStyles.countdownChip}>{countdownText}</div>
              </div>

              <div style={previewStyles.offerBody}>
                <div style={previewStyles.offerText}>{offerText}</div>

                <div style={previewStyles.priceRow}>
                  <div style={previewStyles.price}>{priceKr} kr</div>
                  {originalPriceKr !== undefined && originalPriceKr !== null ? (
                    <span style={previewStyles.originalPrice}>{originalPriceKr} kr</span>
                  ) : null}
                </div>

                <div style={previewStyles.meta}>
                  Claimade: {claimedCount} / {totalCount}
                </div>

                <div style={previewStyles.progressTrack}>
                  <div style={{ ...previewStyles.progressFill, width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <button type="button" style={{ ...previewStyles.cta, outline: "none" }}>{ctaLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const previewStyles: Record<string, CSSProperties> = {
  page: {
    background: "transparent",
    padding: 0,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    color: "#fff",
  },

  phoneFrame: {
    width: 380,
    borderRadius: 28,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, #000b2a 0%, #061333 55%, #000b2a 100%)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
  },

  hero: {
    height: 190,
    background: "#000b2a",
  },

  content: {
    padding: 20,
    paddingTop: 18,
  },

  title: {
    fontSize: 36,
    lineHeight: "40px",
    fontWeight: 650,
    letterSpacing: -0.6,
    marginBottom: 40,
  },

  pillsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  },

  pill: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    border: "0",
    background: "hsl(var(--accent) / 0.14)",
    color: "hsl(var(--accent))",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    backdropFilter: "none",
  },

  card: {
    position: "relative",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0a1535",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: 14,
    overflow: "hidden",
  },

  cardTop: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },

  thumbWrap: {
    position: "relative",
    width: 112,
    height: 112,
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.10)",
    flex: "0 0 auto",
  },

  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  thumbFallback: {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.03) 100%)",
  },

  countdownChip: {
    position: "absolute",
    left: 8,
    bottom: 8,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    opacity: 0.8,
    zIndex: 2,
  },

  offerBody: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },

  offerText: {
    fontSize: 16,
    fontWeight: 600,
    color: "rgba(255,255,255,0.78)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: 0,
  },

  priceRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 6,
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
  },

  price: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: -0.3,
    lineHeight: "20px",
    color: "#fff",
  },

  originalPrice: {
    display: "inline-block",
    fontSize: 16,
    fontWeight: 600,
    color: "rgb(147, 197, 253)",
    textDecoration: "line-through",
    textDecorationColor: "rgb(147, 197, 253)",
    marginBottom: 0,
    lineHeight: "20px",
  },

  meta: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
  },

  progressTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "#ff3b30",
  },

  cta: {
    marginTop: 14,
    height: 44,
    width: "100%",
    borderRadius: 999,
    border: "0",
    background: "#ff3b30",
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(255,59,48,0.18)",
    position: "relative",
    zIndex: 1,
  },
};

export default function CompanyNewOffer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [startOpen, setStartOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [presets, setPresets] = useState<OrderPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<OfferPayload | null>(null);
  const [previewBusiness, setPreviewBusiness] = useState<PreviewBusiness | null>(null);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editLocked, setEditLocked] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const [form, setForm] = useState<OfferForm>({
    title: "",
    imageUrl: "",
    startAt: "",
    startTime: "",
    originalPrice: "",
    discountedPrice: "",
    claimsTotal: "",
    perPersonRedemptions: "",
    couponLifetimeMinutes: "60",
    couponLifetimeUnit: "minutes",
    expiresAt: "",
    expiresTime: "",
  });

  useEffect(() => {
    let cancelled = false;
    const loadBusiness = async () => {
      try {
        const id = await resolveBusinessId();
        if (!id) return;
        const b = await getBusinessById(id);
        if (cancelled) return;
        setPreviewBusiness({
          name: b.name,
          address: b.address,
          city: b.city,
          contactPhone: b.contactPhone,
          website: b.website,
          imageUrl: b.imageUrl ?? null,
        });
      } catch {
        if (!cancelled) setPreviewBusiness(null);
      }
    };
    void loadBusiness();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("editId")?.trim() ?? "";
    if (!orderId) {
      return;
    }

    setEditOrderId(orderId);
    setIsLoadingOffer(true);
    setEditLocked(false);

    const loadOrder = async () => {
      try {
        const order = await getOrderById(orderId);
        const isActive = (() => {
          const raw = (order as unknown as { isActive?: unknown }).isActive;
          if (typeof raw === "boolean") return raw;
          if (typeof raw === "string") return raw.toLowerCase() === "true";
          return false;
        })();
        setEditLocked(isActive);
        if (isActive) toast.info("Aktivt erbjudande kan inte redigeras.");
        const orderTimeFrom =
          order.orderTimeFrom ||
          (isIsoDateTime(String(order.validFrom ?? "")) ? String(order.validFrom) : "") ||
          "";
        const orderTimeTo =
          order.orderTimeTo ||
          (isIsoDateTime(String(order.validTo ?? "")) ? String(order.validTo) : "") ||
          "";
        const couponLifetimeMinutes =
          typeof (order as unknown as { expireTime?: unknown }).expireTime === "number"
            ? Math.max(1, Math.round((order as unknown as { expireTime: number }).expireTime))
            : 60;
        const redeemValidFrom =
          typeof order.validFrom === "string" && !isIsoDateTime(order.validFrom) ? normalizeTime(order.validFrom) : "";
        const redeemValidTo =
          typeof order.validTo === "string" && !isIsoDateTime(order.validTo) ? normalizeTime(order.validTo) : "";

        setForm({
          title: order.title ?? "",
          imageUrl: getOrderImageUrl(order as unknown as Record<string, unknown>),
          startAt: orderTimeFrom ? format(new Date(orderTimeFrom), "yyyy-MM-dd") : "",
          startTime: redeemValidFrom || (orderTimeFrom ? format(new Date(orderTimeFrom), "HH:mm") : ""),
          originalPrice: typeof order.originalPrice === "number" || typeof order.originalPrice === "string" ? String(order.originalPrice) : "",
          discountedPrice: typeof order.price === "number" || typeof order.price === "string" ? String(order.price) : "",
          claimsTotal: typeof order.maxRedemptions === "number" ? String(order.maxRedemptions) : "",
          perPersonRedemptions: typeof (order as unknown as { perPersonRedemptions?: unknown }).perPersonRedemptions === "number"
            ? String((order as unknown as { perPersonRedemptions: number }).perPersonRedemptions)
            : "",
          couponLifetimeMinutes: String(couponLifetimeMinutes),
          couponLifetimeUnit: "minutes",
          expiresAt: orderTimeTo ? format(new Date(orderTimeTo), "yyyy-MM-dd") : "",
          expiresTime: redeemValidTo || (orderTimeTo ? format(new Date(orderTimeTo), "HH:mm") : ""),
        });
        setImageFile(null);
        setUploadedImageUrl("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte läsa erbjudandet.";
        toast.error(message);
        navigate("/company/offers");
      } finally {
        setIsLoadingOffer(false);
      }
    };

    void loadOrder();
  }, [location.search, navigate]);
  const startDateForEndPicker = form.startAt ? parseISO(form.startAt) : null;
  const expiresMinDate = startDateForEndPicker && !Number.isNaN(startDateForEndPicker.getTime())
    ? startDateForEndPicker
    : tomorrow;
  const expiresDateForStartPicker = form.expiresAt ? parseISO(form.expiresAt) : null;
  const startMaxDate = expiresDateForStartPicker && !Number.isNaN(expiresDateForStartPicker.getTime())
    ? expiresDateForStartPicker
    : null;

  const onChange = (field: keyof OfferForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const stepNumericField = (field: "originalPrice" | "discountedPrice" | "claimsTotal" | "couponLifetimeMinutes", delta: number) => {
    const current = Number(form[field] || 0);
    const next = Math.max(0, current + delta);
    onChange(field, String(next));
  };

  const stepPerPersonRedemptions = (delta: number) => {
    const current = Number(form.perPersonRedemptions || 0);
    const next = Math.max(0, current + delta);
    onChange("perPersonRedemptions", String(next));
  };

  const openPresetPicker = async () => {
    setPresetPickerOpen(true);
    if (presetsLoading || presets.length > 0) return;
    setPresetsLoading(true);
    try {
      const response = await listOrderPresets({ take: 50, skip: 0 });
      const presetsArray = Array.isArray(response)
        ? response
        : Array.isArray((response as { presets?: OrderPreset[] }).presets)
          ? (response as { presets: OrderPreset[] }).presets
          : [];
      setPresets(presetsArray);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte hämta presets.";
      toast.error(message);
      setPresets([]);
    } finally {
      setPresetsLoading(false);
    }
  };

  const applyPreset = (preset: OrderPreset) => {
    const price = typeof preset.price === "number" || typeof preset.price === "string" ? String(preset.price) : "";
    const originalPrice =
      typeof preset.originalPrice === "number" || typeof preset.originalPrice === "string"
        ? String(preset.originalPrice)
        : "";
    const claimsTotal = typeof preset.maxRedemptions === "number" ? String(preset.maxRedemptions) : "";

    setForm((prev) => ({
      ...prev,
      title: typeof preset.title === "string" ? preset.title : prev.title,
      imageUrl: getPresetImageUrl(preset as unknown as Record<string, unknown>) || prev.imageUrl,
      discountedPrice: price,
      originalPrice,
      claimsTotal,
    }));
    setPresetPickerOpen(false);
    toast.success("Preset laddat.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editLocked) {
      toast.error("Kan inte redigera aktivt erbjudande.");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Fyll i titel.");
      return;
    }

    const trimmedImageUrl = form.imageUrl.trim();
    if (trimmedImageUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedImageUrl);
      } catch {
        toast.error("Bild URL måste vara en giltig URL.");
        return;
      }
    }

    const businessId = getBusinessId();
    if (!businessId) {
      toast.error("Saknar businessId. Registrera/logga in igen.");
      return;
    }

    const price = Number(form.discountedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Pris måste vara ett tal större än 0.");
      return;
    }

    let originalPrice: number | undefined;
    if (form.originalPrice.trim()) {
      const parsedOriginalPrice = Number(form.originalPrice);
      if (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice < 0) {
        toast.error("Ordinarie pris måste vara ett giltigt tal.");
        return;
      }
      originalPrice = parsedOriginalPrice;
    }

    let maxRedemptions: number | undefined;
    if (form.claimsTotal.trim()) {
      const parsedMaxRedemptions = Number(form.claimsTotal);
      if (!Number.isInteger(parsedMaxRedemptions) || parsedMaxRedemptions <= 0) {
        toast.error("Max antal claims måste vara ett heltal större än 0.");
        return;
      }
      maxRedemptions = parsedMaxRedemptions;
    }

    let perPersonRedemptions: number | undefined;
    if (form.perPersonRedemptions.trim()) {
      const parsed = Number(form.perPersonRedemptions);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        toast.error("Per person redemptions måste vara ett heltal större än 0.");
        return;
      }
      perPersonRedemptions = parsed;
    }

    const couponLifetimeValue = Number(form.couponLifetimeMinutes);
    if (!Number.isInteger(couponLifetimeValue) || couponLifetimeValue <= 0) {
      toast.error("Kupong livstid måste vara ett heltal större än 0.");
      return;
    }

    const couponLifetimeMultiplier =
      form.couponLifetimeUnit === "minutes"
        ? 60 * 1000
        : form.couponLifetimeUnit === "hours"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    const expireTimeMinutes =
      form.couponLifetimeUnit === "minutes"
        ? couponLifetimeValue
        : form.couponLifetimeUnit === "hours"
          ? couponLifetimeValue * 60
          : couponLifetimeValue * 24 * 60;
    if (!Number.isInteger(expireTimeMinutes) || expireTimeMinutes < 1 || expireTimeMinutes > 1440) {
      toast.error("Kupong livstid måste vara mellan 1 och 1440 minuter.");
      return;
    }

    if (!form.expiresAt) {
      toast.error("Välj ett slutdatum för erbjudandet.");
      return;
    }

    if (!form.startAt) {
      toast.error("Välj ett startdatum för erbjudandet.");
      return;
    }

    if (!form.startTime) {
      toast.error("Välj en starttid för erbjudandet.");
      return;
    }

    if (!form.expiresTime) {
      toast.error("Välj en sluttid för erbjudandet.");
      return;
    }

    if (form.startAt && form.expiresAt && form.startAt === form.expiresAt) {
      // Same day is allowed, but end must be after start.
      if (compareTime(form.expiresTime, addMinutesToTime(form.startTime, 1)) < 0) {
        toast.error("Sluttid måste vara efter starttid när datumen är samma dag.");
        return;
      }
    }

    if (form.startAt === format(new Date(), "yyyy-MM-dd")) {
      const now = new Date();
      const nowTime = `${clamp2(now.getHours())}:${clamp2(now.getMinutes())}`;
      const effectiveMin = ceilToStep(nowTime, 5);
      if (effectiveMin && compareTime(form.startTime, effectiveMin) < 0) {
        toast.error(`Starttid kan inte vara tidigare än ${effectiveMin} idag.`);
        return;
      }
    }

    const orderTimeFromDate = new Date(`${form.startAt}T${form.startTime}`);
    const validToDate = new Date(`${form.expiresAt}T${form.expiresTime}:00`);
    if (Number.isNaN(orderTimeFromDate.getTime()) || Number.isNaN(validToDate.getTime())) {
      toast.error("Starttid eller slutdatum är ogiltigt.");
      return;
    }

    if (orderTimeFromDate.getTime() >= validToDate.getTime()) {
      toast.error("Starttid måste vara före utgångsdatum.");
      return;
    }

    const nowDate = new Date();
    const nowIso = toLocalIsoWithOffset(nowDate);
    const orderTimeFromIso = toLocalIsoWithOffset(orderTimeFromDate);
    const validToIso = toLocalIsoWithOffset(validToDate);

    if (validToDate.getTime() <= Date.now()) {
      toast.error("Slutdatum måste vara i framtiden.");
      return;
    }

    void couponLifetimeMultiplier;
    void nowIso;

    const description = form.title.trim();
    const wantsUpload = Boolean(imageFile);
    const dailyValidFrom = normalizeTime(form.startTime);
    const dailyValidTo = normalizeTime(form.expiresTime);
    if (!dailyValidFrom || !dailyValidTo) {
      toast.error("Giltighetstid måste vara i formatet HH:mm.");
      return;
    }
    const payload: OfferPayload = {
      title: form.title.trim(),
      description,
      price,
      originalPrice,
      imageSourceType: wantsUpload ? "UPLOADED" : trimmedImageUrl ? "EXTERNAL_URL" : undefined,
      imageUrl: wantsUpload ? undefined : trimmedImageUrl ? trimmedImageUrl : undefined,
      imageFile: wantsUpload ? imageFile ?? undefined : undefined,
      orderTimeFrom: orderTimeFromIso,
      orderTimeTo: validToIso,
      validFrom: dailyValidFrom,
      validTo: dailyValidTo,
      expireTime: expireTimeMinutes,
      maxRedemptions,
      perPersonRedemptions,
    };

    setPendingPayload(payload);
    setPreviewOpen(true);
  };

  const confirmCreateOrUpdate = async () => {
    if (!pendingPayload) return;
    setIsSubmitting(true);
    try {
      if (editOrderId) {
        await updateOrder(editOrderId, pendingPayload);
        toast.success("Erbjudande uppdaterat.");
      } else {
        await createOrder(pendingPayload);
        toast.success("Erbjudande skapat.");
      }
      setPreviewOpen(false);
      navigate("/company/offers");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa erbjudandet.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePreset = async () => {
    if (!form.title.trim()) {
      toast.error("Fyll i titel.");
      return;
    }

    const businessId = getBusinessId();
    if (!businessId) {
      toast.error("Saknar businessId. Registrera/logga in igen.");
      return;
    }

    const price = Number(form.discountedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Pris måste vara ett tal större än 0.");
      return;
    }

    let originalPrice: number | undefined;
    if (form.originalPrice.trim()) {
      const parsedOriginalPrice = Number(form.originalPrice);
      if (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice < 0) {
        toast.error("Ordinarie pris måste vara ett giltigt tal.");
        return;
      }
      originalPrice = parsedOriginalPrice;
    }

    let maxRedemptions: number | undefined;
    if (form.claimsTotal.trim()) {
      const parsedMaxRedemptions = Number(form.claimsTotal);
      if (!Number.isInteger(parsedMaxRedemptions) || parsedMaxRedemptions <= 0) {
        toast.error("Max antal kuponger måste vara ett heltal större än 0.");
        return;
      }
      maxRedemptions = parsedMaxRedemptions;
    }

    const trimmedImageUrl = form.imageUrl.trim();
    if (trimmedImageUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedImageUrl);
      } catch {
        toast.error("Bild URL måste vara en giltig URL.");
        return;
      }
    }
    const wantsUpload = Boolean(imageFile);

    setIsSubmitting(true);
    try {
      await createOrderPreset({
        title: form.title.trim(),
        description: form.title.trim(),
        price,
        originalPrice,
        maxRedemptions,
        imageSourceType: wantsUpload ? "UPLOADED" : trimmedImageUrl ? "EXTERNAL_URL" : undefined,
        imageUrl: wantsUpload ? undefined : trimmedImageUrl ? trimmedImageUrl : undefined,
        imageFile: wantsUpload ? imageFile ?? undefined : undefined,
      });
      toast.success("Preset skapat.");
      navigate("/company/offers");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa preset.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media (max-width: 492px) and (max-height: 672px) {
          .no-hover-motion,
          .no-hover-motion * {
            transition-duration: 0ms !important;
          }

          .no-hover-motion.group:hover .anim-back-arrow,
          .no-hover-motion.group:hover .anim-back-text {
            transform: none !important;
            opacity: 1 !important;
          }

          .no-hover-motion.group:hover .anim-back-line {
            transform: scaleX(0) !important;
          }

          .anim-back-line {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {editOrderId ? "Redigera erbjudande" : "Nytt erbjudande"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {editOrderId ? "Ändra erbjudandet och spara uppdateringarna." : "Skapa ett nytt erbjudande som visas i er kampanjlista."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/company/offers")}
          className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Tillbaka till erbjudanden"
        >
          <span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
            <ArrowLeft className="anim-back-arrow h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </span>
          <span className="anim-back-line pointer-events-none absolute left-4 right-4 z-0 h-[1px] origin-left scale-x-0 rounded-full bg-foreground transition-transform duration-300 group-hover:scale-x-100" />
          <span className="anim-back-text pointer-events-none relative z-10 ml-1 whitespace-nowrap transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-0">
            Tillbaka
          </span>
        </button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Erbjudandeinformation</CardTitle>
          <CardDescription>Fyll i detaljerna nedan och skapa erbjudandet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Titel</label>
                <Input
                  placeholder="Ex. 15% av biobiljett"
                  value={form.title}
                  onChange={(e) => onChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Bild URL <span className="text-xs text-muted-foreground">(valfritt)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageFile ? uploadedImageUrl : form.imageUrl}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (imageFile) {
                        // If the user edits the field, switch to URL mode.
                        if (!next.trim()) {
                          setImageFile(null);
                          setUploadedImageUrl("");
                          onChange("imageUrl", "");
                          return;
                        }
                        if (next !== uploadedImageUrl) {
                          setImageFile(null);
                          setUploadedImageUrl("");
                          onChange("imageUrl", next);
                        }
                        return;
                      }
                      onChange("imageUrl", next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="default"
                    className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => imageFileInputRef.current?.click()}
                  >
                    Ladda upp
                  </Button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*,.svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageFile(file);
                      if (file) onChange("imageUrl", "");
                      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Används som bild för erbjudandet i appen.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ordinarie pris (kr)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="149"
                      value={form.originalPrice}
                      onChange={(e) => onChange("originalPrice", e.target.value)}
                      className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("originalPrice", 1)}
                        aria-label="Okad ordinarie pris"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("originalPrice", -1)}
                        aria-label="Minskat ordinarie pris"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rabatterat pris (kr)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="127"
                      value={form.discountedPrice}
                      onChange={(e) => onChange("discountedPrice", e.target.value)}
                      className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("discountedPrice", 1)}
                        aria-label="Okad rabatterat pris"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("discountedPrice", -1)}
                        aria-label="Minskat rabatterat pris"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Totalt antal kuponger</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="120"
                    value={form.claimsTotal}
                    onChange={(e) => onChange("claimsTotal", e.target.value)}
                    className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("claimsTotal", 1)}
                      aria-label="Okat antal kuponger"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("claimsTotal", -1)}
                      aria-label="Minskat antal kuponger"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Per person redemptions (valfritt)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="1"
                    value={form.perPersonRedemptions}
                    onChange={(e) => onChange("perPersonRedemptions", e.target.value)}
                    className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepPerPersonRedemptions(1)}
                      aria-label="Okat per person redemptions"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepPerPersonRedemptions(-1)}
                      aria-label="Minskat per person redemptions"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Begränsar hur många gånger samma person kan använda erbjudandet.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kupong livstid</label>
                <div className="grid grid-cols-[1fr_140px] gap-2">
                  <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="60"
                    value={form.couponLifetimeMinutes}
                    onChange={(e) => onChange("couponLifetimeMinutes", e.target.value)}
                    className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("couponLifetimeMinutes", 1)}
                      aria-label="Oka kupong livstid"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("couponLifetimeMinutes", -1)}
                      aria-label="Minska kupong livstid"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                  <Select
                    value={form.couponLifetimeUnit}
                    onValueChange={(value) => onChange("couponLifetimeUnit", value as OfferForm["couponLifetimeUnit"])}
                  >
                    <SelectTrigger className="h-11 border-border bg-background text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      <SelectItem value="minutes">Minuter</SelectItem>
                      <SelectItem value="hours">Timmar</SelectItem>
                      <SelectItem value="days">Dagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start datum</label>
                  <div className="relative">
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
                            startOpen
                              ? "border-accent ring-2 ring-accent"
                              : "border-border focus-visible:ring-2 focus-visible:ring-accent"
                          )}
                        >
                          {form.startAt ? format(new Date(form.startAt), "yyyy-MM-dd") : "Välj startdatum"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                          Slutdatum: {form.expiresAt ? format(new Date(form.expiresAt), "yyyy-MM-dd") : "Inte valt"}
                        </div>
                        <Calendar
                          mode="single"
                          selected={form.startAt ? parseISO(form.startAt) : undefined}
                          modifiers={
                            form.expiresAt
                              ? { endDate: parseISO(form.expiresAt) }
                              : undefined
                          }
                          modifiersClassNames={{
                            endDate: "bg-blue-500/20 text-blue-100 rounded-md",
                          }}
                          disabled={startMaxDate ? [{ before: today }, { after: startMaxDate }] : { before: today }}
                          onSelect={(date) => {
                            if (date && (!startMaxDate || date <= startMaxDate)) {
                              onChange("startAt", format(date, "yyyy-MM-dd"));
                              setStartOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Utgångsdatum</label>
                  <div className="relative">
                    <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
                            expiresOpen
                              ? "border-accent ring-2 ring-accent"
                              : "border-border focus-visible:ring-2 focus-visible:ring-accent"
                          )}
                        >
                          {form.expiresAt ? format(new Date(form.expiresAt), "yyyy-MM-dd") : "Valj utgangsdatum"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.expiresAt ? parseISO(form.expiresAt) : undefined}
                          modifiers={
                            form.startAt
                              ? { startDate: parseISO(form.startAt) }
                              : undefined
                          }
                          modifiersClassNames={{
                            startDate: "bg-accent/25 text-accent-foreground rounded-md",
                          }}
                          disabled={{ before: expiresMinDate }}
                          onSelect={(date) => {
                            if (date && date >= expiresMinDate) {
                              onChange("expiresAt", format(date, "yyyy-MM-dd"));
                              setExpiresOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Starttid</label>
                  <TimePicker
                    label="Välj starttid"
                    value={form.startTime}
                    onChange={(next) => onChange("startTime", next)}
                    disabled={!form.startAt}
                    minTime={form.startAt === format(new Date(), "yyyy-MM-dd") ? `${clamp2(new Date().getHours())}:${clamp2(new Date().getMinutes())}` : undefined}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sluttid</label>
                  <TimePicker
                    label="Välj sluttid"
                    value={form.expiresTime}
                    onChange={(next) => onChange("expiresTime", next)}
                    disabled={!form.expiresAt}
                    minTime={
                      form.expiresAt && form.startAt && form.expiresAt === form.startAt && form.startTime
                        ? addMinutesToTime(form.startTime, 1)
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/company/offers")}>
                Avbryt
              </Button>
              {!editOrderId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={openPresetPicker}
                >
                  Ladda preset
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCreatePreset}
              >
                Skapa preset
              </Button>
              {!editLocked ? (
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? (editOrderId ? "Sparar..." : "Skapar...") : editOrderId ? "Spara ändringar" : "Skapa erbjudande"}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={presetPickerOpen} onOpenChange={(open) => !isSubmitting && setPresetPickerOpen(open)}>
        <DialogContent className="max-h-[80vh] max-w-[720px] overflow-hidden border-border bg-card p-0">
          <div className="border-b border-border px-5 py-4">
            <DialogHeader className="items-start text-left">
              <DialogTitle>Ladda preset</DialogTitle>
              <DialogDescription>Välj ett preset för att fylla i titel, pris och max kuponger.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {presetsLoading ? (
              <div className="text-sm text-muted-foreground">Hämtar presets...</div>
            ) : presets.length === 0 ? (
              <div className="text-sm text-muted-foreground">Inga presets hittades.</div>
            ) : (
              <div className="space-y-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="w-full rounded-xl border border-border bg-background/40 p-4 text-left transition-colors hover:bg-accent/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{p.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Max kuponger: {typeof p.maxRedemptions === "number" ? p.maxRedemptions : "-"}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {p.originalPrice !== undefined && p.originalPrice !== null && p.originalPrice !== "" ? (
                          <div className="text-xs text-muted-foreground line-through">{String(p.originalPrice)} kr</div>
                        ) : null}
                        <div className="text-sm font-semibold text-accent">{String(p.price)} kr</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setPresetPickerOpen(false)} disabled={isSubmitting}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={(open) => !isSubmitting && setPreviewOpen(open)}>
        <DialogContent hideClose className="max-h-[85vh] max-w-[840px] overflow-hidden border-border bg-card p-0">
          <div className="grid gap-0 md:grid-cols-[max-content_1fr]">
            <div className="border-b border-border bg-background/30 px-6 py-6 md:border-b-0 md:border-r">
              <DialogHeader className="items-start text-left">
                <DialogTitle>Förhandsvisning i appen</DialogTitle>
              </DialogHeader>

              <div className="mt-4 flex justify-center">
                <div className="origin-top scale-[0.78]">
                  <OfferPreviewCard
                    businessName={previewBusiness?.name?.trim() || "Företag"}
                    offerText={pendingPayload?.title || form.title || "Titel"}
                    priceKr={pendingPayload?.price ?? 0}
                    originalPriceKr={pendingPayload?.originalPrice}
                    claimedCount={0}
                    totalCount={pendingPayload?.maxRedemptions ?? 1}
                    countdownText="13:52:57"
                    imageUrl={imageFilePreviewUrl ? imageFilePreviewUrl : form.imageUrl.trim() ? form.imageUrl.trim() : undefined}
                    ctaLabel="Logga in för att claima!"
                  />
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-3 max-w-lg">
                <div className="rounded-2xl border border-border bg-background/40 p-5">
                  <div className="text-base font-semibold text-foreground">Kontroll</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Så här kommer erbjudandet att se ut för användare. Bekräfta för att {editOrderId ? "spara" : "skapa"}.
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Dubbelkolla titel, beskrivning, pris och datum innan du bekräftar.
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Start</div>
                  <div className="text-sm font-semibold text-foreground">
                    {form.startAt ? `${form.startAt}${form.startTime ? ` ${form.startTime}` : ""}` : "-"}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Utgång</div>
                  <div className="text-sm font-semibold text-foreground">
                    {form.expiresAt ? `${form.expiresAt}${form.expiresTime ? ` ${form.expiresTime}` : ""}` : "-"}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Kupong livstid</div>
                  <div className="text-sm font-semibold text-foreground">
                    {form.couponLifetimeMinutes} {form.couponLifetimeUnit}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  disabled={isSubmitting}
                  className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Tillbaka"
                >
                  <span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
                    <ArrowLeft className="anim-back-arrow h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  </span>
                  <span className="anim-back-line pointer-events-none absolute left-4 right-4 z-0 h-[1px] origin-left scale-x-0 rounded-full bg-foreground transition-transform duration-300 group-hover:scale-x-100" />
                  <span className="anim-back-text pointer-events-none relative z-10 ml-1 whitespace-nowrap transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-0">
                    Tillbaka
                  </span>
                </button>
                <Button
                  type="button"
                  disabled={isSubmitting || !pendingPayload || editLocked}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={confirmCreateOrUpdate}
                >
                  {isSubmitting ? (editOrderId ? "Sparar..." : "Skapar...") : editOrderId ? "Bekräfta och spara" : "Bekräfta och skapa"}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
