import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Play,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ApiError,
  getAdminImportOptions,
  getAdminImportRun,
  listAdminImportRuns,
  startAdminImportRun,
  startAdminImportToolRun,
  type AdminImportRun,
  type AdminImportToolMode,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  onCompleted?: () => void;
};

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function runMode(run: AdminImportRun): string {
  const summary = asRecord(run.summary);
  return typeof summary?.mode === "string" ? summary.mode : "scb_then_ai_refresh";
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "scb_enrich":
      return "SCB omverifiering";
    case "confidence_rescore":
      return "Confidence-omvärdering";
    case "scb_then_ai_refresh":
      return "SCB → AI-import";
    default:
      return mode;
  }
}

function phaseLabel(phase: AdminImportRun["phase"], mode: string): string {
  if (mode === "scb_enrich") {
    return phase === "DONE" ? "Klar" : "Hämtar SCB-adresser…";
  }
  if (mode === "confidence_rescore") {
    return phase === "DONE" ? "Klar" : "Omvärderar confidence…";
  }
  switch (phase) {
    case "SCB_IMPORT":
      return "1/2 SCB importerar…";
    case "AI_REFRESH":
      return "2/2 AI fyller beskrivningar…";
    case "DONE":
      return "Klar";
    default:
      return phase;
  }
}

function statusLabel(status: AdminImportRun["status"]): string {
  switch (status) {
    case "PENDING":
      return "Köad";
    case "RUNNING":
      return "Pågår";
    case "COMPLETED":
      return "Klar";
    case "FAILED":
      return "Misslyckades";
    case "CANCELLED":
      return "Avbruten";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatDuration(run: AdminImportRun): string | null {
  if (!run.startedAt) return null;
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();
  const start = Date.parse(run.startedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export function formatRunSummary(run: AdminImportRun): string {
  const summary = asRecord(run.summary) ?? {};
  const mode = runMode(run);
  const parts: string[] = [];

  if (mode === "scb_enrich") {
    const scbEnrich = asRecord(summary.scbEnrich);
    if (scbEnrich) {
      parts.push(`scannade ${scbEnrich.scanned ?? 0}`);
      parts.push(`uppdaterade ${scbEnrich.updated ?? 0}`);
      if ((scbEnrich.skipped as number | undefined) ?? 0) {
        parts.push(`hoppade över ${scbEnrich.skipped}`);
      }
      if ((scbEnrich.errors as number | undefined) ?? 0) {
        parts.push(`fel ${scbEnrich.errors}`);
      }
    }
    return parts.join(" · ") || "SCB omverifiering klar";
  }

  if (mode === "confidence_rescore") {
    const rescore = asRecord(summary.confidenceRescore);
    if (rescore) {
      parts.push(`scannade ${rescore.scanned ?? 0}`);
      parts.push(`auto-godkända ${rescore.autoApproved ?? 0}`);
      parts.push(`uppdaterade ${rescore.updated ?? 0}`);
      parts.push(`oförändrade ${rescore.unchanged ?? 0}`);
    }
    return parts.join(" · ") || "Omvärdering klar";
  }

  const scb = asRecord(summary.scb);
  const ai = asRecord(summary.ai);
  if (scb) {
    parts.push(
      `SCB: ${scb.created ?? 0} nya, ${scb.updated ?? 0} uppdaterade, ${scb.merged ?? 0} sammanslagna`,
    );
    if ((scb.errors as number | undefined) ?? 0) parts.push(`SCB-fel ${scb.errors}`);
  }
  if (ai) {
    if (typeof ai.skippedReason === "string") {
      parts.push(`AI hoppades över (${ai.skippedReason})`);
    } else {
      parts.push(`AI: ${ai.updated ?? 0} berikade`);
      if ((ai.flagged as number | undefined) ?? 0) parts.push(`flaggade ${ai.flagged}`);
      if ((ai.errors as number | undefined) ?? 0) parts.push(`AI-fel ${ai.errors}`);
    }
  }
  return parts.join(" · ") || "Klar";
}

function ImportPipelineSteps({ run }: { run: AdminImportRun }) {
  const mode = runMode(run);
  if (mode !== "scb_then_ai_refresh") return null;

  const scbDone =
    run.phase === "AI_REFRESH" ||
    run.phase === "DONE" ||
    run.status === "COMPLETED" ||
    run.status === "FAILED";
  const aiActive = run.phase === "AI_REFRESH" && ACTIVE_STATUSES.has(run.status);
  const aiDone = run.phase === "DONE" || run.status === "COMPLETED";
  const failed = run.status === "FAILED";

  const Step = ({
    done,
    active,
    label,
    failedStep,
  }: {
    done: boolean;
    active: boolean;
    label: string;
    failedStep?: boolean;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {failedStep ? (
        <Circle className="h-4 w-4 text-destructive" />
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/50" />
      )}
      <span
        className={cn(
          "text-muted-foreground",
          (done || active) && "text-foreground",
          failedStep && "text-destructive",
        )}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-4">
      <Step done={scbDone && !failed} active={run.phase === "SCB_IMPORT" && ACTIVE_STATUSES.has(run.status)} label="SCB-import" failedStep={failed && run.phase === "SCB_IMPORT"} />
      <Step done={aiDone && !failed} active={aiActive} label="AI-berikning" failedStep={failed && run.phase === "AI_REFRESH"} />
      <Step done={run.status === "COMPLETED"} active={false} label="Klar" />
    </div>
  );
}

const DEFAULT_IMPORT_CITY = "Helsingborg";
const DEFAULT_IMPORT_LIMIT = "50";

export function AdminStartImportPanel({ onCompleted }: Props) {
  const [open, setOpen] = useState(true);
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const [importCategories, setImportCategories] = useState<string[]>([]);
  const [city, setCity] = useState(DEFAULT_IMPORT_CITY);
  const [kommun, setKommun] = useState("");
  const [category, setCategory] = useState("all");
  const [enrichWithAi, setEnrichWithAi] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [importLimit, setImportLimit] = useState(DEFAULT_IMPORT_LIMIT);
  const [starting, setStarting] = useState(false);
  const [toolStarting, setToolStarting] = useState<AdminImportToolMode | null>(null);
  const [forceScbEnrich, setForceScbEnrich] = useState(true);
  const [applyAutoApprove, setApplyAutoApprove] = useState(true);
  const [activeRun, setActiveRun] = useState<AdminImportRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<AdminImportRun[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const pollTimeoutRef = useRef<number | null>(null);
  const completedNotifiedRef = useRef<Set<string>>(new Set());

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current != null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const refreshRecentRuns = useCallback(async () => {
    const { runs } = await listAdminImportRuns(12);
    setRecentRuns(runs);
    return runs;
  }, []);

  const pollRun = useCallback(
    (runId: string) => {
      clearPoll();
      const poll = async () => {
        try {
          const run = await getAdminImportRun(runId);
          setActiveRun(run);
          if (ACTIVE_STATUSES.has(run.status)) {
            pollTimeoutRef.current = window.setTimeout(() => {
              void poll();
            }, 3000);
            return;
          }

          void refreshRecentRuns().catch(() => undefined);

          if (completedNotifiedRef.current.has(run.id)) return;
          completedNotifiedRef.current.add(run.id);

          if (run.status === "COMPLETED") {
            toast.success(`${modeLabel(runMode(run))} klar · ${run.city}`, {
              description: formatRunSummary(run),
            });
            onCompleted?.();
          } else if (run.status === "FAILED") {
            toast.error(`${modeLabel(runMode(run))} misslyckades · ${run.city}`, {
              description: run.lastError ?? "Okänt fel",
            });
          }
        } catch (error) {
          const message = error instanceof ApiError ? error.message : "Kunde inte hämta importstatus";
          toast.error(message);
        }
      };
      void poll();
    },
    [clearPoll, onCompleted, refreshRecentRuns],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [options, runs] = await Promise.all([
          getAdminImportOptions().catch(() => null),
          listAdminImportRuns(12),
        ]);
        if (cancelled) return;
        if (options) {
          setKnownCities(options.knownCities);
          setImportCategories(options.categories);
          // Keep explicit UI defaults; only fill city if somehow empty.
          setCity((current) => current.trim() || DEFAULT_IMPORT_CITY || options.knownCities[0] || "");
        }
        setRecentRuns(runs.runs);
        const running = runs.runs.find((run) => ACTIVE_STATUSES.has(run.status));
        if (running) {
          setActiveRun(running);
          setOpen(true);
          pollRun(running.id);
          toast.message(`Återupptar status för ${running.city}`, {
            description: phaseLabel(running.phase, runMode(running)),
          });
        } else if (runs.runs[0]) {
          setActiveRun(runs.runs[0]);
        }
      } catch {
        /* hydrate is best-effort */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [clearPoll, pollRun]);

  const attachOrStart = async (start: () => Promise<AdminImportRun>) => {
    try {
      const run = await start();
      setActiveRun(run);
      setOpen(true);
      void refreshRecentRuns().catch(() => undefined);
      pollRun(run.id);
      return run;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.runningRun) {
        const running = error.runningRun as AdminImportRun;
        setActiveRun(running);
        setOpen(true);
        pollRun(running.id);
        toast.message(`En körning pågår redan för ${running.city}`, {
          description: "Visar den aktiva statusen istället.",
        });
        return running;
      }
      throw error;
    }
  };

  const handleStart = async () => {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      toast.error("Ange en stad");
      return;
    }

    setStarting(true);
    try {
      const limitValue = importLimit.trim() ? Number.parseInt(importLimit.trim(), 10) : undefined;
      const run = await attachOrStart(() =>
        startAdminImportRun({
          city: trimmedCity,
          ...(kommun.trim() ? { kommun: kommun.trim() } : {}),
          ...(category !== "all" ? { category } : {}),
          enrichWithAi,
          dryRun,
          ...(limitValue && Number.isFinite(limitValue) ? { importLimit: limitValue } : {}),
        }),
      );
      toast.message(`Import startad för ${run.city}`, {
        description: dryRun
          ? "Dry run — inga skrivningar"
          : enrichWithAi
            ? "SCB skapar/uppdaterar, sedan AI-berikar PENDING"
            : "Endast SCB-import",
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Kunde inte starta importen";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleTool = async (mode: AdminImportToolMode) => {
    setToolStarting(mode);
    try {
      const limitValue = importLimit.trim() ? Number.parseInt(importLimit.trim(), 10) : undefined;
      const run = await attachOrStart(() =>
        startAdminImportToolRun({
          mode,
          ...(city.trim() ? { city: city.trim() } : {}),
          dryRun,
          ...(mode === "scb_enrich" ? { force: forceScbEnrich } : {}),
          ...(mode === "confidence_rescore" ? { applyAutoApprove } : {}),
          ...(limitValue && Number.isFinite(limitValue) ? { limit: limitValue } : {}),
        }),
      );
      toast.message(`${modeLabel(mode)} startad`, {
        description: dryRun
          ? "Dry run — rapport utan skrivningar"
          : city.trim()
            ? `Stad: ${city.trim()}`
            : "Alla städer i kön",
      });
      void run;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Kunde inte starta verktyget";
      toast.error(message);
    } finally {
      setToolStarting(null);
    }
  };

  const isRunning = activeRun ? ACTIVE_STATUSES.has(activeRun.status) : false;
  const busy = starting || toolStarting != null || isRunning;
  const activeMode = activeRun ? runMode(activeRun) : "scb_then_ai_refresh";
  const duration = activeRun ? formatDuration(activeRun) : null;

  const history = useMemo(
    () => recentRuns.filter((run) => run.id !== activeRun?.id).slice(0, 5),
    [recentRuns, activeRun?.id],
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Importstudio</h2>
                <p className="text-sm text-muted-foreground">
                  {!hydrated
                    ? "Hämtar senaste körningar…"
                    : isRunning
                      ? `${modeLabel(activeMode)} · ${activeRun?.city ?? "…"} · ${phaseLabel(activeRun!.phase, activeMode)}`
                      : "SCB skapar verksamheter → AI berikar → omverifiera / omvärdera vid behov"}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>

          {activeRun ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-3 space-y-2 text-sm",
                activeRun.status === "FAILED"
                  ? "border-destructive/40 bg-destructive/5"
                  : activeRun.status === "COMPLETED"
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-foreground">
                  {modeLabel(activeMode)} · {activeRun.city}
                  {activeRun.dryRun ? (
                    <span className="ml-2 text-xs font-normal text-amber-700">dry run</span>
                  ) : null}
                </div>
                <div className="text-muted-foreground">
                  {statusLabel(activeRun.status)}
                  {duration ? ` · ${duration}` : null}
                </div>
              </div>
              <p className="text-muted-foreground">{phaseLabel(activeRun.phase, activeMode)}</p>
              <ImportPipelineSteps run={activeRun} />
              {activeRun.status === "COMPLETED" ? (
                <p className="text-foreground">{formatRunSummary(activeRun)}</p>
              ) : null}
              {activeRun.status === "FAILED" && activeRun.lastError ? (
                <p className="text-destructive">{activeRun.lastError}</p>
              ) : null}
            </div>
          ) : null}

          <CollapsibleContent className="space-y-5">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">1. Starta SCB → AI-import</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Samma flöde som konsolen: SCB skapar/uppdaterar PENDING-import, AI fyller beskrivningar och confidence-gate.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="import-city">Stad</Label>
                  <Input
                    id="import-city"
                    list="import-known-cities"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Helsingborg"
                    disabled={busy}
                  />
                  <datalist id="import-known-cities">
                    {knownCities.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-kommun">Kommunkod (valfritt)</Label>
                  <Input
                    id="import-kommun"
                    value={kommun}
                    onChange={(e) => setKommun(e.target.value)}
                    placeholder="1283"
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={setCategory} disabled={busy}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Alla kategorier" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all">Alla kategorier</SelectItem>
                      {importCategories.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-limit">Max rader (valfritt)</Label>
                  <Input
                    id="import-limit"
                    inputMode="numeric"
                    value={importLimit}
                    onChange={(e) => setImportLimit(e.target.value)}
                    placeholder={DEFAULT_IMPORT_LIMIT}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard {DEFAULT_IMPORT_LIMIT}. Ändra fältet för att använda ett annat värde.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={enrichWithAi}
                      onCheckedChange={(value) => setEnrichWithAi(value === true)}
                      disabled={busy}
                    />
                    AI-berika efter SCB
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={dryRun}
                      onCheckedChange={(value) => setDryRun(value === true)}
                      disabled={busy}
                    />
                    Dry run
                  </label>
                </div>

                <Button
                  onClick={() => void handleStart()}
                  disabled={busy || !city.trim()}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {starting || (isRunning && activeMode === "scb_then_ai_refresh") ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isRunning && activeMode === "scb_then_ai_refresh" ? "Import pågår…" : "Starta import"}
                </Button>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">2. Efterimport (samma som konsolen)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Använd när kön sitter fast på adresser utan SCB-besöksadress, eller när confidence-reglerna uppdaterats.
                  Respekterar stad + max rader + dry run ovan.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={forceScbEnrich}
                    onCheckedChange={(value) => setForceScbEnrich(value === true)}
                    disabled={busy}
                  />
                  Tvinga SCB omverifiering (även redan berikade)
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={applyAutoApprove}
                    onCheckedChange={(value) => setApplyAutoApprove(value === true)}
                    disabled={busy}
                  />
                  Auto-godkänn vid omvärdering
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleTool("scb_enrich")}
                  disabled={busy}
                >
                  {toolStarting === "scb_enrich" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  SCB omverifiera
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleTool("confidence_rescore")}
                  disabled={busy}
                >
                  {toolStarting === "confidence_rescore" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Scale className="mr-2 h-4 w-4" />
                  )}
                  Omvärdera confidence
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void refreshRecentRuns()
                      .then((runs) => {
                        const running = runs.find((run) => ACTIVE_STATUSES.has(run.status));
                        if (running) {
                          setActiveRun(running);
                          pollRun(running.id);
                        }
                        toast.message("Status uppdaterad");
                      })
                      .catch((error) => {
                        toast.error(
                          error instanceof ApiError ? error.message : "Kunde inte uppdatera status",
                        );
                      });
                  }}
                  disabled={starting || toolStarting != null}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Uppdatera status
                </Button>
              </div>
            </section>

            {history.length > 0 ? (
              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Senaste körningar</h3>
                <ul className="space-y-2">
                  {history.map((run) => (
                    <li key={run.id}>
                      <button
                        type="button"
                        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                        onClick={() => {
                          setActiveRun(run);
                          if (ACTIVE_STATUSES.has(run.status)) pollRun(run.id);
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {modeLabel(runMode(run))} · {run.city}
                          </span>
                          <span className="text-muted-foreground">{statusLabel(run.status)}</span>
                        </div>
                        {run.status === "COMPLETED" ? (
                          <p className="mt-1 text-xs text-muted-foreground">{formatRunSummary(run)}</p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
