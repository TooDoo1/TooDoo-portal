import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Globe, Loader2, Mail, MapPin, Phone, Tag, Tags } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BackArrowLabel } from "@/components/BackArrowLabel";
import { BusinessImportBadges } from "@/components/BusinessImportBadges";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessById, listOrders, resolveImageUrl, type Business, type Order } from "@/lib/api";
import { buildGoogleMapsUrl, formatImportGoogleScore } from "@/lib/businessImport";

const dayLabels: Record<string, string> = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
  saturday: "Lördag",
  sunday: "Söndag",
};

function getBusinessImageUrl(business: Business) {
  if (typeof business.imageUrl === "string" && business.imageUrl.trim()) return business.imageUrl.trim();
  const assetUrl = business.imageAsset?.url;
  if (typeof assetUrl === "string" && assetUrl.trim()) return assetUrl.trim();
  return "";
}

function formatOpeningHours(openingHours: Business["openingHours"]) {
  if (!openingHours || typeof openingHours !== "object") return null;

  const lines = Object.entries(openingHours)
    .map(([day, value]) => {
      const label = dayLabels[day] ?? day;
      if (!value || typeof value !== "object") return null;
      const hours = value as { from?: unknown; to?: unknown };
      const from = typeof hours.from === "string" ? hours.from : "";
      const to = typeof hours.to === "string" ? hours.to : "";
      if (!from || !to) return null;
      return `${label}: ${from}–${to}`;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines : null;
}

function mapStatus(status: Business["status"]) {
  if (status === "APPROVED") return "active" as const;
  if (status === "REJECTED") return "inactive" as const;
  return "pending" as const;
}

function getCategoryName(business: Business, fallback?: string) {
  return business.categoryName?.trim() || business.category?.name?.trim() || fallback || "Okategoriserad";
}

type OfferStatus = "active" | "draft" | "archived";

type CompanyOffer = {
  id: string;
  title: string;
  description: string;
  status: OfferStatus;
  startsAt: string;
  expiresAt: string;
  originalPrice: number;
  discountedPrice: number;
  claimsClaimed: number;
  claimsUsed: number;
  claimsTotal: number;
};

function parsePrice(value: number | string | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function mapOrderToOffer(order: Order): CompanyOffer {
  const claimsTotal = typeof order.maxRedemptions === "number" ? order.maxRedemptions : 100;
  const now = Date.now();
  const startTime = new Date(order.orderTimeFrom || order.validFrom || 0).getTime();
  const endTime = new Date(order.orderTimeTo || order.validTo || 0).getTime();

  const status: OfferStatus =
    Number.isFinite(endTime) && endTime > 0 && endTime <= now
      ? "archived"
      : Number.isFinite(startTime) && startTime > now
        ? "draft"
        : "active";

  const claimed = Math.max(0, Math.floor(Number(order.claimedRedemptions ?? 0)));
  const used = Math.max(0, Math.floor(Number(order.redeemedRedemptions ?? 0)));

  return {
    id: order.id,
    title: order.title,
    description: order.description ?? "",
    status,
    startsAt: order.orderTimeFrom || order.validFrom,
    expiresAt: order.orderTimeTo || order.validTo,
    originalPrice: parsePrice(order.originalPrice),
    discountedPrice: parsePrice(order.price),
    claimsClaimed: Math.max(claimed, used),
    claimsUsed: used,
    claimsTotal,
  };
}

function getOfferStatusColor(status: OfferStatus) {
  switch (status) {
    case "active":
      return "bg-success/15 text-success";
    case "draft":
      return "bg-warning/15 text-warning";
    case "archived":
      return "bg-muted/15 text-muted-foreground";
  }
}

function getOfferStatusLabel(status: OfferStatus) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "draft":
      return "Kommande";
    case "archived":
      return "Utgånget";
  }
}

function formatOfferPeriod(startsAt: string, expiresAt: string) {
  const start = new Date(startsAt);
  const end = new Date(expiresAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const format = (date: Date) =>
    date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });

  return `${format(start)} – ${format(end)}`;
}

type CompanyDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  companyName?: string;
  category?: string;
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="pl-6 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

export function CompanyDetailsDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  category,
}: CompanyDetailsDialogProps) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !companyId) {
      setBusiness(null);
      setOffers([]);
      setError(null);
      setOffersError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setOffersError(null);
      try {
        const [businessData, orderRows] = await Promise.all([
          getBusinessById(companyId, true),
          listOrders(undefined, companyId).catch((err) => {
            if (!cancelled) {
              setOffersError(err instanceof Error ? err.message : "Kunde inte ladda erbjudanden.");
            }
            return [] as Order[];
          }),
        ]);

        if (!cancelled) {
          setBusiness(businessData);
          const sorted = [...orderRows].sort((a, b) => {
            const aTime = new Date(a.orderTimeFrom || a.validFrom || 0).getTime();
            const bTime = new Date(b.orderTimeFrom || b.validFrom || 0).getTime();
            return bTime - aTime;
          });
          setOffers(sorted.map(mapOrderToOffer));
        }
      } catch (err) {
        if (!cancelled) {
          setBusiness(null);
          setOffers([]);
          setError(err instanceof Error ? err.message : "Kunde inte ladda företagsinformation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const displayName = business?.name ?? companyName ?? "Företag";
  const categoryName = business ? getCategoryName(business, category) : category;
  const openingHoursLines = business ? formatOpeningHours(business.openingHours) : null;
  const imageUrl = business ? resolveImageUrl(getBusinessImageUrl(business)) : null;
  const mapsUrl = business ? buildGoogleMapsUrl(business) : null;
  const googleScore = business ? formatImportGoogleScore(business.importMetadata) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-4xl">
        <DialogClose asChild>
          <button
            type="button"
            className="group no-hover-motion absolute left-4 top-4 z-10 inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
            aria-label="Tillbaka"
          >
            <BackArrowLabel>Tillbaka</BackArrowLabel>
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="sr-only">{displayName}</DialogTitle>
          <DialogDescription className="sr-only">Detaljerad information om företaget</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Laddar företagsinformation...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <CompanyAvatar name={displayName} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg text-foreground">{displayName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {business && <StatusBadge status={mapStatus(business.status)} />}
                  {business ? <BusinessImportBadges business={business} /> : null}
                </div>
              </div>
            </div>

            {business?.source === "IMPORTED" ? (
              <div className="rounded-xl border border-border bg-background/40 p-4 text-sm">
                <p className="font-semibold text-foreground">Importinformation</p>
                <div className="mt-3 grid gap-2 text-muted-foreground">
                  {business.cfarNr ? <p>CFAR: <span className="text-foreground">{business.cfarNr}</span></p> : null}
                  {business.orgNr ? <p>Org.nr: <span className="text-foreground">{business.orgNr}</span></p> : null}
                  {googleScore ? <p>Google-matchning: <span className="text-foreground">{googleScore}</span></p> : null}
                  {business.importMetadata?.google?.enrichedAt ? (
                    <p>Enrichat: <span className="text-foreground">{new Date(business.importMetadata.google.enrichedAt).toLocaleString("sv-SE")}</span></p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Separator className="bg-border/50" />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {business?.contactEmail && (
                  <DetailRow icon={Mail} label="E-post">
                    <a href={`mailto:${business.contactEmail}`} className="hover:text-accent transition-colors">
                      {business.contactEmail}
                    </a>
                  </DetailRow>
                )}

                {business?.contactPhone && (
                  <DetailRow icon={Phone} label="Telefon">
                    <a href={`tel:${business.contactPhone}`} className="hover:text-accent transition-colors">
                      {business.contactPhone}
                    </a>
                  </DetailRow>
                )}

                {categoryName && (
                  <DetailRow icon={Tag} label="Kategori">
                    <Link
                      to={`/category/${encodeURIComponent(categoryName)}`}
                      className="text-accent hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      {categoryName}
                    </Link>
                  </DetailRow>
                )}

                {(business?.address || business?.city) && (
                  <DetailRow icon={MapPin} label="Adress">
                    <div className="space-y-1">
                      <p>{[business.address, business.city].filter(Boolean).join(", ")}</p>
                      {mapsUrl ? (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          Öppna i Google Maps
                        </a>
                      ) : null}
                    </div>
                  </DetailRow>
                )}

                {business?.website && (
                  <DetailRow icon={Globe} label="Webbplats">
                    <a
                      href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent transition-colors break-all"
                    >
                      {business.website}
                    </a>
                  </DetailRow>
                )}

                {business?.createdAt && (
                  <DetailRow icon={Calendar} label="Gick med">
                    {new Date(business.createdAt).toLocaleDateString("sv-SE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </DetailRow>
                )}

                {openingHoursLines && (
                  <DetailRow icon={Clock} label="Öppettider">
                    <ul className="space-y-0.5">
                      {openingHoursLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </DetailRow>
                )}

                {business?.description?.trim() && (
                  <>
                    <Separator className="bg-border/50" />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Beskrivning</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{business.description.trim()}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 md:border-l md:border-border/50 md:pl-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tags className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium uppercase tracking-wide">
                    Erbjudanden ({offers.length})
                  </p>
                </div>

                {offersError ? (
                  <p className="text-sm text-destructive">{offersError}</p>
                ) : offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Inga erbjudanden ännu.</p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {offers.map((offer) => {
                      const period = formatOfferPeriod(offer.startsAt, offer.expiresAt);

                      return (
                        <div
                          key={offer.id}
                          className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">{offer.title}</p>
                                <Badge className={`${getOfferStatusColor(offer.status)} pointer-events-none text-[10px] px-1.5 py-0`}>
                                  {getOfferStatusLabel(offer.status)}
                                </Badge>
                              </div>
                              {offer.description.trim() && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{offer.description.trim()}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {offer.originalPrice > 0 && (
                                <p className="text-xs text-muted-foreground line-through">{offer.originalPrice} kr</p>
                              )}
                              <p className="text-sm font-semibold text-accent">{offer.discountedPrice} kr</p>
                            </div>
                          </div>

                          {period && (
                            <p className="text-xs text-muted-foreground">{period}</p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            {offer.claimsUsed} inlösta · {offer.claimsClaimed} claimade · {offer.claimsTotal} totalt
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
