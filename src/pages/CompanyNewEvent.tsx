import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, PlusCircle } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/TimePicker";
import {
  createBusinessEvent,
  getBusinessEventById,
  resolveImageUrl,
  updateBusinessEvent,
  type BusinessEvent,
  type CreateBusinessEventRequest,
  type ImageGalleryItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ImageGalleryDialog } from "@/components/ImageGalleryDialog";

type EventForm = {
  title: string;
  description: string;
  locationName: string;
  imageUrl: string;
  visibleFrom: string;
  visibleFromTime: string;
  visibleTo: string;
  visibleToTime: string;
  startsAt: string;
  startsTime: string;
  endsAt: string;
  endsTime: string;
};

const emptyForm: EventForm = {
  title: "",
  description: "",
  locationName: "",
  imageUrl: "",
  visibleFrom: "",
  visibleFromTime: "",
  visibleTo: "",
  visibleToTime: "",
  startsAt: "",
  startsTime: "",
  endsAt: "",
  endsTime: "",
};

function clamp2(value: number) {
  return String(Math.max(0, Math.min(99, value))).padStart(2, "0");
}

function normalizeTime(value: string) {
  const match = (value ?? "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return "";
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
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

function addMinutesToTime(time: string, minutesToAdd: number) {
  const n = normalizeTime(time);
  if (!n) return "";
  const [hStr, mStr] = n.split(":");
  const total = Number(hStr) * 60 + Number(mStr) + minutesToAdd;
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  return `${clamp2(Math.floor(clamped / 60))}:${clamp2(clamped % 60)}`;
}

function toLocalIsoWithOffset(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

function getEventImageUrl(event: BusinessEvent) {
  const candidates = [
    event.imageUrl,
    event.image?.url,
    event.image?.publicUrl,
    event.imageAsset?.url,
    event.imageAsset?.publicUrl,
  ];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function toDatePart(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, "yyyy-MM-dd") : "";
}

function toTimePart(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, "HH:mm") : "";
}

export default function CompanyNewEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<EventForm>(() => {
    const now = new Date();
    return {
      ...emptyForm,
      visibleFrom: format(now, "yyyy-MM-dd"),
      visibleFromTime: `${clamp2(now.getHours())}:${clamp2(now.getMinutes())}`,
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [visibleFromOpen, setVisibleFromOpen] = useState(false);
  const [visibleToOpen, setVisibleToOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [selectedGalleryImageAssetId, setSelectedGalleryImageAssetId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get("editId")?.trim() ?? "";
    if (!eventId) return;

    setEditEventId(eventId);
    setIsLoadingEvent(true);
    const loadEvent = async () => {
      try {
        const event = await getBusinessEventById(eventId);
        setForm({
          title: event.title ?? "",
          description: event.description ?? "",
          locationName: event.locationName ?? "",
          imageUrl: getEventImageUrl(event),
          visibleFrom: toDatePart(event.visibleFrom || event.startsAt),
          visibleFromTime: toTimePart(event.visibleFrom || event.startsAt),
          visibleTo: toDatePart(event.visibleTo || event.endsAt),
          visibleToTime: toTimePart(event.visibleTo || event.endsAt),
          startsAt: toDatePart(event.startsAt),
          startsTime: toTimePart(event.startsAt),
          endsAt: toDatePart(event.endsAt),
          endsTime: toTimePart(event.endsAt),
        });
        setSelectedGalleryImageAssetId(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte läsa eventet.";
        toast.error(message);
        navigate("/company/events");
      } finally {
        setIsLoadingEvent(false);
      }
    };

    void loadEvent();
  }, [location.search, navigate]);

  const today = startOfDay(new Date());
  const visibleToMinDate = form.visibleFrom ? parseISO(form.visibleFrom) : today;
  const endMinDate = form.startsAt ? parseISO(form.startsAt) : today;

  const onChange = (field: keyof EventForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectGalleryImage = (image: ImageGalleryItem) => {
    const rawUrl = image.publicUrl || image.originalUrl || "";
    onChange("imageUrl", rawUrl ? resolveImageUrl(rawUrl) : "");
    setSelectedGalleryImageAssetId(image.id);
  };

  const buildPayload = (): CreateBusinessEventRequest | null => {
    if (!form.title.trim()) {
      toast.error("Fyll i titel.");
      return null;
    }
    if (!form.description.trim()) {
      toast.error("Fyll i beskrivning.");
      return null;
    }
    if (!form.visibleFrom || !form.visibleFromTime || !form.visibleTo || !form.visibleToTime) {
      toast.error("Välj hur länge eventet ska synas i appen.");
      return null;
    }
    if (!form.startsAt || !form.startsTime || !form.endsAt || !form.endsTime) {
      toast.error("Välj start- och sluttid för eventet.");
      return null;
    }

    if (form.visibleFrom === form.visibleTo && compareTime(form.visibleToTime, addMinutesToTime(form.visibleFromTime, 1)) < 0) {
      toast.error("Appens sluttid måste vara efter starttid när datumen är samma dag.");
      return null;
    }
    if (form.startsAt === form.endsAt && compareTime(form.endsTime, addMinutesToTime(form.startsTime, 1)) < 0) {
      toast.error("Eventets sluttid måste vara efter starttid när datumen är samma dag.");
      return null;
    }

    const visibleFromDate = new Date(`${form.visibleFrom}T${form.visibleFromTime}:00`);
    const visibleToDate = new Date(`${form.visibleTo}T${form.visibleToTime}:00`);
    const startsAtDate = new Date(`${form.startsAt}T${form.startsTime}:00`);
    const endsAtDate = new Date(`${form.endsAt}T${form.endsTime}:00`);
    if (Number.isNaN(visibleFromDate.getTime()) || Number.isNaN(visibleToDate.getTime())) {
      toast.error("Appens synlighetstid är ogiltig.");
      return null;
    }
    if (visibleFromDate.getTime() >= visibleToDate.getTime()) {
      toast.error("Appens starttid måste vara före sluttid.");
      return null;
    }
    if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime())) {
      toast.error("Eventets starttid eller sluttid är ogiltig.");
      return null;
    }
    if (startsAtDate.getTime() >= endsAtDate.getTime()) {
      toast.error("Eventets starttid måste vara före sluttid.");
      return null;
    }
    if (visibleFromDate.getTime() > endsAtDate.getTime()) {
      toast.error("Eventet kan inte börja synas efter att det har slutat.");
      return null;
    }
    if (!editEventId && endsAtDate.getTime() <= Date.now()) {
      toast.error("Eventets sluttid måste vara i framtiden.");
      return null;
    }

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      locationName: form.locationName.trim() || undefined,
      visibleFrom: toLocalIsoWithOffset(visibleFromDate),
      visibleTo: toLocalIsoWithOffset(visibleToDate),
      startsAt: toLocalIsoWithOffset(startsAtDate),
      endsAt: toLocalIsoWithOffset(endsAtDate),
      imageAssetId: selectedGalleryImageAssetId ?? undefined,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      if (editEventId) {
        await updateBusinessEvent(editEventId, payload);
        toast.success("Event uppdaterat.");
      } else {
        await createBusinessEvent(payload);
        toast.success("Event skapat.");
      }
      navigate("/company/events");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte spara eventet.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {editEventId ? "Redigera event" : "Nytt event"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {editEventId ? "Ändra eventet och spara uppdateringarna." : "Skapa ett event som visas i appen under vald period."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/company/events")}
          className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Tillbaka till event"
        >
          <span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </span>
          <span className="relative z-10 ml-1 whitespace-nowrap">Tillbaka</span>
        </button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Eventinformation</CardTitle>
          <CardDescription>Fyll i detaljerna nedan och välj både appens synlighet och eventets faktiska tid.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEvent ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Hämtar event...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Titel</label>
                  <Input placeholder="Ex. Livemusik på fredag" value={form.title} onChange={(e) => onChange("title", e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Beskrivning</label>
                  <Textarea
                    placeholder="Berätta vad som händer och varför gäster ska komma."
                    value={form.description}
                    onChange={(e) => onChange("description", e.target.value)}
                    className="min-h-28"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Platsnamn eller scen (valfritt)</label>
                  <Input placeholder="Ex. Innergården, scen 2" value={form.locationName} onChange={(e) => onChange("locationName", e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Bild (valfritt)</label>
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center">
                    <Button type="button" className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setGalleryDialogOpen(true)}>
                      Välj från galleri
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedGalleryImageAssetId ? "Ny galleribild vald" : form.imageUrl.trim() ? "Nuvarande bild visas" : "Ingen bild vald"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-4 md:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Syns i appen</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Bestämmer hur länge eventet är publicerat och synligt för användare.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Syns från datum</label>
                      <Popover open={visibleFromOpen} onOpenChange={setVisibleFromOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn("relative h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground", visibleFromOpen ? "border-accent ring-2 ring-accent" : "border-border")}>
                            {form.visibleFrom || "Välj datum"}
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.visibleFrom ? parseISO(form.visibleFrom) : undefined}
                            disabled={{ before: today }}
                            onSelect={(date) => {
                              if (!date) return;
                              onChange("visibleFrom", format(date, "yyyy-MM-dd"));
                              if (form.visibleTo && parseISO(form.visibleTo) < date) onChange("visibleTo", format(date, "yyyy-MM-dd"));
                              setVisibleFromOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Syns till datum</label>
                      <Popover open={visibleToOpen} onOpenChange={setVisibleToOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn("relative h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground", visibleToOpen ? "border-accent ring-2 ring-accent" : "border-border")}>
                            {form.visibleTo || "Välj datum"}
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.visibleTo ? parseISO(form.visibleTo) : undefined}
                            disabled={{ before: visibleToMinDate }}
                            onSelect={(date) => {
                              if (!date) return;
                              onChange("visibleTo", format(date, "yyyy-MM-dd"));
                              setVisibleToOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Syns från tid</label>
                      <TimePicker label="Välj tid" value={form.visibleFromTime} onChange={(next) => onChange("visibleFromTime", next)} disabled={!form.visibleFrom} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Syns till tid</label>
                      <TimePicker
                        label="Välj tid"
                        value={form.visibleToTime}
                        onChange={(next) => onChange("visibleToTime", next)}
                        disabled={!form.visibleTo}
                        minTime={form.visibleTo && form.visibleFrom && form.visibleTo === form.visibleFrom && form.visibleFromTime ? addMinutesToTime(form.visibleFromTime, 1) : undefined}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-4 md:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">När eventet händer</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Bestämmer själva datumet och tiden för eventet.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Event startdatum</label>
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn("relative h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground", startOpen ? "border-accent ring-2 ring-accent" : "border-border")}>
                            {form.startsAt || "Välj startdatum"}
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.startsAt ? parseISO(form.startsAt) : undefined}
                            disabled={{ before: today }}
                            onSelect={(date) => {
                              if (!date) return;
                              onChange("startsAt", format(date, "yyyy-MM-dd"));
                              if (form.endsAt && parseISO(form.endsAt) < date) onChange("endsAt", format(date, "yyyy-MM-dd"));
                              setStartOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Event slutdatum</label>
                      <Popover open={endOpen} onOpenChange={setEndOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn("relative h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground", endOpen ? "border-accent ring-2 ring-accent" : "border-border")}>
                            {form.endsAt || "Välj slutdatum"}
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.endsAt ? parseISO(form.endsAt) : undefined}
                            disabled={{ before: endMinDate }}
                            onSelect={(date) => {
                              if (!date) return;
                              onChange("endsAt", format(date, "yyyy-MM-dd"));
                              setEndOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Event starttid</label>
                      <TimePicker label="Välj starttid" value={form.startsTime} onChange={(next) => onChange("startsTime", next)} disabled={!form.startsAt} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Event sluttid</label>
                      <TimePicker
                        label="Välj sluttid"
                        value={form.endsTime}
                        onChange={(next) => onChange("endsTime", next)}
                        disabled={!form.endsAt}
                        minTime={form.endsAt && form.startsAt && form.endsAt === form.startsAt && form.startsTime ? addMinutesToTime(form.startsTime, 1) : undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/company/events")} disabled={isSubmitting}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? (editEventId ? "Sparar..." : "Skapar...") : editEventId ? "Spara ändringar" : "Skapa event"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ImageGalleryDialog
        open={galleryDialogOpen}
        onOpenChange={setGalleryDialogOpen}
        onSelect={selectGalleryImage}
      />
    </div>
  );
}
