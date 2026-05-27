import { useEffect, useState } from "react";

export function BusinessAppPreviewCard({
  companyName,
  categoryName,
  imageUrl,
  compact = false,
  hideCategory = false,
}: {
  companyName: string;
  categoryName: string;
  imageUrl?: string;
  compact?: boolean;
  hideCategory?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div className={compact ? "" : "mt-4"}>
      <div className={`mx-auto w-full ${compact ? "max-w-[320px] rounded-[26px]" : "max-w-[420px] rounded-[34px]"} border border-border bg-gradient-to-b from-slate-950/40 to-slate-900/10 ${compact ? "p-3" : "p-4"} shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)]`}>
        <div className={`rounded-[${compact ? "22px" : "28px"}] bg-background/80 ${compact ? "p-3" : "p-4"}`}>
          <div className={compact ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>Förhandsvisning (app)</div>
          <div className={compact ? "mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" : "mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"}>
            <div className={`relative ${compact ? "h-20" : "h-28"} bg-muted`}>
              {imageUrl && !imageFailed ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                Erbjudande
              </div>
            </div>
            <div className={compact ? "p-3" : "p-4"}>
              <div className={compact ? "text-base font-bold text-foreground" : "text-lg font-bold text-foreground"}>{companyName}</div>
              {!hideCategory ? (
                <div className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>{categoryName || "Kategori"}</div>
              ) : null}
            </div>
          </div>
          <div className={compact ? "mt-2 text-[11px] text-muted-foreground" : "mt-2 text-xs text-muted-foreground"}>
            Bilden beskärs automatiskt i appen (cover).
          </div>
        </div>
      </div>
    </div>
  );
}