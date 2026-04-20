import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Filter, Info, RefreshCw, ScrollText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listLogs, type LogEntry, type LogStatus } from "@/lib/api";
import { toast } from "sonner";

const STATUS_OPTIONS: Array<{ value: "ALL" | LogStatus; label: string }> = [
  { value: "ALL", label: "Alla statusar" },
  { value: "INFO", label: "Info" },
  { value: "SUCCESS", label: "Success" },
  { value: "WARNING", label: "Warning" },
  { value: "ERROR", label: "Error" },
  { value: "FAILURE", label: "Failure" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function statusStyles(status: LogStatus | string | undefined) {
  switch ((status ?? "").toUpperCase()) {
    case "SUCCESS":
      return {
        icon: CheckCircle2,
        badge: "bg-success/15 text-success border border-success/25",
        row: "border-l-success/70",
      };
    case "INFO":
      return {
        icon: Info,
        badge: "bg-accent/15 text-accent border border-accent/25",
        row: "border-l-accent/70",
      };
    case "WARNING":
      return {
        icon: AlertTriangle,
        badge: "bg-yellow-500/15 text-yellow-500 border border-yellow-500/25",
        row: "border-l-yellow-500/70",
      };
    case "ERROR":
      return {
        icon: XCircle,
        badge: "bg-red-500/15 text-red-500 border border-red-500/25",
        row: "border-l-red-500/70",
      };
    case "FAILURE":
      return {
        icon: XCircle,
        badge: "bg-red-500/15 text-red-500 border border-red-500/25",
        row: "border-l-red-500/70",
      };
    default:
      return {
        icon: Info,
        badge: "bg-secondary text-muted-foreground border border-border",
        row: "border-l-border",
      };
  }
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMetadata(metadata: unknown): string | null {
  if (metadata === undefined || metadata === null) return null;
  if (typeof metadata === "string") return metadata;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<"ALL" | LogStatus>("ALL");
  const [take, setTake] = useState<number>(25);
  const [skip, setSkip] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listLogs({
        status: status === "ALL" ? undefined : status,
        take,
        skip,
      });

      const rows = Array.isArray(response) ? response : response.logs ?? [];
      setLogs(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte hämta loggar.";
      toast.error(message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [status, take, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageStart = skip + 1;
  const pageEnd = skip + logs.length;

  const canPrev = skip > 0;
  const canNext = logs.length === take;

  const counts = useMemo(() => {
    const acc: Record<string, number> = { INFO: 0, SUCCESS: 0, WARNING: 0, ERROR: 0, FAILURE: 0 };
    for (const log of logs) {
      const key = (log.status ?? "").toUpperCase();
      if (key in acc) acc[key] += 1;
    }
    return acc;
  }, [logs]);

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Loggar</h1>
          <p className="text-muted-foreground mt-1">Granska systemhändelser och händelser från backend</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-border"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Uppdatera
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {(["INFO", "SUCCESS", "WARNING", "ERROR", "FAILURE"] as LogStatus[]).map((key) => {
          const styles = statusStyles(key);
          const Icon = styles.icon;
          return (
            <Card key={key} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{key}</p>
                  <p className="text-xl font-semibold text-foreground mt-0.5">{counts[key] ?? 0}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${styles.badge}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setSkip(0);
            setStatus(value as "ALL" | LogStatus);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border text-foreground">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(take)}
          onValueChange={(value) => {
            setSkip(0);
            setTake(Number(value));
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] bg-card border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per sida
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {logs.length === 0 ? "Inga resultat" : `Visar ${pageStart}-${pageEnd}`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="border-border"
            onClick={() => setSkip(Math.max(0, skip - take))}
            disabled={!canPrev || loading}
            aria-label="Föregående sida"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-border"
            onClick={() => setSkip(skip + take)}
            disabled={!canNext || loading}
            aria-label="Nästa sida"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-10 w-10 mb-4 opacity-40 animate-spin" />
            <p className="text-sm">Laddar loggar...</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ScrollText className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Inga loggar hittades</p>
            <p className="text-sm">Försök ändra filtret eller kom tillbaka senare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const styles = statusStyles(log.status);
            const Icon = styles.icon;
            const metadataText = formatMetadata(log.metadata);
            const isExpanded = expandedId === log.id;
            const message = (log.message ?? "").toString();

            return (
              <Card
                key={log.id}
                className={`bg-card border-border border-l-4 ${styles.row} ${metadataText ? "cursor-pointer hover:bg-secondary/30 transition-colors" : ""}`}
                onClick={() => {
                  if (!metadataText) return;
                  setExpandedId(isExpanded ? null : log.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-md flex items-center justify-center ${styles.badge}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${styles.badge}`}>
                          {String(log.status ?? "UNKNOWN")}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(log.createdAt)}</span>
                      </div>
                      {message && (
                        <p className="text-sm text-foreground mt-1.5 [overflow-wrap:anywhere]">{message}</p>
                      )}
                      {metadataText && isExpanded && (
                        <pre className="mt-3 rounded-md border border-border bg-secondary/40 p-3 text-xs text-foreground/80 whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {metadataText}
                        </pre>
                      )}
                      {metadataText && !isExpanded && (
                        <p className="mt-1.5 text-xs text-muted-foreground">Klicka för att visa detaljer</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
