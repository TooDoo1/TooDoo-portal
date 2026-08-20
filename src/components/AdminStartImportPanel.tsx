import { useCallback, useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ApiError,
  getAdminImportOptions,
  getAdminImportRun,
  startAdminImportRun,
  type AdminImportRun,
} from "@/lib/api";
import { toast } from "sonner";

type Props = {
  onCompleted?: () => void;
};

function formatRunSummary(run: AdminImportRun): string {
  const summary = run.summary ?? {};
  const scb = summary.scb as { created?: number; updated?: number; errors?: number } | undefined;
  const ai = summary.ai as
    | { updated?: number; queued?: number; skippedReason?: string; errors?: number }
    | undefined;

  const parts: string[] = [];
  if (scb) {
    parts.push(`SCB skapade ${scb.created ?? 0}, uppdaterade ${scb.updated ?? 0}`);
    if ((scb.errors ?? 0) > 0) parts.push(`${scb.errors} SCB-fel`);
  }
  if (ai?.skippedReason) {
    parts.push(`AI hoppades över (${ai.skippedReason})`);
  } else if (ai) {
    parts.push(`AI uppdaterade ${ai.updated ?? 0} av ${ai.queued ?? 0}`);
    if ((ai.errors ?? 0) > 0) parts.push(`${ai.errors} AI-fel`);
  }
  return parts.join(" · ") || "Klar";
}

export function AdminStartImportPanel({ onCompleted }: Props) {
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const [importCategories, setImportCategories] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [kommun, setKommun] = useState("");
  const [category, setCategory] = useState("all");
  const [enrichWithAi, setEnrichWithAi] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [importLimit, setImportLimit] = useState("");
  const [starting, setStarting] = useState(false);
  const [activeRun, setActiveRun] = useState<AdminImportRun | null>(null);

  useEffect(() => {
    void getAdminImportOptions()
      .then((options) => {
        setKnownCities(options.knownCities);
        setImportCategories(options.categories);
        if (!city && options.knownCities[0]) {
          setCity(options.knownCities[0]);
        }
      })
      .catch(() => {
        /* options are optional for the form */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const pollRun = useCallback(
    async (runId: string) => {
      const poll = async () => {
        try {
          const run = await getAdminImportRun(runId);
          setActiveRun(run);
          if (run.status === "RUNNING" || run.status === "PENDING") {
            window.setTimeout(() => {
              void poll();
            }, 4000);
            return;
          }
          if (run.status === "COMPLETED") {
            toast.success(`Import klar för ${run.city}`, {
              description: formatRunSummary(run),
            });
            onCompleted?.();
          } else if (run.status === "FAILED") {
            toast.error(`Import misslyckades för ${run.city}`, {
              description: run.lastError ?? "Okänt fel",
            });
          }
        } catch (error) {
          const message = error instanceof ApiError ? error.message : "Kunde inte hämta importstatus";
          toast.error(message);
        }
      };
      await poll();
    },
    [onCompleted],
  );

  const handleStart = async () => {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      toast.error("Ange en stad");
      return;
    }

    setStarting(true);
    try {
      const limitValue = importLimit.trim() ? Number.parseInt(importLimit.trim(), 10) : undefined;
      const run = await startAdminImportRun({
        city: trimmedCity,
        ...(kommun.trim() ? { kommun: kommun.trim() } : {}),
        ...(category !== "all" ? { category } : {}),
        enrichWithAi,
        dryRun,
        ...(limitValue && Number.isFinite(limitValue) ? { importLimit: limitValue } : {}),
      });
      setActiveRun(run);
      toast.message(`Import startad för ${run.city}`, {
        description: dryRun ? "Dry run — inga skrivningar" : "Körs i bakgrunden",
      });
      void pollRun(run.id);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Kunde inte starta importen";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const isRunning = activeRun?.status === "RUNNING" || activeRun?.status === "PENDING";

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Starta import</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kör SCB-import för en stad, med valfri AI-enrichment. Jobbet körs i bakgrunden.
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
              disabled={starting || isRunning}
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
              disabled={starting || isRunning}
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={starting || isRunning}
            >
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
            <Label htmlFor="import-limit">Limit per shard (valfritt)</Label>
            <Input
              id="import-limit"
              inputMode="numeric"
              value={importLimit}
              onChange={(e) => setImportLimit(e.target.value)}
              placeholder="t.ex. 50 för test"
              disabled={starting || isRunning}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={enrichWithAi}
                onCheckedChange={(value) => setEnrichWithAi(value === true)}
                disabled={starting || isRunning}
              />
              AI-enrichment
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={dryRun}
                onCheckedChange={(value) => setDryRun(value === true)}
                disabled={starting || isRunning}
              />
              Dry run
            </label>
          </div>

          <Button
            onClick={() => void handleStart()}
            disabled={starting || isRunning || !city.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {starting || isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Import pågår…" : "Starta import"}
          </Button>
        </div>

        {activeRun ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{activeRun.city}</span>
            {" · "}
            {activeRun.status}
            {" · "}
            {activeRun.phase}
            {activeRun.status === "COMPLETED" ? ` · ${formatRunSummary(activeRun)}` : null}
            {activeRun.status === "FAILED" && activeRun.lastError
              ? ` · ${activeRun.lastError}`
              : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
