import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/api";
import {
  getAiImportMetadata,
  getBusinessClaimLabel,
  getBusinessOriginLabel,
  getRegistryTagLabel,
  getRegistryTags,
  getScbImportActionLabel,
  hasScbBulkImport,
  isAiFlaggedImport,
  isAutoApprovedImport,
} from "@/lib/businessImport";

type BusinessImportBadgesProps = {
  business: Pick<Business, "source" | "isClaimed" | "importMetadata"> & {
    hasManager?: boolean;
  };
  className?: string;
  /** Light text on a dark chip so badges stay readable over a photo. */
  onPhoto?: boolean;
};

export function BusinessImportBadges({ business, className, onPhoto = false }: BusinessImportBadgesProps) {
  const isImported = business.source === "IMPORTED";
  const claimLabel = getBusinessClaimLabel(business);
  const ai = getAiImportMetadata(business.importMetadata);
  const flagged = isAiFlaggedImport(business.importMetadata);
  const autoApproved = isAutoApprovedImport(business);
  const scbBulkImport = hasScbBulkImport(business.importMetadata);
  const scbActionLabel = getScbImportActionLabel(business.importMetadata);
  const registryTags = getRegistryTags(business.importMetadata);

  if (!isImported && !claimLabel && !ai && !scbBulkImport) return null;

  const isOwned =
    typeof business.hasManager === "boolean" ? business.hasManager : Boolean(business.isClaimed);

  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {isImported ? (
        <Badge
          variant="outline"
          className={onPhoto ? "border-white/20 bg-black/60 text-foreground text-[11px]" : "border-border text-[11px]"}
        >
          {getBusinessOriginLabel(business.source)}
        </Badge>
      ) : null}
      {scbBulkImport ? (
        <Badge
          variant="outline"
          className={
            onPhoto
              ? "border-sky-300/30 bg-sky-950/80 text-sky-100 text-[11px]"
              : "border-sky-500/40 bg-sky-500/10 text-sky-700 text-[11px]"
          }
          title={scbActionLabel ? `SCB bulk-import (${scbActionLabel})` : "SCB bulk-import"}
        >
          SCB-import{scbActionLabel ? ` · ${scbActionLabel}` : ""}
        </Badge>
      ) : null}
      {ai ? (
        <Badge
          variant="outline"
          className={
            onPhoto
              ? "border-blue-300/30 bg-blue-950/80 text-blue-100 text-[11px]"
              : "border-accent/40 bg-accent/10 text-accent text-[11px]"
          }
        >
          AI-import
        </Badge>
      ) : null}
      {autoApproved ? (
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[11px]">
          Auto-godkänd
        </Badge>
      ) : null}
      {flagged ? (
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[11px]">
          AI-flaggad
        </Badge>
      ) : null}
      {registryTags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive text-[11px]"
        >
          {getRegistryTagLabel(tag)}
        </Badge>
      ))}
      {claimLabel ? (
        <Badge
          variant="outline"
          className={
            onPhoto
              ? isOwned
                ? "border-emerald-300/30 bg-emerald-950/80 text-emerald-100 text-[11px]"
                : "border-amber-300/40 bg-amber-950/80 text-amber-100 text-[11px]"
              : isOwned
                ? "border-success/40 bg-success/10 text-success text-[11px]"
                : "border-warning/40 bg-warning/10 text-warning text-[11px]"
          }
        >
          {claimLabel}
        </Badge>
      ) : null}
    </div>
  );
}
