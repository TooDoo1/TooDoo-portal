import { useEffect, useState } from "react";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthEmail, inviteWorkerToBusiness, listWorkers, removeWorkerFromBusiness, type User } from "@/lib/api";
import { toast } from "sonner";

export default function WorkerCreation() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workers, setWorkers] = useState<User[]>([]);
  const [totalWorkers, setTotalWorkers] = useState(0);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWorkers = async () => {
    setIsLoadingWorkers(true);
    try {
      const res = await listWorkers();
      setWorkers(res.workers);
      setTotalWorkers(res.total);
    } catch {
      setWorkers([]);
      setTotalWorkers(0);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  useEffect(() => {
    void loadWorkers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Ange en e-postadress.");
      return;
    }

    const managerEmail = getAuthEmail();
    if (!managerEmail) {
      toast.error("Saknar inloggad manager-e-post. Logga in igen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteResponse = await inviteWorkerToBusiness(trimmed, managerEmail);

      const inviteUrl =
        inviteResponse.inviteUrl ||
        `${window.location.origin}/worker/onboard?email=${encodeURIComponent(trimmed)}&inviteToken=${encodeURIComponent(inviteResponse.inviteToken)}`;

      const subject = encodeURIComponent("Inbjudan till TooDoo");
      const body = encodeURIComponent(
        `Hej!\n\nDu är inbjuden att gå med i TooDoo. Klicka på länken nedan för att fortsätta:\n${inviteUrl}\n\nMed vänliga hälsningar,\n${managerEmail}`,
      );
      toast.success("Mailappen öppnas med inbjudan.");
      window.location.href = `mailto:${encodeURIComponent(trimmed)}?subject=${subject}&body=${body}`;

      setEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa inbjudan.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (worker: User) => {
    setRemovingId(worker.id);
    try {
      await removeWorkerFromBusiness(worker.id);
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
      setTotalWorkers((prev) => prev - 1);
      toast.success(`${worker.email} har tagits bort.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte ta bort kollegan.";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Bjud in kollegor</h1>
        <p className="text-muted-foreground mt-1">
          Skicka en inbjudan till en kollega via e-post
        </p>
      </div>

      <form onSubmit={handleInvite}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              Ny kollega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="workerEmail" className="text-sm font-medium text-foreground">
                E-postadress
              </label>
              <Input
                id="workerEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollega@example.com"
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
              />
              <p className="text-xs text-muted-foreground">
                Om personen redan har ett konto skickas en inloggningslänk, annars en registreringslänk.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSubmitting ? "Skapar inbjudan..." : "Skicka inbjudan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Kollegor ({totalWorkers})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWorkers ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
                role="status"
                aria-label="Laddar"
              />
            </div>
          ) : workers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga kollegor kopplade till företaget än.
            </p>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {worker.firstName && worker.lastName
                        ? `${worker.firstName} ${worker.lastName}`
                        : worker.email}
                    </p>
                    {worker.firstName && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{worker.email}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removingId === worker.id}
                    onClick={() => handleRemove(worker)}
                    className="ml-3 shrink-0 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {removingId === worker.id ? "Tar bort..." : "Ta bort"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
