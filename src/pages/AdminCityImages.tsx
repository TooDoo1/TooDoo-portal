import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Link2, MapPinned, Plus, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCityImage,
  deleteCityImage,
  getAdminImportOptions,
  listCityImages,
  resolveImageUrl,
  type CityImage,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function previewUrl(url: string | null | undefined): string {
  const resolved = resolveImageUrl(url);
  if (!resolved) return "";
  try {
    const parsed = new URL(resolved);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("w", "640");
      parsed.searchParams.set("q", "50");
      return parsed.toString();
    }
  } catch {
    return resolved;
  }
  return resolved;
}

export default function AdminCityImages() {
  const [city, setCity] = useState("");
  const [activeCity, setActiveCity] = useState("");
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const [images, setImages] = useState<CityImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CityImage | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    void getAdminImportOptions()
      .then((options) => setKnownCities(options.knownCities ?? []))
      .catch(() => setKnownCities([]));
  }, []);

  async function loadCity(nextCity: string) {
    const trimmed = nextCity.trim();
    if (!trimmed) {
      toast.error("Ange en stad");
      return;
    }
    setLoading(true);
    setActiveCity(trimmed);
    try {
      const response = await listCityImages(trimmed);
      setImages(response.images ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ladda stadbilder.";
      toast.error(message);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget || removing) return;
    setRemoving(true);
    try {
      await deleteCityImage(removeTarget.id);
      setImages((current) => current.filter((image) => image.id !== removeTarget.id));
      toast.success("Stadbilden togs bort");
      setRemoveTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort bilden.";
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  }

  const sortedKnownCities = useMemo(
    () => [...knownCities].sort((a, b) => a.localeCompare(b, "sv")),
    [knownCities],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Stadbilder</h1>
        <p className="mt-1 text-muted-foreground">
          Bilder av städer till appen. Separata från bildbanken — företag kan inte välja dem.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="city-images-city">Stad</Label>
            <Input
              id="city-images-city"
              list="city-images-known-cities"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadCity(city);
                }
              }}
              placeholder="t.ex. Malmö"
              className="border-border bg-background"
            />
            <datalist id="city-images-known-cities">
              {sortedKnownCities.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <Button
            type="button"
            onClick={() => void loadCity(city)}
            disabled={loading || !city.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? "Laddar..." : "Visa bilder"}
          </Button>
        </CardContent>
      </Card>

      {activeCity ? (
        <>
          <AddCityImageForm
            city={activeCity}
            onAdded={(image) => {
              setImages((current) => {
                const without = current.filter((row) => row.id !== image.id);
                return [...without, image].sort((a, b) => {
                  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
                });
              });
            }}
          />

          <p className="text-sm text-muted-foreground">
            {loading
              ? `Laddar bilder för ${activeCity}...`
              : `${images.length} bilder för ${activeCity}`}
          </p>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Card key={index} className="border-border bg-card">
                  <CardContent className="p-3">
                    <div className="aspect-[16/10] animate-pulse rounded-md bg-muted/60" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : images.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPinned className="mb-4 h-12 w-12 opacity-40" />
                <p className="text-lg font-medium">Inga bilder för den här staden än</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {images.map((image) => (
                <CityImageCard key={image.id} image={image} onRemove={() => setRemoveTarget(image)} />
              ))}
            </div>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
        title="Ta bort stadbild"
        description="Bilden tas bort från staden och syns inte längre i appen."
        confirmLabel={removing ? "Tar bort..." : "Ta bort"}
        onConfirm={() => void handleRemove()}
        variant="destructive"
      />
    </div>
  );
}

function AddCityImageForm({
  city,
  onAdded,
}: {
  city: string;
  onAdded: (image: CityImage) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const filePreviewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const canSave =
    !saving &&
    ((imageMode === "upload" && Boolean(imageFile)) ||
      (imageMode === "url" && imageUrl.trim().startsWith("https://")));

  async function handleAdd() {
    if (!canSave) return;
    setSaving(true);
    try {
      const created =
        imageMode === "upload"
          ? await addCityImage({
              city,
              imageSourceType: "UPLOADED",
              imageFile: imageFile ?? undefined,
              ...(description.trim() ? { description: description.trim() } : {}),
            })
          : await addCityImage({
              city,
              imageSourceType: "EXTERNAL_URL",
              imageUrl: imageUrl.trim(),
              ...(description.trim() ? { description: description.trim() } : {}),
            });
      onAdded(created);
      setImageFile(null);
      setImageUrl("");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Stadbilden lades till");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte lägga till bilden.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lägg till bild för {city}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ladda upp en fil eller klistra in en https-adress.
          </p>
        </div>

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
            <div className="mt-1 text-xs">Sparas i molnlagringen.</div>
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
            <Label>Bildfil</Label>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center">
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                Välj fil
              </Button>
              <span className="text-xs text-muted-foreground">
                {imageFile ? imageFile.name : "Ingen fil vald"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt=""
                className="h-32 w-48 rounded-lg border border-border object-cover"
              />
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="city-image-url">Bildadress</Label>
            <Input
              id="city-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              disabled={saving}
              placeholder="https://..."
              className="border-border bg-background"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="city-image-description">Beskrivning (valfritt)</Label>
          <Input
            id="city-image-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
            placeholder="Vad bilden visar"
            className="border-border bg-background"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!canSave}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Lägger till..." : "Lägg till"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CityImageCard({ image, onRemove }: { image: CityImage; onRemove: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = previewUrl(image.publicUrl);
  const missing = !src || failed;

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="relative aspect-[16/10] bg-muted">
        {missing ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-60" />
            <span className="text-xs">Bild saknas</span>
          </div>
        ) : (
          <img
            src={src}
            alt={image.description || image.city}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={onRemove}
          aria-label="Ta bort bild"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className="space-y-1 p-3">
        <p className="text-xs font-medium text-accent">{image.city}</p>
        <p className="truncate text-sm font-semibold text-foreground">
          {image.sourceType === "UPLOADED" ? "Uppladdad" : "Extern länk"}
        </p>
        {image.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground" title={image.description}>
            {image.description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
