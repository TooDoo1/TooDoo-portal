import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Business } from "@/lib/api";
import {
  formatAiClaimPath,
  formatAiEntityType,
  formatAiOutletsEstimate,
  formatAiPriceLevel,
  formatImportConfidence,
  formatImportedAt,
  formatRegistryStatus,
  getAiImportMetadata,
  isAiFlaggedImport,
} from "@/lib/businessImport";
import { cn } from "@/lib/utils";

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{children}</span>
    </p>
  );
}

function ChipList({ values }: { values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="outline" className="border-border text-[11px] font-normal">
          {value}
        </Badge>
      ))}
    </div>
  );
}

type ImportMetadataSectionProps = {
  business: Pick<Business, "cfarNr" | "orgNr" | "sniCode" | "importMetadata" | "googlePlaceId">;
};

export function ImportMetadataSection({ business }: ImportMetadataSectionProps) {
  const [open, setOpen] = useState(false);
  const metadata = business.importMetadata ?? null;
  const ai = getAiImportMetadata(metadata);
  const search = ai?.searchMetadata ?? null;
  const flagged = isAiFlaggedImport(metadata);
  const confidence = formatImportConfidence(search?.confidence ?? null);
  const entityType = formatAiEntityType(ai?.entityType);
  const claimPath = formatAiClaimPath(ai?.claimPath);
  const priceLevel = formatAiPriceLevel(search?.priceLevel);
  const outlets = formatAiOutletsEstimate(ai?.outletsInCityEstimate);
  const importedAt = formatImportedAt(metadata?.importedAt);
  const tags = (search?.tags ?? []).filter((value): value is string => Boolean(value?.trim()));
  const audience = (search?.audience ?? []).filter((value): value is string => Boolean(value?.trim()));
  const synonyms = (search?.synonyms ?? []).filter((value): value is string => Boolean(value?.trim()));
  const sources = (search?.sources ?? []).filter((value): value is string => Boolean(value?.trim()));
  const alternatives = (search?.displayNameAlternatives ?? []).filter((value): value is string =>
    Boolean(value?.trim()),
  );
  const google = metadata?.google;
  const registryStatus = formatRegistryStatus(ai?.registry?.status);
  const hasRegistry =
    Boolean(business.cfarNr) || Boolean(business.orgNr) || Boolean(business.sniCode) || Boolean(ai?.orgNrDisplay);
  const hasContent =
    hasRegistry ||
    Boolean(ai) ||
    Boolean(google) ||
    Boolean(importedAt) ||
    Boolean(metadata?.scb);

  if (!hasContent) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-background/40 text-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-secondary/20">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">Importinformation</p>
          {ai ? (
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent text-[11px]">
              AI-import
            </Badge>
          ) : null}
          {flagged ? (
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[11px]">
              Flaggad
            </Badge>
          ) : null}
          {!open && importedAt ? (
            <span className="text-xs text-muted-foreground">{importedAt}</span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border/60 px-4 pb-4 pt-3">
          <div className="grid gap-2 text-muted-foreground">
            {importedAt ? <MetaRow label="Importerad">{importedAt}</MetaRow> : null}
            {business.cfarNr ? <MetaRow label="CFAR">{business.cfarNr}</MetaRow> : null}
            {business.orgNr ? <MetaRow label="Org.nr">{business.orgNr}</MetaRow> : null}
            {!business.orgNr && ai?.orgNrDisplay ? (
              <MetaRow label="Org.nr (AI)">{ai.orgNrDisplay}</MetaRow>
            ) : null}
            {business.sniCode ? <MetaRow label="SNI">{business.sniCode}</MetaRow> : null}
            {registryStatus ? <MetaRow label="SCB-status">{registryStatus}</MetaRow> : null}
            {ai?.registry?.scbCompanyName ? (
              <MetaRow label="SCB bolagsnamn">{ai.registry.scbCompanyName}</MetaRow>
            ) : null}
            {ai?.registry?.reason ? (
              <MetaRow label="SCB-notering">{ai.registry.reason}</MetaRow>
            ) : null}
            {business.googlePlaceId ? <MetaRow label="Google Place ID">{business.googlePlaceId}</MetaRow> : null}
          </div>

          {ai ? (
            <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI-metadata</p>
              <div className="grid gap-2 text-muted-foreground">
                {ai.gate?.action ? (
                  <MetaRow label="Gate">
                    {ai.gate.action}
                    {ai.gate.reason ? ` — ${ai.gate.reason}` : null}
                  </MetaRow>
                ) : null}
                {confidence ? <MetaRow label="Confidence">{confidence}</MetaRow> : null}
                {entityType ? <MetaRow label="Typ">{entityType}</MetaRow> : null}
                {claimPath ? <MetaRow label="Claim-väg">{claimPath}</MetaRow> : null}
                {search?.neighborhood ? <MetaRow label="Område">{search.neighborhood}</MetaRow> : null}
                {priceLevel ? <MetaRow label="Prisnivå">{priceLevel}</MetaRow> : null}
                {search?.sniHint ? <MetaRow label="SNI-hint">{search.sniHint}</MetaRow> : null}
                {typeof ai.isChain === "boolean" ? (
                  <MetaRow label="Kedja">
                    {ai.isChain
                      ? [ai.chainBrand?.trim() || "Ja", outlets].filter(Boolean).join(" · ")
                      : "Nej"}
                  </MetaRow>
                ) : null}
                {ai.promptVersion || ai.model ? (
                  <MetaRow label="Modell">
                    {[
                      ai.model,
                      ai.promptVersion ? `prompt ${ai.promptVersion}` : null,
                      ai.rank != null ? `rank ${ai.rank}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </MetaRow>
                ) : null}
                {ai.imageUrl ? (
                  <MetaRow label="Bild-URL">
                    <a
                      href={ai.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-accent hover:underline"
                    >
                      {ai.imageUrl}
                    </a>
                    {ai.imageAttribution ? (
                      <span className="mt-1 block text-xs text-muted-foreground">{ai.imageAttribution}</span>
                    ) : null}
                  </MetaRow>
                ) : null}
              </div>

              {search?.fitReason?.trim() ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fit reason</p>
                  <p className="whitespace-pre-wrap text-foreground/90">{search.fitReason.trim()}</p>
                </div>
              ) : null}

              {search?.goodForDeals?.trim() ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bra för deals</p>
                  <p className="whitespace-pre-wrap text-foreground/90">{search.goodForDeals.trim()}</p>
                </div>
              ) : null}

              {tags.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Taggar</p>
                  <ChipList values={tags} />
                </div>
              ) : null}

              {audience.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Målgrupp</p>
                  <ChipList values={audience} />
                </div>
              ) : null}

              {synonyms.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Synonymer</p>
                  <ChipList values={synonyms} />
                </div>
              ) : null}

              {alternatives.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Namnalternativ</p>
                  <ChipList values={alternatives} />
                </div>
              ) : null}

              {sources.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Källor</p>
                  <ChipList values={sources} />
                </div>
              ) : null}
            </div>
          ) : null}

          {google ? (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Google-enrichment</p>
              <div className="grid gap-2 text-muted-foreground">
                {google.placeId ? <MetaRow label="Place ID">{google.placeId}</MetaRow> : null}
                {typeof google.score === "number" ? <MetaRow label="Score">{google.score}</MetaRow> : null}
                {google.candidateName ? <MetaRow label="Kandidat">{google.candidateName}</MetaRow> : null}
                {google.candidateAddress ? <MetaRow label="Adress">{google.candidateAddress}</MetaRow> : null}
                {google.query ? <MetaRow label="Query">{google.query}</MetaRow> : null}
              </div>
            </div>
          ) : null}

          {metadata?.scb ? (
            <details className="mt-4 border-t border-border/60 pt-3">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
                SCB-rådata
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-secondary/30 p-3 text-[11px] text-foreground/80">
                {JSON.stringify(metadata.scb, null, 2)}
              </pre>
            </details>
          ) : null}

          {ai ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rå AI-metadata
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-secondary/30 p-3 text-[11px] text-foreground/80">
                {JSON.stringify(ai, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
