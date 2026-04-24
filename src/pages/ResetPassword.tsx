import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { forgotPasswordReset } from "@/lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(email.trim() && token.trim() && password.trim() && confirmPassword.trim());
  }, [email, token, password, confirmPassword]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = password.trim();
    const confirm = confirmPassword.trim();

    if (!email.trim() || !token.trim()) {
      toast.error("Länken saknar token eller e-post. Be om en ny återställningslänk.");
      return;
    }
    if (next.length < 8) {
      toast.error("Nytt lösenord måste vara minst 8 tecken.");
      return;
    }
    if (next !== confirm) {
      toast.error("Lösenorden matchar inte.");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordReset({ email: email.trim(), token: token.trim(), password: next });
      toast.success("Lösenord återställt. Logga in med ditt nya lösenord.");
      navigate("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte återställa lösenord.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Återställ lösenord</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Välj ett nytt lösenord för <span className="font-semibold">{email || "ditt konto"}</span>.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nytt lösenord</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tecken"
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Bekräfta nytt lösenord</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Upprepa lösenord"
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Link to="/login" className="text-xs font-semibold text-accent underline underline-offset-4 hover:opacity-90">
                Till login
              </Link>
              <Button type="submit" disabled={isSubmitting || !canSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSubmitting ? "Sparar…" : "Spara nytt lösenord"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

