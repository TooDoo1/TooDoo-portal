import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserByEmail, loginUser, setAuthEmail, setAuthRole, setAuthToken } from "@/lib/api";
import { toast } from "sonner";

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

function getJwtRole(token: string): string | null {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
		const decoded = JSON.parse(atob(padded)) as { role?: unknown };
		return typeof decoded.role === "string" ? decoded.role : null;
	} catch {
		return null;
	}
}

export default function LoggIn() {
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim() || !password.trim()) {
			toast.error("Fyll i e-post och lösenord.");
			return;
		}

		setIsSubmitting(true);
		try {
			const trimmedEmail = email.trim();
			const response = await loginUser({ email: trimmedEmail, password });
			setAuthToken(response.token);
			const user = await getUserByEmail(trimmedEmail);
			const role = typeof user.role === "string" ? user.role : getJwtRole(response.token);
			setAuthEmail(trimmedEmail);
			if (role) {
				setAuthRole(role);
			}
			toast.success("Inloggning lyckades.");
			if (role?.toLowerCase() === "admin") {
				navigate("/admin");
			} else {
				navigate("/company");
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Kunde inte logga in.";
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
								animation: `login-shooting-star ${star.duration} linear ${star.delay} infinite`,
							}}
						/>
					);
				})}
			</div>

			<style>{`
				@keyframes login-shooting-star {
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

					.no-hover-motion.group:hover .anim-login-arrow,
					.no-hover-motion.group:hover .anim-login-text,
					.no-hover-motion.group:hover .anim-login-line {
						transform: none !important;
						opacity: 1 !important;
					}

					.anim-login-line {
						display: none !important;
					}
				}
			`}</style>

			<div className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
				<img src="/Icon.jpg" alt="Login" className="h-10 w-10 object-cover" />
			</div>

			<div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col px-6 pt-12 pb-6">
				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10">
						<h1 className="text-3xl font-bold tracking-tight">Logga in:</h1>
						<p className="mt-1 text-sm text-muted-foreground">Logga in för att skapa erbjudanden och redigera företags information.</p>

						<form className="mt-2 space-y-5" onSubmit={handleLogin}>
							<div className="space-y-2">
								<label htmlFor="email" className="text-sm font-semibold text-foreground">E-post:</label>
								<Input
									id="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder=" Din e-postadress"
									className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="password" className="text-sm font-semibold text-foreground">Lösenord:</label>
								<div className="relative">
									<Input
										id="password"
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

							<button
								type="submit"
								disabled={isSubmitting}
								className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/90"
							>
								<span className="anim-login-text pointer-events-none mr-1 relative z-10 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-2">
									{isSubmitting ? "Loggar in" : "Logga in"}
								</span>
								<span className="anim-login-line pointer-events-none absolute right-12 z-0 h-[1px] w-14 origin-right mr-28 scale-x-0 rounded-full bg-accent-foreground transition-transform duration-300 group-hover:scale-x-100 group-hover:translate-x-9" />
								<span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
									<ArrowRight className="anim-login-arrow h-4 w-4 transition-transform duration-300 group-hover:translate-x-10" />
								</span>
							</button>
						</form>
					</div>
				</div>

				<div className="relative mx-auto mt-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10">
						<Button className="h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
							Fortsätt med Google
						</Button>

						<p className="mt-4 text-center text-sm text-muted-foreground">
							Har du inte ditt företag registrerat? <Link to="/registration" className="font-semibold text-accent underline">Registrera ditt företag!</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}