import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function clamp2(value: number) {
  return String(Math.max(0, Math.min(99, value))).padStart(2, "0");
}

function normalizeTime(value: string) {
  const match = (value ?? "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return "";
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return `${clamp2(hh)}:${clamp2(mm)}`;
}

function compareTime(a: string, b: string) {
  const na = normalizeTime(a);
  const nb = normalizeTime(b);
  if (!na || !nb) return 0;
  const [ah, am] = na.split(":").map(Number);
  const [bh, bm] = nb.split(":").map(Number);
  return ah !== bh ? ah - bh : am - bm;
}

function ceilToStep(time: string, stepMinutes: number) {
  const n = normalizeTime(time);
  if (!n) return "";
  const [hStr, mStr] = n.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const total = h * 60 + m;
  const stepped = Math.ceil(total / stepMinutes) * stepMinutes;
  const hh = Math.floor(stepped / 60);
  const mm = stepped % 60;
  if (hh > 23) return "23:59";
  return `${clamp2(hh)}:${clamp2(mm)}`;
}

export function TimePicker({
  value,
  onChange,
  disabled,
  label,
  minTime,
  minuteStep = 5,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  label: string;
  minTime?: string;
  minuteStep?: number;
}) {
  const normalized = normalizeTime(value);
  const [open, setOpen] = useState(false);

  const [hh, mm] = normalized ? normalized.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => clamp2(i));
  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => clamp2(i * minuteStep));
  const effectiveMinTime = minTime ? ceilToStep(minTime, minuteStep) : "";
  const effectiveMinHour = effectiveMinTime ? effectiveMinTime.split(":")[0] : "";
  const effectiveMinMinute = effectiveMinTime ? effectiveMinTime.split(":")[1] : "";
  const selectedMinuteForHour = mm ? mm : null;

  const setPart = (nextH: string, nextM: string) => {
    const next = normalizeTime(`${nextH}:${nextM}`);
    if (!next) return;
    if (effectiveMinTime && compareTime(next, effectiveMinTime) < 0) return;
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "relative h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
            disabled ? "border-border opacity-50" : "border-border focus-visible:ring-2 focus-visible:ring-accent",
          )}
          aria-label={label}
        >
          {normalized || "Välj tid"}
          <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-56 border-border bg-popover p-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-semibold text-muted-foreground">Timme</div>
            <div className="max-h-56 overflow-auto rounded-md border border-border bg-background/40 p-1">
              {hours.map((h) => {
                const disabledHour =
                  Boolean(effectiveMinTime) &&
                  (Number(h) < Number(effectiveMinHour) ||
                    (h === effectiveMinHour &&
                      selectedMinuteForHour !== null &&
                      Number(selectedMinuteForHour) < Number(effectiveMinMinute)));

                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabledHour}
                    onClick={() => {
                      const nextMinute =
                        mm ||
                        (effectiveMinTime && h === effectiveMinHour ? effectiveMinMinute : "00");
                      setPart(h, nextMinute);
                    }}
                    className={cn(
                      "flex w-full items-center justify-center rounded-md px-2 py-1.5 text-sm font-semibold transition-colors",
                      h === hh ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/15",
                      disabledHour ? "opacity-40 pointer-events-none" : "",
                    )}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-1 text-[11px] font-semibold text-muted-foreground">Minut</div>
            <div className="max-h-56 overflow-auto rounded-md border border-border bg-background/40 p-1">
              {minutes.map((m) => {
                const hasSelectedHour = Boolean(hh);
                const minH = effectiveMinHour ? Number(effectiveMinHour) : null;
                const minM = effectiveMinMinute ? Number(effectiveMinMinute) : null;
                const minuteTooEarlyForMinHour = minH !== null && minM !== null && Number(m) < minM;
                const selectedHourIsMinHour = hasSelectedHour && effectiveMinHour && hh === effectiveMinHour;

                const disabledMinute =
                  Boolean(effectiveMinTime) && selectedHourIsMinHour && minM !== null && Number(m) < minM;

                const defaultHourForMinute = (() => {
                  if (hasSelectedHour) return hh;
                  if (!effectiveMinTime || minH === null || minM === null) return "12";
                  if (minH >= 23 && minuteTooEarlyForMinHour) return effectiveMinHour;
                  return minuteTooEarlyForMinHour ? clamp2(minH + 1) : effectiveMinHour;
                })();

                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabledMinute}
                    onClick={() => setPart(defaultHourForMinute, m)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-md px-2 py-1.5 text-sm font-semibold transition-colors",
                      m === mm ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/15",
                      disabledMinute ? "opacity-40 pointer-events-none" : "",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent/15 hover:text-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Rensa
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
            onClick={() => setOpen(false)}
          >
            Klar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

