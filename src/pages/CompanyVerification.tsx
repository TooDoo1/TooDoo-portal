import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, QrCode, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listOrders, validateClaim, type Order } from "@/lib/api";
import { toast } from "sonner";

function createCouponCode(offerId: string, index: number) {
  const normalizedId = offerId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const seq = String(index + 1).padStart(4, "0");
  const seed = offerId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const checksum = ((index + 1) * 97 + seed).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `TD-${normalizedId}-${seq}-${checksum}`;
}

export default function CompanyVerification() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listOrders();
        setOrders(data);
      } catch {
        setOrders([]);
      }
    };

    void load();
  }, []);

  const activeCoupons = useMemo(() => {
    const now = Date.now();
    return orders.filter((offer) => new Date(offer.validTo).getTime() > now);
  }, [orders]);

  const offersWithCodes = useMemo(
    () =>
      activeCoupons.map((offer) => ({
        ...offer,
        title: offer.title,
        claimsClaimed: 0,
        claimsUsed: 0,
        claimsTotal: Number(offer.maxRedemptions ?? 0),
        couponCodes: Array.from({ length: Number(offer.maxRedemptions ?? 0) }, (_, index) => createCouponCode(offer.id, index)),
      })),
    [activeCoupons]
  );

  const allCouponCodes = useMemo(
    () => new Set(offersWithCodes.flatMap((offer) => offer.couponCodes)),
    [offersWithCodes]
  );

  const normalizedCodeSearch = codeSearch.trim().toUpperCase();

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
      toast.success(title ? `Kod verifierad for ${title}.` : `Kod ${code} verifierad.`);
      setManualCode("");
    } catch (error) {
      if (!allCouponCodes.has(code)) {
        toast.error("Kupongkod hittades inte bland aktiva kuponger.");
      } else {
        const message = error instanceof Error ? error.message : "Verifiering misslyckades.";
        toast.error(message);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

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
              placeholder="Exempel: TOO-2026-AB12"
              className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
            />
            <Button className="h-11 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleManualVerify} disabled={verifyLoading}>
              {verifyLoading ? "Verifierar..." : "Verifiera kod"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Aktiva kuponger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offersWithCodes.map((offer) => (
            (() => {
              const visibleCodes = normalizedCodeSearch
                ? offer.couponCodes.filter((code) => code.includes(normalizedCodeSearch))
                : offer.couponCodes;

              if (normalizedCodeSearch && visibleCodes.length === 0) {
                return null;
              }

              return (
                <div
                  key={offer.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{offer.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Unika kupongkoder: {offer.couponCodes.length}</p>
                </div>
                <Badge className="bg-success/15 text-success hover:bg-success/15">Aktiv</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <p>Claimade: {offer.claimsClaimed}</p>
                <p>Använda: {offer.claimsUsed}</p>
                <p>Kvar: {Math.max(offer.claimsTotal - offer.claimsClaimed, 0)}</p>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Verifieringsklar för aktiv kampanj
              </div>

              <div className="mt-3 rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Kupongkoder</p>
                <Input
                  id="codeSearch"
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  placeholder="Sök kod..."
                  className="mb-2 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
                <div className="max-h-32 space-y-1 overflow-auto pr-1 text-xs text-foreground">
                  {visibleCodes.map((code) => (
                    <div key={code} className="rounded-sm bg-muted/40 px-2 py-1 font-mono">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>
              );
            })()
          ))}

          {normalizedCodeSearch && !offersWithCodes.some((offer) => offer.couponCodes.some((code) => code.includes(normalizedCodeSearch))) && (
            <p className="text-sm text-muted-foreground">Inga kupongkoder matchade din sökning.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
