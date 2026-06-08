import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { getUserByEmail, loginPortal, redeemManagerInvite, registerManager, setAuthEmail, setAuthRole, setAuthToken, setBusinessId } from "@/lib/api";
import { toast } from "sonner";

const INVITE_TOKEN_STORAGE_KEY = "toodoo_manager_invite_token";

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

export default function ManagerRegistration() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email")?.trim() ?? "";
    const inviteTokenParam = params.get("inviteToken")?.trim() ?? "";
    const storedInviteToken = sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY)?.trim() ?? "";

    if (emailParam) {
      setEmail(emailParam);
    }

    if (inviteTokenParam) {
      setInviteToken(inviteTokenParam);
      sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, inviteTokenParam);
    } else if (storedInviteToken) {
      setInviteToken(storedInviteToken);
    }
  }, [location.search]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password || !passwordRepeat) {
      toast.error("Fyll i e-post och lösenord.");
      return;
    }

    if (password.length < 8) {
      toast.error("Lösenord måste vara minst 8 tecken.");
      return;
    }

    if (password !== passwordRepeat) {
      toast.error("Lösenorden matchar inte.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();

      if (!inviteToken) {
        toast.error("Saknar inviteToken. Be admin skicka en ny inbjudan.");
        return;
      }

      const bindBusiness = async () => {
        await redeemManagerInvite(trimmedEmail, inviteToken);
        sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
        const refreshedUser = await getUserByEmail(trimmedEmail);
        if (refreshedUser.businessId) {
          setBusinessId(refreshedUser.businessId);
        }
      };

      const finishLogin = async (successMessage: string) => {
        const loginResponse = await loginPortal({ email: trimmedEmail, password });
        setAuthToken(loginResponse.token);
        setAuthEmail(trimmedEmail);

        const user = await getUserByEmail(trimmedEmail);
        if (typeof user.role === "string") {
          setAuthRole(user.role);
        }

        await bindBusiness();

        toast.success(successMessage);
        navigate("/company");
      };

      try {
        await registerManager({
          email: trimmedEmail,
          password,
        });

        await finishLogin("Managerkonto skapat och kopplat till företaget.");
      } catch (registerError) {
        const message = registerError instanceof Error ? registerError.message.toLowerCase() : "";

        if (!message.includes("exist") && !message.includes("taken") && !message.includes("already")) {
          throw registerError;
        }

        await finishLogin("Managerkonto hittades och kopplades till företaget.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa managerkonto.";
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
                animation: `manager-shooting-star ${star.duration} linear ${star.delay} infinite`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes manager-shooting-star {
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

          .no-hover-motion.group:hover .anim-back-arrow,
          .no-hover-motion.group:hover .anim-submit-arrow,
          .no-hover-motion.group:hover .anim-back-text,
          .no-hover-motion.group:hover .anim-submit-text,
          .no-hover-motion.group:hover .anim-submit-line {
            transform: none !important;
            opacity: 1 !important;
          }

          .no-hover-motion.group:hover .anim-back-line {
            transform: scaleX(0) !important;
          }

          .anim-back-line,
          .anim-submit-line {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed left-4 top-4 z-50 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
          <img src="/Icon.jpg" alt="Registration icon" className="h-10 w-10 object-cover" />
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Tillbaka till inloggning"
        >
          <span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
            <ArrowLeft className="anim-back-arrow h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </span>
          <span className="anim-back-line pointer-events-none absolute left-4 right-4 z-0 h-[1px] origin-left scale-x-0 rounded-full bg-foreground transition-transform duration-300 group-hover:scale-x-100" />
          <span className="anim-back-text pointer-events-none relative z-10 ml-1 whitespace-nowrap transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-0">
            Tillbaka
          </span>
        </button>
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col px-6 pt-12 pb-6">
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight">Manager registrering:</h1>
            <p className="mt-1 text-sm text-muted-foreground">Skapa managerkonto med e-post och lösenord.</p>

            <form className="mt-6 space-y-5" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label htmlFor="managerEmail" className="text-sm font-semibold text-foreground">E-post:</label>
                <Input
                  id="managerEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Manager e-postadress"
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="managerPassword" className="text-sm font-semibold text-foreground">Lösenord:</label>
                <div className="relative">
                  <Input
                    id="managerPassword"
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
                    aria-label={showPassword ? "Dolj lösenord" : "Visa lösenord"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="managerPasswordRepeat" className="text-sm font-semibold text-foreground">Bekräfta lösenord:</label>
                <div className="relative">
                  <Input
                    id="managerPasswordRepeat"
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
                    aria-label={showPasswordRepeat ? "Dolj lösenord" : "Visa lösenord"}
                  >
                    {showPasswordRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/90"
              >
                <span className="anim-submit-text pointer-events-none relative z-10 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-2">
                  {isSubmitting ? "Registrerar" : "Registrera dig"}
                </span>
                <span className="anim-submit-line pointer-events-none absolute right-12 z-0 h-[1px] w-14 origin-right mr-24 scale-x-0 rounded-full bg-accent-foreground transition-transform duration-300 group-hover:scale-x-100 group-hover:translate-x-10" />
                <span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
                  <ArrowRight className="anim-submit-arrow h-4 w-4 transition-transform duration-300 group-hover:translate-x-10" />
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
