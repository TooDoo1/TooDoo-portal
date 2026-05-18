import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, QrCode, ScanLine, Search, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getBusinessRedemptions,
  listOrders,
  resolveBusinessId,
  validateClaim,
  type Order,
  type Redemption,
} from "@/lib/api";
import { toast } from "sonner";

type ClaimFilter = "all" | "aktiv" | "inlöst" | "claimed";

export default function CompanyVerification() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const businessId = await resolveBusinessId();
        if (!businessId) {
          setOrders([]);
          setRedemptions([]);
          return;
        }
        const [orderData, redemptionData] = await Promise.all([
          listOrders(undefined, businessId),
          getBusinessRedemptions(businessId),
        ]);
        setOrders(orderData);
        setRedemptions(redemptionData);
      } catch {
        setOrders([]);
        setRedemptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setCameraError("Kunde inte spela upp kameraflöde.");
    });
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError("Kunde inte starta kamera. Kontrollera behörigheter i webbläsaren.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleManualVerify = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      toast.error("Ange en kod för verifiering.");
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await validateClaim(code);

      if (!response.ok) {
        toast.error(response.reason || "Koden kunde inte valideras.");
        return;
      }

      const title = response.order?.title;
      toast.success(title ? `Kod verifierad för ${title}.` : `Kod ${code} verifierad.`);
      setManualCode("");

      const businessId = await resolveBusinessId();
      if (!businessId) return;
      const updated = await getBusinessRedemptions(businessId);
      setRedemptions(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verifiering misslyckades.";
      toast.error(message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const redemptionsByOrder = new Map<string, Redemption[]>();
  for (const r of redemptions) {
    const list = redemptionsByOrder.get(r.orderId) ?? [];
    list.push(r);
    redemptionsByOrder.set(r.orderId, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Verifiering</h1>
        <p className="text-muted-foreground mt-1">Skanna QR eller skriv in kupongkod manuellt för verifiering</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-accent" />
            Kamera (QR-skanner)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {!cameraActive ? (
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Starta kamera
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera}>
                <CameraOff className="mr-2 h-4 w-4" />
                Stoppa kamera
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <div className="mx-auto flex h-52 w-full max-w-sm flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/70 bg-card">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full rounded-lg object-cover -scale-x-100" />
              ) : (
                <>
                  <ScanLine className="mb-2 h-10 w-10 text-accent" />
                  <p className="text-sm font-medium text-foreground">Kamera är avstängd</p>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    Starta kamera för att kunna skanna QR-koder
                  </p>
                </>
              )}
            </div>
          </div>

          {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <QrCode className="h-5 w-5 text-accent" />
            Manuell kodinmatning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Ange kupongkod om kunden inte kan skanna QR.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Exempel: 7K9D-M2Q8-TX4R"
              className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
            />
            <Button className="h-11 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleManualVerify} disabled={verifyLoading}>
              {verifyLoading ? "Verifierar..." : "Verifiera kod"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="space-y-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" />
              Erbjudanden
            </CardTitle>
            <div className="flex items-center gap-2 md:justify-end">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">Filtrera efter status:</label>
              <Select value={claimFilter} onValueChange={(value) => setClaimFilter(value as ClaimFilter)}>
                <SelectTrigger className="w-40 bg-card border-border">
                  <SelectValue placeholder="Välj status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="claimed">Claimbade</SelectItem>
                  <SelectItem value="inlöst">Inlösta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Sök på kod, namn eller e-post..."
              className="pl-9 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
                role="status"
                aria-label="Laddar"
              />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Inga erbjudanden hittades.</p>
          ) : (
            <div className="space-y-3">
              {orders
                .filter((order) => {
                  // Hide orders that expired more than 24 hours ago.
                  const expiresStr = (order as any).orderTimeTo || (order as any).validTo || "";
                  if (expiresStr) {
                    const expires = new Date(expiresStr).getTime();
                    if (!Number.isNaN(expires)) {
                      const oneDayMs = 24 * 60 * 60 * 1000;
                      if (expires + oneDayMs < Date.now()) return false;
                    }
                  }
                  return true;
                })
                .filter((order) => {
                  // Apply claim status filter
                  const claimed = Number(order.claimedRedemptions ?? 0);
                  const max = Number(order.maxRedemptions ?? 0);
                  const redeemed = Number(order.redeemedRedemptions ?? 0);
                  
                  if (claimFilter === "all") return true;
                  if (claimFilter === "aktiv") return claimed > 0 && redeemed < max;
                  if (claimFilter === "claimed") return claimed > 0;
                  if (claimFilter === "inlöst") return redeemed >= max;
                  return true;
                })
                .map((order) => {
                const now = Date.now();
                const expiresStr = (order as any).orderTimeTo || (order as any).validTo || "";
                const expiresTs = expiresStr ? new Date(expiresStr).getTime() : NaN;
                const isExpired = !Number.isNaN(expiresTs) ? expiresTs < now : false;
                const claimed = Number(order.claimedRedemptions ?? 0);
                const max = Number(order.maxRedemptions ?? 0);
                const orderRedemptions = redemptionsByOrder.get(order.id) ?? [];
                const isActive = Boolean(order.isActive) && !isExpired;

                const searchLower = ticketSearch.trim().toLowerCase();
                const filteredRedemptions = searchLower
                  ? orderRedemptions.filter((r) => {
                      const name = `${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""}`.toLowerCase();
                      const email = (r.user?.email ?? "").toLowerCase();
                      return name.includes(searchLower) || email.includes(searchLower);
                    })
                  : orderRedemptions;

                if (searchLower && filteredRedemptions.length === 0 && !order.title.toLowerCase().includes(searchLower)) {
                  return null;
                }

                return (
                  <div key={order.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{order.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{order.description}</p>
                      </div>
                      <Badge className={
                        isActive
                          ? "shrink-0 bg-green-500/15 text-green-500 hover:bg-green-500/15"
                          : "shrink-0 bg-muted text-muted-foreground hover:bg-muted"
                      }>
                        {isActive ? "Aktiv" : isExpired ? "Utgången" : "Inaktiv"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>Pris: <span className="text-foreground font-medium">{order.price} kr</span></span>
                      {max > 0 && <span>Inlösta: <span className="text-foreground font-medium">{claimed} / {max}</span></span>}
                      {max > 0 && <span>Kvar: <span className="text-foreground font-medium">{Math.max(max - claimed, 0)}</span></span>}
                    </div>

                    {filteredRedemptions.length > 0 && (
                      <div className="mt-3 rounded-md border border-border p-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Inlösta ({searchLower ? `${filteredRedemptions.length} av ${orderRedemptions.length}` : orderRedemptions.length})
                        </p>
                        <div className="max-h-60 space-y-2 overflow-auto pr-1">
                          {filteredRedemptions.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {r.user?.firstName && r.user?.lastName
                                    ? `${r.user.firstName} ${r.user.lastName}`
                                    : r.user?.email ?? "Okänd"}
                                </p>
                                {r.user?.firstName && (
                                  <p className="text-xs text-muted-foreground truncate">{r.user.email}</p>
                                )}
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {new Date(r.redeemedAt).toLocaleString("sv-SE")}
                                </p>
                              </div>
                              <Badge className="shrink-0 bg-blue-500/15 text-blue-400 hover:bg-blue-500/15">
                                Inlöst
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {orderRedemptions.length === 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">Inga inlösningar ännu.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
