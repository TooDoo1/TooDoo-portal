import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listImages, resolveImageUrl, type ImageGalleryItem } from "@/lib/api";
import { toast } from "sonner";
import { Search, Loader } from "lucide-react";

interface ImageGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (image: ImageGalleryItem) => void;
  categoryName?: string;
}

type GalleryEntry = {
  key: string;
  url: string;
  source: "default" | "uploaded";
  image: ImageGalleryItem;
};

export function ImageGalleryDialog({
  open,
  onOpenChange,
  onSelect,
  categoryName,
}: ImageGalleryDialogProps) {
  const [businessImages, setBusinessImages] = useState<ImageGalleryItem[]>([]);
  const [defaultImages, setDefaultImages] = useState<ImageGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageGalleryItem | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    const loadImages = async () => {
      setLoading(true);
      try {
        const result = await listImages();
        setBusinessImages(result.businessImages ?? []);
        setDefaultImages(result.defaultImages ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte ladda galleriet.";
        toast.error(message);
        setBusinessImages([]);
        setDefaultImages([]);
      } finally {
        setLoading(false);
      }
    };

    void loadImages();
  }, [open]);

  const managerEntries: GalleryEntry[] = businessImages
    .map((img) => {
      const rawUrl = img.publicUrl || img.originalUrl || "";
      if (!rawUrl) return null;
      const url = resolveImageUrl(rawUrl);
      return {
        key: `uploaded:${img.id}`,
        url,
        source: "uploaded" as const,
        image: img,
      };
    })
    .filter((entry): entry is GalleryEntry => Boolean(entry));

  const defaultEntries: GalleryEntry[] = defaultImages
    .map((img) => {
      const rawUrl = img.publicUrl || img.originalUrl || "";
      if (!rawUrl) return null;
      return {
        key: `default:${img.id}`,
        url: resolveImageUrl(rawUrl),
        source: "default" as const,
        image: img,
      };
    })
    .filter((entry): entry is GalleryEntry => Boolean(entry));

  const filterBySearch = (entry: GalleryEntry) => {
    const matchesSearch =
      !search ||
      entry.url.toLowerCase().includes(search.toLowerCase()) ||
      (entry.source === "default" && "default".includes(search.toLowerCase())) ||
      (entry.source === "uploaded" && "uppladdad".includes(search.toLowerCase()));
    return matchesSearch;
  };

  const filteredUploadedEntries = managerEntries.filter(filterBySearch);
  const uploadedUrls = new Set(filteredUploadedEntries.map((entry) => entry.url));
  const filteredDefaultEntries = defaultEntries
    .filter((entry) => !uploadedUrls.has(entry.url))
    .filter(filterBySearch);

  const totalEntries = managerEntries.length + defaultEntries.length;
  const totalFilteredEntries = filteredUploadedEntries.length + filteredDefaultEntries.length;

  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      setSelectedImage(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Välj bild från galleriet</DialogTitle>
          <DialogDescription>
            Välj en bild från de förinstallerade bilderna
            {categoryName && ` för kategori: ${categoryName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök bilder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Gallery grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalFilteredEntries === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                {totalEntries === 0 ? "Inga bilder tillgängliga" : "Inga bilder matchade sökningen"}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredUploadedEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Uppladdade bilder</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredUploadedEntries.map((entry) => {
                        const isSvg = entry.url.toLowerCase().endsWith(".svg");
                        const isFailed = failedImages.has(entry.url);
                        return (
                          <div
                            key={entry.key}
                            onClick={() => setSelectedImage(entry.image)}
                            className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                              selectedImage?.id === entry.image.id
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                          >
                            <div className="aspect-video bg-muted flex items-center justify-center">
                              {isFailed ? (
                                <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground bg-destructive/10">
                                  <span>Bild kunde inte laddas</span>
                                </div>
                              ) : (
                                <img
                                  src={entry.url}
                                  alt={`Gallery image ${entry.key}`}
                                  className={`h-full w-full ${isSvg ? "object-contain" : "object-cover"}`}
                                  onError={(e) => {
                                    console.log("Image failed to load:", entry.url);
                                    setFailedImages((prev) => new Set(prev).add(entry.url));
                                  }}
                                />
                              )}
                            </div>
                            <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                              Uppladdad
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredDefaultEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Standardbilder</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredDefaultEntries.map((entry) => {
                        const isSvg = entry.url.toLowerCase().endsWith(".svg");
                        const isFailed = failedImages.has(entry.url);
                        return (
                          <div
                            key={entry.key}
                            onClick={() => setSelectedImage(entry.image)}
                            className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                              selectedImage?.id === entry.image.id
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                          >
                            <div className="aspect-video bg-muted flex items-center justify-center">
                              {isFailed ? (
                                <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground bg-destructive/10">
                                  <span>Bild kunde inte laddas</span>
                                </div>
                              ) : (
                                <img
                                  src={entry.url}
                                  alt={`Gallery image ${entry.key}`}
                                  className={`h-full w-full ${isSvg ? "object-contain" : "object-cover"}`}
                                  onError={(e) => {
                                    console.log("Image failed to load:", entry.url);
                                    setFailedImages((prev) => new Set(prev).add(entry.url));
                                  }}
                                />
                              )}
                            </div>
                            <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                              Standard
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedImage(null);
              onOpenChange(false);
            }}
          >
            Avbryt
          </Button>
          <Button
            disabled={!selectedImage}
            onClick={handleSelect}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Välj bild
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
