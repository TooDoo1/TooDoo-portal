import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const HERO_OVERLAY =
  "linear-gradient(180deg, transparent 0%, transparent 45%, hsl(var(--background) / 0.4) 70%, hsl(var(--background) / 0.9) 88%, hsl(var(--background)) 100%)";

function ListingPreviewCard({
  companyName,
  subtitle,
  imageUrl,
  compact,
  large,
  distanceLabel,
  showDistance,
}: {
  companyName: string;
  subtitle: string;
  imageUrl?: string;
  compact?: boolean;
  large?: boolean;
  distanceLabel: string;
  showDistance: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[22px] bg-muted",
        compact ? "h-[200px]" : large ? "aspect-[4/3] min-h-[280px]" : "h-[300px]",
      )}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-card to-background" />
      )}

      <div className="pointer-events-none absolute inset-0" style={{ background: HERO_OVERLAY }} />

      {showDistance ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-[2px]">
          {distanceLabel}
        </div>
      ) : null}

      <div
        aria-hidden
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-[2px]"
      >
        <Heart className="h-4 w-4" strokeWidth={2} />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        <p
          className={cn(
            "truncate font-bold uppercase tracking-tight text-white",
            compact ? "text-sm" : "text-[15px]",
          )}
        >
          {companyName}
        </p>
        {subtitle ? (
          <p className={cn("mt-0.5 truncate text-white/80", compact ? "text-xs" : "text-sm")}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BusinessAppPreviewCard({
  companyName,
  categoryName,
  imageUrl,
  compact = false,
  large = false,
  frameless = false,
  hideCategory = false,
  distanceLabel = "0.4 km",
  showDistance = true,
}: {
  companyName: string;
  categoryName: string;
  imageUrl?: string;
  compact?: boolean;
  large?: boolean;
  frameless?: boolean;
  hideCategory?: boolean;
  distanceLabel?: string;
  showDistance?: boolean;
}) {
  const subtitle = hideCategory ? "" : categoryName || "Kategori";

  const card = (
    <ListingPreviewCard
      companyName={companyName}
      subtitle={subtitle}
      imageUrl={imageUrl}
      compact={compact}
      large={large}
      distanceLabel={distanceLabel}
      showDistance={showDistance}
    />
  );

  if (frameless) {
    return <div className="w-full">{card}</div>;
  }

  if (compact) {
    return <div className="mx-auto w-full max-w-[320px]">{card}</div>;
  }

  return (
    <div className="mt-4">
      <div className="mx-auto w-full max-w-[420px] rounded-[34px] border border-border bg-gradient-to-b from-slate-950/40 to-slate-900/10 p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)]">
        <div className="rounded-[28px] bg-background/80 p-4">
          <div className="text-sm font-semibold text-foreground">Förhandsvisning (app)</div>
          <div className="mt-3">{card}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Bilden beskärs automatiskt i appen (cover).
          </div>
        </div>
      </div>
    </div>
  );
}
