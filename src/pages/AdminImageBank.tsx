import { useEffect, useMemo, useState } from "react";
import { ImageOff, Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listCategories,
  listDefaultImages,
  resolveImageUrl,
  type Category,
  type ImageGalleryItem,
} from "@/lib/api";
import { toast } from "sonner";

const ALL = "all";

function isPendingImage(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("pending://"));
}

function previewUrl(url: string | null | undefined): string {
  const resolved = resolveImageUrl(url);
  if (!resolved || isPendingImage(resolved)) return "";
  try {
    const parsed = new URL(resolved);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("w", "480");
      parsed.searchParams.set("q", "45");
      return parsed.toString();
    }
  } catch {
    return resolved;
  }
  return resolved;
}

function categoryName(image: ImageGalleryItem): string {
  return image.category?.name?.trim() || "Utan kategori";
}

function themeLabel(image: ImageGalleryItem): string {
  return image.themeId?.trim() || "Utan tema";
}

export default function AdminImageBank() {
  const [images, setImages] = useState<ImageGalleryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState(ALL);
  const [themeId, setThemeId] = useState(ALL);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [imageRows, categoryRows] = await Promise.all([
          listDefaultImages(),
          listCategories(),
        ]);
        setImages(imageRows.defaultImages ?? []);
        setCategories(categoryRows);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte ladda bildbanken.";
        toast.error(message);
        setImages([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const countsByCategoryId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const image of images) {
      const id = image.categoryId ?? image.category?.id ?? "";
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [images]);

  const themes = useMemo(() => {
    const inCategory = categoryId === ALL
      ? images
      : images.filter((image) => (image.categoryId ?? image.category?.id) === categoryId);
    const unique = [...new Set(inCategory.map((image) => themeLabel(image)))];
    unique.sort((a, b) => a.localeCompare(b, "sv"));
    return unique;
  }, [images, categoryId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return images.filter((image) => {
      const imageCategoryId = image.categoryId ?? image.category?.id ?? "";
      if (categoryId !== ALL && imageCategoryId !== categoryId) return false;
      if (themeId !== ALL && themeLabel(image) !== themeId) return false;
      if (!query) return true;
      const haystack = [categoryName(image), themeLabel(image), image.description ?? ""].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [images, categoryId, themeId, search]);

  const themeCount = new Set(filtered.map((image) => themeLabel(image))).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Bildbank</h1>
        <p className="text-muted-foreground mt-1">
          Alla standardbilder, grupperade så att fel tema eller fel kategori syns direkt.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            setThemeId(ALL);
          }}
        >
          <SelectTrigger className="w-full lg:w-[240px] bg-card border-border text-foreground">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value={ALL}>Alla kategorier ({images.length})</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({countsByCategoryId.get(category.id) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={themeId} onValueChange={setThemeId}>
          <SelectTrigger className="w-full lg:w-[240px] bg-card border-border text-foreground">
            <SelectValue placeholder="Tema" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value={ALL}>Alla teman</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>{theme}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Sök tema eller beskrivning..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {loading
          ? "Laddar bildbanken..."
          : `Visar ${filtered.length} bilder i ${themeCount} teman`}
      </p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-3">
                <div className="aspect-[4/3] animate-pulse rounded-md bg-muted/60" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Images className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Inga bilder i det här urvalet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((image) => (
            <ImageBankCard key={image.id} image={image} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageBankCard({ image }: { image: ImageGalleryItem }) {
  const [failed, setFailed] = useState(false);
  const src = previewUrl(image.publicUrl);
  const missing = !src || failed || isPendingImage(image.publicUrl);
  const category = categoryName(image);
  const theme = themeLabel(image);

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="relative aspect-[4/3] bg-muted">
        {missing ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-60" />
            <span className="text-xs">Bild saknas</span>
          </div>
        ) : (
          <img
            src={src}
            alt={image.description || theme}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <CardContent className="space-y-1 p-3">
        <p className="text-xs font-medium text-accent">{category}</p>
        <p className="truncate text-sm font-semibold text-foreground" title={theme}>{theme}</p>
        {image.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground" title={image.description}>{image.description}</p>
        ) : (
          <p className="text-xs text-warning">Beskrivning saknas</p>
        )}
        {typeof image.themeSlot === "number" ? (
          <p className="text-[11px] text-muted-foreground">Plats {image.themeSlot + 1}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
