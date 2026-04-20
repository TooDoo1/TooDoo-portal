import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, MousePointer, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteOrder, getBusinessId, listOrders, type Order } from "@/lib/api";
import { toast } from "sonner";

type FilterStatus = "all" | "active" | "draft" | "archived";

type Offer = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  detailedDescription: string;
  category: string;
  status: "active" | "draft" | "archived";
  createdAt: string;
  startsAt: string;
  expiresAt: string;
  views: number;
  clicks: number;
  claimsClaimed: number;
  claimsUsed: number;
  claimsTotal: number;
  originalPrice: number;
  discountedPrice: number;
};

const parsePrice = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const mapOrderToOffer = (order: Order): Offer => {
  const claimsTotal = typeof order.maxRedemptions === "number" ? order.maxRedemptions : 100;
  const price = parsePrice(order.price);
  const originalPrice = parsePrice(order.originalPrice);
  const rawDescription = typeof order.description === "string" ? order.description : "";
  const rawDetailedDescription = typeof order.detailedDescription === "string" ? order.detailedDescription.trim() : "";

  // Backward compatibility: older orders stored short + detailed text in description separated by a blank line.
  let shortDescription = rawDescription.trim();
  let detailedDescription = rawDetailedDescription;
  if (!detailedDescription) {
    const parts = rawDescription.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      shortDescription = parts[0];
      detailedDescription = parts.slice(1).join("\n\n");
    }
  }

  const now = Date.now();
  const startTime = new Date(order.orderTimeFrom || order.validFrom || 0).getTime();
  const endTime = new Date(order.orderTimeTo || order.validTo || 0).getTime();

  const status: Offer["status"] =
    Number.isFinite(endTime) && endTime > 0 && endTime <= now
      ? "archived"
      : Number.isFinite(startTime) && startTime > now
        ? "draft"
        : "active";

  return {
    id: order.id,
    companyId: order.businessId,
    title: order.title,
    description: shortDescription,
    detailedDescription,
    category: typeof order.categoryName === "string" ? order.categoryName : "Okategoriserad",
    status,
    createdAt: order.orderTimeFrom || order.validFrom,
    startsAt: order.orderTimeFrom || order.validFrom,
    expiresAt: order.orderTimeTo || order.validTo,
    views: 0,
    clicks: 0,
    claimsClaimed: 0,
    claimsUsed: 0,
    claimsTotal,
    originalPrice,
    discountedPrice: price,
  };
};

function CountdownTimer({ status, startsAt, expiresAt }: { status: Offer["status"]; startsAt: string; expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const targetTime = status === "draft" ? new Date(startsAt).getTime() : new Date(expiresAt).getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        if (status === "draft") {
          setTimeLeft("Aktiv nu");
          return;
        }

        setTimeLeft("Utgångslöpt");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [status, startsAt, expiresAt]);

  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function CompanyOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const businessId = getBusinessId();
        const orders = await listOrders(undefined, businessId ?? undefined);

        const filteredOrders = businessId
          ? orders.filter((order) => order.businessId === businessId)
          : orders;

        const sortedOrders = [...filteredOrders].sort((a, b) => {
          const aTime = new Date(a.orderTimeFrom || a.validFrom || 0).getTime();
          const bTime = new Date(b.orderTimeFrom || b.validFrom || 0).getTime();
          return bTime - aTime;
        });

        setOffers(sortedOrders.map(mapOrderToOffer));
      } catch {
        setOffers([]);
      }
    };

    void fetchOrders();
  }, []);

  const filteredOffers = offers.filter((offer) => {
    if (filterStatus === "all") return true;
    return offer.status === filterStatus;
  });

  const handleDeleteOffer = async (offer: Offer) => {
    setDeleteLoading((prev) => ({ ...prev, [offer.id]: true }));
    try {
      await deleteOrder(offer.id);
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      toast.success(`Erbjudandet "${offer.title}" har tagits bort.`);
      if (selectedOffer?.id === offer.id) setSelectedOffer(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort erbjudandet.";
      toast.error(message);
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [offer.id]: false }));
    }
  };

  const toggleDescription = (offerId: string) => {
    setExpandedDescriptions((prev) => ({ ...prev, [offerId]: !prev[offerId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/15 text-success";
      case "draft":
        return "bg-warning/15 text-warning";
      case "archived":
        return "bg-muted/15 text-muted-foreground";
      default:
        return "bg-accent/15 text-accent";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Aktiv";
      case "draft":
        return "Utkast";
      case "archived":
        return "Arkiverad";
      default:
        return status;
    }
  };

  const totalClaims = offers.reduce((acc, o) => acc + o.claimsUsed, 0);
  const totalAvailable = offers.reduce((acc, o) => acc + (o.claimsTotal - o.claimsUsed), 0);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes spin-icon {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .group:hover .spin-on-hover {
          animation: spin-icon 2s linear infinite;
        }
      `}</style>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Erbjudanden</h1>
          <p className="text-muted-foreground mt-1">Hantera dina kampanjer och se hur många som har använt dina erbjudanden</p>
        </div>
        <Button
          className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground group"
          onClick={() => navigate("/company/offers/new")}
        >
          <Plus className="h-4 w-4 spin-on-hover" />
          Nytt erbjudande
        </Button>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{offers.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Totalt erbjudanden</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success">{offers.filter((o) => o.status === "active").length}</div>
              <p className="text-sm text-muted-foreground mt-1">Aktiva</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{totalClaims}</div>
              <p className="text-sm text-muted-foreground mt-1">Totalt använda</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{offers.reduce((acc, o) => acc + o.views, 0)}</div>
              <p className="text-sm text-muted-foreground mt-1">Totala visningar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "draft", "archived"] as FilterStatus[]).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            className={filterStatus === status ? "bg-accent hover:bg-accent/80 text-white" : "border-border text-muted-foreground hover:text-foreground"}
            onClick={() => setFilterStatus(status)}
          >
            {status === "all"
              ? "Alla"
              : status === "active"
                ? "Aktiva"
                : status === "draft"
                  ? "Utkast"
                  : "Arkiverade"}
            {status !== "all" && ` (${offers.filter((o) => o.status === status).length})`}
          </Button>
        ))}
      </div>

      
      {filteredOffers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardHeader className="text-center py-12">
            <CardTitle className="text-foreground">Inga erbjudanden än</CardTitle>
            <CardDescription className="mt-2">
              {filterStatus === "all"
                ? "Du har inte skapat något erbjudande än. Börja med att skapa ett nytt erbjudande."
                : `Du har inga ${filterStatus === "active" ? "aktiva" : filterStatus === "draft" ? "utkast" : "arkiverade"} erbjudanden.`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOffers.map((offer) => {
            const claimsPercentage = (offer.claimsClaimed / offer.claimsTotal) * 100;
            const availableClaims = offer.claimsTotal - offer.claimsClaimed;
            const claimedNotUsed = Math.max(offer.claimsClaimed - offer.claimsUsed, 0);
            const earnings = offer.claimsUsed * offer.discountedPrice;
            const hasDetailedDescription = offer.detailedDescription.trim().length > 0;

            return (
              <Card
                key={offer.id}
                className={`bg-card border-border card-hover cursor-pointer transition-all ${selectedOffer?.id === offer.id ? "ring-2 ring-accent border-accent/50" : ""}`}
                onClick={() => setSelectedOffer(offer)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">{offer.title}</h3>
                          <Badge className={`${getStatusColor(offer.status)} pointer-events-none`}>
                            {getStatusLabel(offer.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {offer.description}
                          {hasDetailedDescription ? (
                            <>
                              {" "}
                              <button
                                type="button"
                                className="font-medium text-accent hover:text-accent/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDescription(offer.id);
                                }}
                              >
                                {expandedDescriptions[offer.id] ? "Mindre" : "Mer"}
                              </button>
                            </>
                          ) : null}
                        </p>
                        {hasDetailedDescription && expandedDescriptions[offer.id] && (
                          <p className="mt-2 text-sm text-muted-foreground">{offer.detailedDescription}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right space-y-2">
                        <CountdownTimer status={offer.status} startsAt={offer.startsAt} expiresAt={offer.expiresAt} />
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            <span className="line-through">
                              {offer.originalPrice} kr
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-accent">
                            {offer.discountedPrice} kr
                          </div>
                        </div>
                      </div>
                    </div>

                  
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Antal erbjudanden (claimade)</span>
                        <span className="text-sm font-semibold text-foreground">
                          {offer.claimsClaimed} av {offer.claimsTotal}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-accent transition-all duration-300"
                          style={{ width: `${Math.min(claimsPercentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {availableClaims} {availableClaims === 1 ? "kupong" : "kuponger"} kvar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {offer.claimsUsed} använda, {claimedNotUsed} claimade ej använda
                      </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">{offer.views}</span>
                        <span className="text-xs text-muted-foreground">Visningar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">{offer.clicks}</span>
                        <span className="text-xs text-muted-foreground">Klick</span>
                      </div>
                      <div className="ml-auto text-xs text-muted-foreground">
                        Skapad: {new Date(offer.createdAt).toLocaleDateString("sv-SE")}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-accent hover:bg-accent/80 text-white gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/company/offers/new?editId=${encodeURIComponent(offer.id)}`);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Redigera
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-[#ff3b30] hover:bg-[#ff3b30]/70 text-white gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOfferToDelete(offer);
                          }}
                          disabled={!!deleteLoading[offer.id]}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteLoading[offer.id] ? "Tar bort..." : "Ta bort"}
                        </Button>
                      </div>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-right">
                        <p className="text-xs text-muted-foreground">Intäkter från inkaserade erbjudande:</p>
                        <p className="text-sm font-semibold text-foreground">{earnings} kr</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!offerToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setOfferToDelete(null);
          }
        }}
        title="Ta bort erbjudande?"
        description={offerToDelete ? `Detta tar bort \"${offerToDelete.title}\" permanent.` : "Detta tar bort erbjudandet permanent."}
        confirmLabel="Ja, ta bort"
        variant="destructive"
        onConfirm={() => {
          if (!offerToDelete) {
            return;
          }

          const current = offerToDelete;
          setOfferToDelete(null);
          void handleDeleteOffer(current);
        }}
      />
    </div>
  );
}
