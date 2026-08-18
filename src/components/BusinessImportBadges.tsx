import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/api";
import {
  getAiImportMetadata,
  getBusinessClaimLabel,
  getBusinessOriginLabel,
  getRegistryTagLabel,
  getRegistryTags,
  isAiFlaggedImport,
} from "@/lib/businessImport";

type BusinessImportBadgesProps = {
  business: Pick<Business, "source" | "isClaimed" | "importMetadata"> & {
    hasManager?: boolean;
  };
  className?: string;
};

export function BusinessImportBadges({ business, className }: BusinessImportBadgesProps) {
  const isImported = business.source === "IMPORTED";
  const claimLabel = getBusinessClaimLabel(business);
  const ai = getAiImportMetadata(business.importMetadata);
  const flagged = isAiFlaggedImport(business.importMetadata);
  const registryTags = getRegistryTags(business.importMetadata);

  if (!isImported && !claimLabel && !ai) return null;

  const isOwned =
    typeof business.hasManager === "boolean" ? business.hasManager : Boolean(business.isClaimed);

  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {isImported ? (
        <Badge variant="outline" className="border-border text-[11px]">
          {getBusinessOriginLabel(business.source)}
        </Badge>
      ) : null}
      {ai ? (
        <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent text-[11px]">
          AI-import
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
            isOwned
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
