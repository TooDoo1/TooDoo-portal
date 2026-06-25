import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Link2, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BusinessImageAppPreview } from "@/components/BusinessImageAppPreview";
import { getBusinessById, resolveBusinessId, resolveImageUrl, submitBusinessImageRequest, type Business } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/useRealtime";

type RequestMode = "upload" | "url";

function getBusinessImageUrl(business: Business) {
  if (typeof business.imageUrl === "string" && business.imageUrl.trim()) return business.imageUrl.trim();
  const assetUrl = business.imageAsset?.publicUrl ?? business.imageAsset?.url;
  if (typeof assetUrl === "string" && assetUrl.trim()) return assetUrl.trim();
  const imageUrl = (business as unknown as { image?: { publicUrl?: unknown; url?: unknown } }).image?.publicUrl ??
    (business as unknown as { image?: { publicUrl?: unknown; url?: unknown } }).image?.url;
  return typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : "";
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

function resolvePreviewUrl(raw: string, mode: RequestMode): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (mode === "upload") {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return resolveImageUrl(trimmed);
  }

  try {
    return normalizeExternalUrl(trimmed);
  } catch {
    return resolveImageUrl(trimmed);
  }
}

export default function CompanyImageRequest() {
  const [mode, setMode] = useState<RequestMode>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const loadBusiness = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoadingBusiness(true);
    try {
      const businessId = await resolveBusinessId();
      if (!businessId) throw new Error("Saknar businessId. Logga in igen.");
      const loadedBusiness = await getBusinessById(businessId);
      setBusiness(loadedBusiness);
    } catch (error) {
      setBusiness(null);
      if (!options?.silent) {
        const message = error instanceof Error ? error.message : "Kunde inte läsa företagsinformationen.";
        toast.error(message);
      }
    } finally {
      if (!options?.silent) setIsLoadingBusiness(false);
    }
  }, []);

  useEffect(() => {
    void loadBusiness();
  }, [loadBusiness]);

  useRealtime((event) => {
    if (event.type === "business.updated" || event.type === "image-gallery.updated") {
      void loadBusiness({ silent: true });
    }
  });

  const previewUrl = mode === "upload" ? filePreviewUrl : imageUrl.trim();
  const currentBusinessImageUrl = business ? resolveImageUrl(getBusinessImageUrl(business)) : "";
  const previewImageUrl = previewUrl ? resolvePreviewUrl(previewUrl, mode) : currentBusinessImageUrl;

  const resetForm = () => {
    setImageFile(null);
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSubmitting(true);
    try {
      if (mode === "upload") {
        if (!imageFile) {
          toast.error("Välj en bildfil först.");
          return;
        }

        await submitBusinessImageRequest({ imageSourceType: "UPLOADED", imageFile });
      } else {
        let normalizedUrl: string;
        try {
          normalizedUrl = normalizeExternalUrl(imageUrl);
        } catch {
          toast.error("Bildlänken måste vara en giltig http- eller https-URL.");
          return;
        }

        await submitBusinessImageRequest({ imageSourceType: "EXTERNAL_URL", imageUrl: normalizedUrl });
      }

      toast.success("Bildförfrågan skickad till admin för granskning.");
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skicka bildförfrågan.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bildförfrågan</h1>
        <p className="mt-1 text-muted-foreground">
          Skicka in en ny företagsbild till admin för granskning. När den godkänns läggs den till i ert galleri.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ImagePlus className="h-5 w-5 text-accent" />
              Skicka bild
            </CardTitle>
            <CardDescription>
              Välj om du vill ladda upp en fil eller skicka en länk till en bild.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRequest} className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("upload");
                    setImageUrl("");
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    mode === "upload"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  )}
                >
                  <Upload className="mb-2 h-5 w-5" />
                  <div className="text-sm font-semibold">Ladda upp bild</div>
                  <div className="mt-1 text-xs">Välj en bildfil från datorn.</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("url");
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    mode === "url"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  )}
                >
                  <Link2 className="mb-2 h-5 w-5" />
                  <div className="text-sm font-semibold">Skicka bildlänk</div>
                  <div className="mt-1 text-xs">Använd en extern bild-URL.</div>
                </button>
              </div>

              {mode === "upload" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bildfil</label>
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
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
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setImageFile(file);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bildlänk</label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://example.com/image.jpg"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                  />
                </div>
              )}

              <div className="rounded-xl border border-border bg-background/30 p-3 text-xs text-muted-foreground">
                Bilden syns inte direkt i appen. Admin behöver först godkänna förfrågan.
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Rensa
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingBusiness} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Skickar..." : "Skicka för granskning"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:sticky xl:top-6 xl:self-start">
          <CardHeader>
            <CardTitle className="text-foreground">Förhandsvisning</CardTitle>
            <CardDescription>Så här kan bilden se ut i appen.</CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessImageAppPreview
              companyName={business?.name || "Ditt företag"}
              categoryName={business?.category?.name ?? business?.categoryName ?? ""}
              imageUrl={previewImageUrl || undefined}
              address={business?.address}
              city={business?.city}
              phone={business?.contactPhone}
              aboutText={business?.description}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
