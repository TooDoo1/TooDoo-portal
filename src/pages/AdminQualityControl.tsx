import { useEffect, useMemo, useState } from "react";
import { Check, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessAppPreviewCard } from "@/components/BusinessAppPreviewCard";
import { toast } from "sonner";
import { refreshAdminPendingCounts } from "@/lib/adminPendingCounts";
import { listBusinessImageRequests, reviewBusinessImageRequest, getBusinessById, resolveImageUrl, type BusinessImageRequest, type Business } from "@/lib/api";

interface RequestWithBusiness extends BusinessImageRequest {
  business?: Business;
}

function getBusinessCategoryName(business?: Business) {
  return business?.category?.name?.trim() || business?.categoryName?.trim() || business?.categoryId || "Kategori saknas";
}

function AdminImagePreview({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedSrc = resolveImageUrl(src);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || imageFailed) {
    return <div className={className} />;
  }

  return <img src={resolvedSrc} alt={alt} className={className} onError={() => setImageFailed(true)} />;
}

export default function AdminQualityControl() {
  const [requests, setRequests] = useState<RequestWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await listBusinessImageRequests();
      const requestsWithBusiness: RequestWithBusiness[] = [];
      
      for (const request of data || []) {
        try {
          if (request.businessId) {
            const business = await getBusinessById(request.businessId);
            requestsWithBusiness.push({ ...request, business });
          } else {
            requestsWithBusiness.push(request);
          }
        } catch {
          requestsWithBusiness.push(request);
        }
      }
      
      setRequests(requestsWithBusiness);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ladda bildförfrågningar.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: string, status: "APPROVED" | "DECLINED") => {
    if (!requestId) return;

    const pending = new Set(pendingRequests);
    pending.add(requestId);
    setPendingRequests(pending);
    setReviewingId(requestId);

    try {
      await reviewBusinessImageRequest(requestId, status);
      toast.success(status === "APPROVED" ? "Bild godkänd" : "Bild avvisad");

      // Remove from list after review
      setRequests(requests.filter(r => r.id !== requestId));
      refreshAdminPendingCounts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte granska bild.";
      toast.error(message);
    } finally {
      const next = new Set(pending);
      next.delete(requestId);
      setPendingRequests(next);
      setReviewingId(null);
    }
  };

  const pendingReviews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const sorted = requests
      .filter((request) => request.status === "PENDING" || !request.status)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });

    if (!term) return sorted;

    return sorted.filter((request) => {
      const businessName = request.business?.name?.toLowerCase() || "";
      const businessId = (request.businessId || "").toLowerCase();
      return businessName.includes(term) || businessId.includes(term);
    });
  }, [requests, searchTerm]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">Kvalitets kontroll</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Granska och godkänn eller avvisa näringsidkares bildförfrågningar.
        </p>

        <div className="max-w-xl">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Sök på företagsnamn eller Företags-ID"
            className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : pendingReviews.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12">
              <div className="text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-4 text-muted-foreground">
                  {searchTerm.trim() ? "Inga matchande bildförfrågningar" : "Inga väntande bildförfrågningar"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingReviews.map((request) => (
              <Card key={request.id} className="bg-card border-border overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-background/30 px-5 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {request.business?.name || "Bildförfrågan"}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border bg-background px-2 py-1">
                        {request.imageSourceType === "UPLOADED" ? "Uppladdad" : "Länk"}
                      </span>
                      {request.createdAt && (
                        <span className="rounded-full border border-border bg-background px-2 py-1">
                          {new Date(request.createdAt).toLocaleString("sv-SE")}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Skickad bild</p>
                        <div className="overflow-hidden rounded-2xl border border-border bg-background/40">
                          {request.imageUrl ? (
                            <AdminImagePreview src={request.imageUrl} alt="Submitted image" className="h-[240px] w-full object-contain" />
                          ) : (
                            <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
                              Ingen bild tillgänglig
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {request.businessId && (
                          <div className="rounded-xl border border-border/70 bg-background/30 p-2.5">
                            <p className="text-xs text-muted-foreground">Företags-ID</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-foreground">{request.businessId}</p>
                          </div>
                        )}

                        <div className="rounded-xl border border-border/70 bg-background/30 p-2.5">
                          <p className="text-xs text-muted-foreground">Kategori</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                            {getBusinessCategoryName(request.business)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <BusinessAppPreviewCard
                        companyName={request.business?.name || "Företagets namn"}
                        categoryName={getBusinessCategoryName(request.business)}
                        imageUrl={request.imageUrl ? resolveImageUrl(request.imageUrl) : undefined}
                        compact
                        hideCategory
                      />

                      <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Granskning</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Kontrollera att bilden passar företagets profil innan du godkänner den.
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <Button
                            onClick={() => handleReview(request.id || "", "APPROVED")}
                            disabled={reviewingId === request.id || pendingRequests.has(request.id || "")}
                            className="w-full bg-success text-success-foreground hover:bg-success/90"
                          >
                            {reviewingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            <span className="ml-2">Godkänn</span>
                          </Button>
                          <Button
                            onClick={() => handleReview(request.id || "", "DECLINED")}
                            disabled={reviewingId === request.id || pendingRequests.has(request.id || "")}
                            variant="outline"
                            className="w-full border-destructive text-destructive hover:bg-destructive/10"
                          >
                            {reviewingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span className="ml-2">Avvisa</span>
                          </Button>
                        </div>

                        {request.createdAt && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Skickad {new Date(request.createdAt).toLocaleString("sv-SE")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
