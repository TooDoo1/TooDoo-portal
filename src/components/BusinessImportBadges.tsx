import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/api";
import {
  getBusinessClaimLabel,
  getBusinessEnrichmentLabel,
  getBusinessOriginLabel,
} from "@/lib/businessImport";

type BusinessImportBadgesProps = {
  business: Pick<Business, "source" | "isClaimed" | "googlePlaceId" | "importMetadata">;
  className?: string;
};

export function BusinessImportBadges({ business, className }: BusinessImportBadgesProps) {
  if (business.source !== "IMPORTED") return null;

  const claimLabel = getBusinessClaimLabel(business);
  const enrichmentLabel = getBusinessEnrichmentLabel(business);

  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      <Badge variant="outline" className="border-border text-[11px]">
        {getBusinessOriginLabel(business.source)}
      </Badge>
      {claimLabel ? (
        <Badge
          variant="outline"
          className={
            business.isClaimed
              ? "border-success/40 bg-success/10 text-success text-[11px]"
              : "border-warning/40 bg-warning/10 text-warning text-[11px]"
          }
        >
          {claimLabel}
        </Badge>
      ) : null}
      {enrichmentLabel ? (
        <Badge
          variant="outline"
          className={
            enrichmentLabel === "Google-enrichat"
              ? "border-accent/40 bg-accent/10 text-accent text-[11px]"
              : "border-destructive/40 bg-destructive/10 text-destructive text-[11px]"
          }
        >
          {enrichmentLabel}
        </Badge>
      ) : null}
    </div>
  );
}
