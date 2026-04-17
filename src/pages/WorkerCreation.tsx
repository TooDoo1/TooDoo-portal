import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUserByEmail, inviteWorkerToBusiness } from "@/lib/api";
import { toast } from "sonner";

export default function WorkerCreation() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Ange en e-postadress.");
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteResponse = await inviteWorkerToBusiness(trimmed);
      if (!inviteResponse.inviteToken) {
        throw new Error("Kunde inte skapa inbjudningslänk.");
      }

      let userExists = false;
      try {
        await getUserByEmail(trimmed);
        userExists = true;
      } catch {
        userExists = false;
      }

      const params = new URLSearchParams({
        email: trimmed,
        inviteToken: inviteResponse.inviteToken,
      });
      if (userExists) {
        params.set("existing", "true");
      }

      const onboardLink = `${window.location.origin}/worker/onboard?${params.toString()}`;

      const subject = "Du har blivit inbjuden som arbetare";
      const body = userExists
        ? `Hej!\n\nDu har blivit inbjuden att arbeta hos oss. Logga in via länken nedan:\n\n${onboardLink}`
        : `Hej!\n\nDu har blivit inbjuden att arbeta hos oss. Skapa ditt konto via länken nedan:\n\n${onboardLink}`;

      window.location.href = `mailto:${encodeURIComponent(trimmed)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      toast.success("Inbjudan skapad! E-postklient öppnas.");
      setEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa inbjudan.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Bjud in arbetare</h1>
        <p className="text-muted-foreground mt-1">
          Skicka en inbjudan till en arbetare via e-post
        </p>
      </div>

      <form onSubmit={handleInvite}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              Ny arbetare
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
                placeholder="arbetare@example.com"
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
    </div>
  );
}
