import { useState, type CSSProperties } from "react";
import { ChevronLeft, Globe, Heart, MapPin } from "lucide-react";
import { resolveImageUrl } from "@/lib/api";

export type OfferPreviewCardProps = {
  businessName: string;
  address?: string;
  city?: string;
  phone?: string;
  aboutText?: string;
  offerText: string;
  priceKr: number | string;
  originalPriceKr?: number | string;
  claimedCount?: number;
  totalCount?: number;
  countdownText?: string;
  heroImageUrl?: string;
  imageUrl?: string;
  ctaLabel?: string;
};

const siteBg = "hsl(var(--background))";
const siteCard = "hsl(var(--card))";
const siteBorder = "hsl(var(--border))";
const siteFg = "hsl(var(--foreground))";
const siteMuted = "hsl(var(--muted-foreground))";
const siteAccent = "hsl(var(--accent))";
const sitePrimary = "hsl(var(--primary))";

const previewStyles: Record<string, CSSProperties> = {
  page: {
    background: "transparent",
    padding: 0,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    color: siteFg,
  },

  phoneFrame: {
    width: 390,
    borderRadius: 32,
    overflow: "hidden",
    border: `1px solid ${siteBorder}`,
    background: siteBg,
    boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
  },

  hero: {
    position: "relative",
    height: 220,
    background: siteBg,
    overflow: "hidden",
  },

  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  heroFallback: {
    width: "100%",
    height: "100%",
    background: siteBg,
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, transparent 0%, transparent 50%, hsl(var(--background) / 0.35) 72%, hsl(var(--background) / 0.88) 90%, hsl(var(--background)) 100%)",
    pointerEvents: "none",
  },

  statusBar: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 22px",
    fontSize: 13,
    fontWeight: 600,
    color: siteFg,
    zIndex: 2,
    pointerEvents: "none",
  },

  statusIcons: {
    letterSpacing: 2,
    fontSize: 10,
    opacity: 0.85,
  },

  heroNavBtn: {
    position: "absolute",
    top: 44,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "0",
    background: "rgba(0,0,0,0.45)",
    color: siteFg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
    zIndex: 2,
  },

  heroNavBtnRight: {
    left: "auto",
    right: 16,
  },

  content: {
    padding: "18px 20px 24px",
    background: siteBg,
  },

  title: {
    fontSize: 32,
    lineHeight: "36px",
    fontWeight: 700,
    letterSpacing: -0.5,
    marginBottom: 10,
  },

  contactLine: {
    fontSize: 15,
    lineHeight: "22px",
    color: siteFg,
    marginBottom: 4,
  },

  contactLabel: {
    fontWeight: 600,
  },

  phoneLink: {
    color: siteAccent,
    fontWeight: 600,
  },

  pillsRow: {
    display: "flex",
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },

  pill: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    border: "0",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    fontSize: 15,
    cursor: "default",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  card: {
    borderRadius: 22,
    border: `1px solid ${siteBorder}`,
    background: siteCard,
    boxShadow: "none",
    padding: 14,
  },

  cardTop: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },

  thumbWrap: {
    position: "relative",
    width: 108,
    height: 108,
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.10)",
    flex: "0 0 auto",
  },

  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  thumbFallback: {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.03) 100%)",
  },

  countdownChip: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    zIndex: 2,
  },

  offerBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },

  offerText: {
    fontSize: 16,
    fontWeight: 600,
    color: siteFg,
    lineHeight: "22px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    marginBottom: 8,
  },

  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },

  price: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: -0.3,
    lineHeight: "20px",
    color: siteFg,
  },

  originalPrice: {
    fontSize: 16,
    fontWeight: 600,
    color: siteAccent,
    textDecoration: "line-through",
    lineHeight: "20px",
  },

  meta: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: 600,
    color: siteMuted,
  },

  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    background: "hsl(var(--muted))",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: sitePrimary,
  },

  cta: {
    marginTop: 14,
    height: 44,
    width: "100%",
    borderRadius: 999,
    border: "0",
    background: sitePrimary,
    color: "hsl(var(--primary-foreground))",
    fontSize: 17,
    fontWeight: 600,
    cursor: "default",
    boxShadow: "none",
  },

  aboutCard: {
    marginTop: 16,
    borderRadius: 22,
    border: `1px solid ${siteBorder}`,
    background: siteCard,
    padding: "16px 18px",
  },

  aboutTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
  },

  aboutText: {
    fontSize: 15,
    lineHeight: "22px",
    color: siteMuted,
  },
};

export function OfferPreviewCard({
  businessName,
  address,
  city,
  phone,
  aboutText,
  offerText,
  priceKr,
  originalPriceKr,
  claimedCount = 0,
  totalCount = 1,
  countdownText = "00:00:00",
  heroImageUrl,
  imageUrl,
  ctaLabel = "Claima",
}: OfferPreviewCardProps) {
  const [heroFailed, setHeroFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const progress =
    totalCount > 0 ? Math.max(0, Math.min(100, (claimedCount / totalCount) * 100)) : 0;

  const addressLine = [address, city].filter(Boolean).join(", ");
  const resolvedHero = resolveImageUrl(heroImageUrl);
  const resolvedThumb = resolveImageUrl(imageUrl);
  const showOriginal =
    originalPriceKr !== undefined &&
    originalPriceKr !== null &&
    String(originalPriceKr).trim() !== "" &&
    Number(originalPriceKr) > 0;

  return (
    <div style={previewStyles.page}>
      <div style={previewStyles.phoneFrame}>
        <div style={previewStyles.hero}>
          {resolvedHero && !heroFailed ? (
            <img
              alt=""
              src={resolvedHero}
              style={previewStyles.heroImg}
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <div style={previewStyles.heroFallback} />
          )}
          <div style={previewStyles.heroOverlay} />
          <div style={previewStyles.statusBar}>
            <span>10:11</span>
            <span style={previewStyles.statusIcons}>●●●</span>
          </div>
          <button type="button" style={previewStyles.heroNavBtn} aria-hidden>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button type="button" style={{ ...previewStyles.heroNavBtn, ...previewStyles.heroNavBtnRight }} aria-hidden>
            <Heart size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div style={previewStyles.content}>
          <div style={previewStyles.title}>{businessName}</div>

          {addressLine ? (
            <div style={previewStyles.contactLine}>
              <span style={previewStyles.contactLabel}>Adress:</span> {addressLine}
            </div>
          ) : null}
          {phone ? (
            <div style={previewStyles.contactLine}>
              <span style={previewStyles.contactLabel}>Telefon:</span>{" "}
              <span style={previewStyles.phoneLink}>{phone}</span>
            </div>
          ) : null}

          <div style={previewStyles.pillsRow}>
            <button type="button" style={{ ...previewStyles.pill, outline: "none" }}>
              <MapPin size={15} strokeWidth={2.25} />
              Hitta hit
            </button>
            <button type="button" style={{ ...previewStyles.pill, outline: "none" }}>
              <Globe size={15} strokeWidth={2.25} />
              Webbplats
            </button>
          </div>

          <div style={previewStyles.card}>
            <div style={previewStyles.cardTop}>
              <div style={previewStyles.thumbWrap}>
                {resolvedThumb && !thumbFailed ? (
                  <img
                    alt=""
                    src={resolvedThumb}
                    style={previewStyles.thumbImg}
                    onError={() => setThumbFailed(true)}
                  />
                ) : (
                  <div style={previewStyles.thumbFallback} />
                )}
                <div style={previewStyles.countdownChip}>{countdownText}</div>
              </div>

              <div style={previewStyles.offerBody}>
                <div style={previewStyles.offerText}>{offerText}</div>

                <div style={previewStyles.priceRow}>
                  <span style={previewStyles.price}>{priceKr} kr</span>
                  {showOriginal ? (
                    <span style={previewStyles.originalPrice}>{originalPriceKr} kr</span>
                  ) : null}
                </div>

                <div style={previewStyles.meta}>
                  Claimade: {claimedCount} / {totalCount}
                </div>

                <div style={previewStyles.progressTrack}>
                  <div style={{ ...previewStyles.progressFill, width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <button type="button" style={{ ...previewStyles.cta, outline: "none" }}>
              {ctaLabel}
            </button>
          </div>

          {aboutText?.trim() ? (
            <div style={previewStyles.aboutCard}>
              <div style={previewStyles.aboutTitle}>Om oss:</div>
              <div style={previewStyles.aboutText}>{aboutText.trim()}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
