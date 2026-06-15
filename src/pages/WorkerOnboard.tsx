import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoginArrowLabel } from "@/components/LoginArrowLabel";
import { BackArrowLabel } from "@/components/BackArrowLabel";
import { loginUser, redeemWorkerInvite, registerUser, setAuthEmail, setAuthRole, setAuthToken } from "@/lib/api";
import { toast } from "sonner";

const INVITE_TOKEN_STORAGE_KEY = "toodoo_worker_invite_token";

const shootingStars = [
  { top: "0%", left: "6%", delay: "-0.2s", duration: "5.1s" },
  { top: "0%", left: "22%", delay: "-1.0s", duration: "5.4s" },
  { top: "0%", left: "42%", delay: "-1.6s", duration: "5.2s" },
  { top: "0%", left: "68%", delay: "-2.1s", duration: "5.6s" },
  { top: "0%", left: "92%", delay: "-2.8s", duration: "5.3s" },
  { top: "1%", left: "12%", delay: "-3.4s", duration: "5.5s" },
  { top: "1%", left: "34%", delay: "-4.0s", duration: "5.7s" },
  { top: "1%", left: "76%", delay: "-4.8s", duration: "5.4s" },
  { top: "2%", left: "58%", delay: "-2.0s", duration: "5.7s" },
  { top: "5%", left: "88%", delay: "-3.5s", duration: "5.3s" },
  { top: "12%", left: "100%", delay: "-0.4s", duration: "5.1s" },
  { top: "28%", left: "100%", delay: "-1.8s", duration: "5.2s" },
  { top: "44%", left: "100%", delay: "-3.1s", duration: "5.8s" },
  { top: "60%", left: "100%", delay: "-4.2s", duration: "6.1s" },
  { top: "76%", left: "100%", delay: "-5.4s", duration: "5.4s" },
  { top: "92%", left: "100%", delay: "-6.6s", duration: "6.3s" },
];

export default function WorkerOnboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "NON_BINARY" | "OTHER">("OTHER");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isValidBirthDate = (value: string) => {
    const v = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [yStr, mStr, dStr] = v.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email")?.trim() ?? "";
    const inviteTokenParam = params.get("inviteToken")?.trim() ?? "";
    const existingParam = params.get("existing") === "true";
    const storedToken = sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)?.trim() ?? "";

    if (emailParam) setEmail(emailParam);
    setIsExistingUser(existingParam);

    if (inviteTokenParam) {
      setInviteToken(inviteTokenParam);
      sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, inviteTokenParam);
    } else if (storedToken) {
      setInviteToken(storedToken);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Fyll i e-post och lösenord.");
      return;
    }

    if (password.length < 8) {
      toast.error("Lösenord måste vara minst 8 tecken.");
      return;
    }

    if (!isExistingUser && password !== passwordRepeat) {
      toast.error("Lösenorden matchar inte.");
      return;
    }

    if (!isExistingUser && (!firstName.trim() || !lastName.trim())) {
      toast.error("Fyll i förnamn och efternamn.");
      return;
    }

    if (!isExistingUser && !birthDate.trim()) {
      toast.error("Fyll i födelsedatum (ÅÅÅÅ-MM-DD).");
      return;
    }
    if (!isExistingUser && !isValidBirthDate(birthDate)) {
      toast.error("Födelsedatum måste vara i formatet ÅÅÅÅ-MM-DD.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();

      if (!isExistingUser) {
        await registerUser({
          email: trimmedEmail,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          birthDate: new Date(`${birthDate.trim()}T00:00:00.000Z`).toISOString(),
        });
      }

      const loginResponse = await loginUser({ email: trimmedEmail, password });
      setAuthToken(loginResponse.token);
      setAuthEmail(trimmedEmail);

      if (loginResponse.user?.role) {
        setAuthRole(loginResponse.user.role);
      }

      if (!inviteToken) {
        toast.error("Saknar inviteToken. Be din manager skicka en ny inbjudan.");
        return;
      }

      await redeemWorkerInvite(trimmedEmail, inviteToken);
      sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);

      setIsDone(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Något gick fel.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        {shootingStars.map((star, index) => {
          const isAccent = index % 2 === 0;
          const color = isAccent ? "hsl(var(--accent))" : "hsl(var(--primary))";

          return (
            <span
              key={`${star.top}-${star.left}-${index}`}
              className="absolute h-[2px] w-36 rounded-full opacity-80"
              style={{
                top: star.top,
                left: star.left,
                background: `linear-gradient(90deg, transparent, ${color})`,
                boxShadow: `0 0 14px ${color}`,
                animation: `worker-shooting-star ${star.duration} linear ${star.delay} infinite`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes worker-shooting-star {
          0% {
            transform: translate3d(0, 0, 0) rotate(145deg);
            opacity: 0;
          }
          8% {
            opacity: 0.9;
          }
          65% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(-95vw, 120vh, 0) rotate(145deg);
            opacity: 0;
          }
        }

        @media (max-width: 492px) and (max-height: 672px) {
          .no-hover-motion,
          .no-hover-motion * {
            transition-duration: 0ms !important;
          }

          .no-hover-motion.group:hover .anim-back-arrow-wrap,
          .no-hover-motion.group:hover .anim-back-text,
          .no-hover-motion.group:hover .anim-back-line,
          .no-hover-motion.group:hover .anim-login-arrow-wrap,
          .no-hover-motion.group:hover .anim-login-text,
          .no-hover-motion.group:hover .anim-login-line {
            transform: none !important;
            opacity: 1 !important;
          }

          .anim-back-line,
          .anim-login-line {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed left-4 top-4 z-50 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
          <img src="/Icon.jpg" alt="Worker onboard icon" className="h-10 w-10 object-cover" />
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Tillbaka till inloggning"
        >
          <BackArrowLabel>Tillbaka</BackArrowLabel>
        </button>
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col px-6 pt-12 pb-6">
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
          <div className="relative z-10">
            {isDone ? (
              <div className="flex flex-col items-center text-center py-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-3xl font-bold tracking-tight">Grattis!</h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                  Företaget är kopplat med dig. Logga in på appen för att få tillgång till skannern.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isExistingUser ? "Logga in:" : "Skapa konto:"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isExistingUser
                    ? "Logga in för att kopplas till företaget som kollega."
                    : "Registrera dig för att kopplas till företaget som kollega."}
                </p>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label htmlFor="workerEmail" className="text-sm font-semibold text-foreground">E-post:</label>
                    <Input
                      id="workerEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Din e-postadress"
                      className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                    />
                  </div>

                  {!isExistingUser && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label htmlFor="workerFirstName" className="text-sm font-semibold text-foreground">Förnamn:</label>
                          <Input
                            id="workerFirstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Förnamn"
                            className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="workerLastName" className="text-sm font-semibold text-foreground">Efternamn:</label>
                          <Input
                            id="workerLastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Efternamn"
                            className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Kön:</label>
                        <Select
                          value={gender}
                          onValueChange={(v) => setGender(v as "MALE" | "FEMALE" | "NON_BINARY" | "OTHER")}
                        >
                          <SelectTrigger className="h-11 border-border bg-background text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-popover text-popover-foreground">
                            <SelectItem value="MALE">Man</SelectItem>
                            <SelectItem value="FEMALE">Kvinna</SelectItem>
                            <SelectItem value="NON_BINARY">Icke-binär</SelectItem>
                            <SelectItem value="OTHER">Annat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="workerBirthDate" className="text-sm font-semibold text-foreground">
                          Födelsedatum:
                        </label>
                        <Input
                          id="workerBirthDate"
                          type="text"
                          inputMode="numeric"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          placeholder="ÅÅÅÅ-MM-DD"
                          className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="workerPassword" className="text-sm font-semibold text-foreground">Lösenord:</label>
                    <div className="relative">
                      <Input
                        id="workerPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Lösenord"
                        className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isExistingUser && (
                    <div className="space-y-2">
                      <label htmlFor="workerPasswordRepeat" className="text-sm font-semibold text-foreground">Bekräfta lösenord:</label>
                      <div className="relative">
                        <Input
                          id="workerPasswordRepeat"
                          type={showPasswordRepeat ? "text" : "password"}
                          value={passwordRepeat}
                          onChange={(e) => setPasswordRepeat(e.target.value)}
                          placeholder="Bekräfta lösenord"
                          className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordRepeat((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPasswordRepeat ? "Dölj lösenord" : "Visa lösenord"}
                        >
                          {showPasswordRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/90"
                  >
                    <LoginArrowLabel>
                      {isSubmitting
                        ? isExistingUser ? "Loggar in..." : "Registrerar..."
                        : isExistingUser ? "Logga in" : "Registrera dig"}
                    </LoginArrowLabel>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
