import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, Edit, MapPin, Plus, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteBusinessEvent, listManagerBusinessEvents, resolveBusinessId, type BusinessEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

function getEventStatus(event: BusinessEvent): "active" | "draft" | "ended" {
  const now = Date.now();
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  if (Number.isFinite(end) && end <= now) return "ended";
  if (Number.isFinite(start) && start > now) return "draft";
  return "active";
}

function getStatusLabel(status: ReturnType<typeof getEventStatus>) {
  if (status === "active") return "Pågår";
  if (status === "draft") return "Kommande";
  return "Avslutat";
}

function getStatusClass(status: ReturnType<typeof getEventStatus>) {
  if (status === "active") return "bg-success/15 text-success";
  if (status === "draft") return "bg-warning/15 text-warning";
  return "bg-muted/15 text-muted-foreground";
}

function formatEventDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CompanyEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<BusinessEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const businessId = await resolveBusinessId();
      if (!businessId) {
        setEvents([]);
        toast.error("Saknar businessId. Logga in igen.");
        return;
      }

      const data = await listManagerBusinessEvents();
      setEvents([...data].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte hämta event.";
      toast.error(message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleDelete = async (event: BusinessEvent) => {
    setIsDeleting(true);
    try {
      await deleteBusinessEvent(event.id);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      toast.success(`Eventet "${event.title}" har tagits bort.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort eventet.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = events.filter((event) => getEventStatus(event) === "active").length;
  const upcomingCount = events.filter((event) => getEventStatus(event) === "draft").length;
  const totalInterests = events.reduce((sum, event) => sum + (event._count?.interests ?? 0), 0);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes spin-icon {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .group:hover .spin-on-hover {
          animation: spin-icon 2s linear infinite;
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Event</h1>
          <p className="mt-1 text-muted-foreground">Skapa och hantera kommande event för ditt företag.</p>
        </div>
        <Button className="group gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/company/events/new")}>
          <Plus className="h-4 w-4 spin-on-hover" />
          Nytt event
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-foreground">{events.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">Totalt event</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-success">{activeCount}</div>
            <p className="mt-1 text-sm text-muted-foreground">Pågår nu</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-accent">{upcomingCount}</div>
            <p className="mt-1 text-sm text-muted-foreground">Kommande</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="border-border bg-card">
          <CardHeader className="py-12 text-center">
            <CardTitle className="text-foreground">Hämtar event...</CardTitle>
          </CardHeader>
        </Card>
      ) : events.length === 0 ? (
        <Card className="border-border bg-card">
          <CardHeader className="py-12 text-center">
            <CardTitle className="text-foreground">Inga event än</CardTitle>
            <CardDescription className="mt-2">Skapa ett event för konserter, temakvällar eller andra aktiviteter.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const status = getEventStatus(event);
            const interests = event._count?.interests ?? 0;
            return (
              <Card key={event.id} className="border-border bg-card card-hover">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-foreground">{event.title}</h3>
                        <Badge className={cn("pointer-events-none", getStatusClass(status))}>{getStatusLabel(status)}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          Event: {formatEventDateTime(event.startsAt)} - {formatEventDateTime(event.endsAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          App: {formatEventDateTime(event.visibleFrom || event.startsAt)} - {formatEventDateTime(event.visibleTo || event.endsAt)}
                        </span>
                        {event.locationName ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {event.locationName}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {interests} intresserade
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 bg-accent text-white hover:bg-accent/80"
                        onClick={() => navigate(`/company/events/new?editId=${encodeURIComponent(event.id)}`)}
                      >
                        <Edit className="h-4 w-4" />
                        Redigera
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 bg-[#ff3b30] text-white hover:bg-[#ff3b30]/70"
                        disabled={isDeleting}
                        onClick={() => setEventToDelete(event)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Ta bort
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border bg-card/60">
        <CardContent className="flex flex-col gap-1 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Event är inte claimbara och skapar inga QR-koder eller fakturor.</span>
          <span>{totalInterests} totala intressemarkeringar</span>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
        title="Ta bort event?"
        description={eventToDelete ? `Detta tar bort "${eventToDelete.title}".` : "Detta tar bort eventet."}
        confirmLabel="Ja, ta bort"
        variant="destructive"
        onConfirm={() => {
          if (!eventToDelete) return;
          const current = eventToDelete;
          setEventToDelete(null);
          void handleDelete(current);
        }}
      />
    </div>
  );
}
