import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { forgotPasswordReset, forgotPasswordToken, getUserByEmail, loginPortal, setAuthEmail, setAuthRole, setAuthToken } from "@/lib/api";
import { toast } from "sonner";


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
	const [forgotOpen, setForgotOpen] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
	const [forgotResetToken, setForgotResetToken] = useState<string | null>(null);
	const [forgotNewPassword, setForgotNewPassword] = useState("");
	const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
	const [forgotIsSubmitting, setForgotIsSubmitting] = useState(false);
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
			const response = await loginPortal({ email: trimmedEmail, password });
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
			// Helpful in dev: see full error (including tagged route info from ApiError).
			console.error("Login error:", error);
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleForgotPasswordRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		const value = forgotEmail.trim();
		if (!value) {
			toast.error("Fyll i din e-postadress.");
			return;
		}

		setForgotIsSubmitting(true);
		try {
			const res = await forgotPasswordToken({ email: value });
			const token = typeof res?.passwordResetToken === "string" ? res.passwordResetToken : "";
			if (!token) {
				throw new Error("Kunde inte skapa reset-token.");
			}
			// Token is kept only in memory and never shown to the user.
			setForgotResetToken(token);
			setForgotStep("reset");
			toast.success("Välj ett nytt lösenord.");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Kunde inte skapa reset-token.";
			toast.error(message);
		} finally {
			setForgotIsSubmitting(false);
		}
	};

	const handleForgotPasswordReset = async (e: React.FormEvent) => {
		e.preventDefault();
		const value = forgotEmail.trim();
		const token = forgotResetToken ?? "";
		const next = forgotNewPassword.trim();
		const confirm = forgotConfirmPassword.trim();

		if (!value || !token || !next || !confirm) {
			toast.error("Fyll i e-post och nytt lösenord.");
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

		setForgotIsSubmitting(true);
		try {
			await forgotPasswordReset({ email: value, token, password: next });
			toast.success("Lösenord återställt. Logga in med ditt nya lösenord.");
			setForgotOpen(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Kunde inte återställa lösenord.";
			toast.error(message);
		} finally {
			setForgotIsSubmitting(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-background text-foreground">
			<button onClick={() => navigate("/")} className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl cursor-pointer hover:scale-110 transition">
  <img src="/Icon.jpg" alt="Landingpage" className="h-10 w-10 object-cover" />
</button>

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
								<div className="flex justify-end">
									<Dialog
										open={forgotOpen}
										onOpenChange={(open) => {
											setForgotOpen(open);
											if (open) {
												setForgotStep("request");
												setForgotResetToken(null);
												setForgotNewPassword("");
												setForgotConfirmPassword("");
											}
										}}
									>
										<DialogTrigger asChild>
											<button
												type="button"
												className="text-xs font-semibold text-accent underline underline-offset-4 hover:opacity-90"
												onClick={() => {
													setForgotEmail(email.trim());
													setForgotOpen(true);
												}}
											>
												Glömt lösenord?
											</button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-md">
											<DialogHeader>
												<DialogTitle>Glömt lösenord</DialogTitle>
												<DialogDescription>
													{forgotStep === "request"
														? "Skriv din e-post så kan du välja ett nytt lösenord direkt."
														: "Välj ett nytt lösenord."}
												</DialogDescription>
											</DialogHeader>
											<form
												onSubmit={forgotStep === "request" ? handleForgotPasswordRequest : handleForgotPasswordReset}
												className="space-y-3"
											>
												<div className="space-y-2">
													<label htmlFor="forgotEmail" className="text-sm font-semibold text-foreground">
														E-post
													</label>
													<Input
														id="forgotEmail"
														value={forgotEmail}
														onChange={(e) => setForgotEmail(e.target.value)}
														disabled={forgotIsSubmitting}
														placeholder="Din e-postadress"
														className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
													/>
												</div>

												{forgotStep === "reset" && (
													<>
														<div className="space-y-2">
															<label htmlFor="forgotNewPassword" className="text-sm font-semibold text-foreground">
																Nytt lösenord
															</label>
															<Input
																id="forgotNewPassword"
																type="password"
																value={forgotNewPassword}
																onChange={(e) => setForgotNewPassword(e.target.value)}
																disabled={forgotIsSubmitting}
																placeholder="Minst 8 tecken"
																className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
															/>
														</div>
														<div className="space-y-2">
															<label htmlFor="forgotConfirmPassword" className="text-sm font-semibold text-foreground">
																Bekräfta nytt lösenord
															</label>
															<Input
																id="forgotConfirmPassword"
																type="password"
																value={forgotConfirmPassword}
																onChange={(e) => setForgotConfirmPassword(e.target.value)}
																disabled={forgotIsSubmitting}
																placeholder="Upprepa lösenord"
																className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
															/>
														</div>
													</>
												)}

												<DialogFooter className="gap-2 sm:gap-0">
													<Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
														Avbryt
													</Button>
													<Button type="submit" disabled={forgotIsSubmitting}>
														{forgotIsSubmitting ? "Jobbar…" : forgotStep === "request" ? "Fortsätt" : "Spara nytt lösenord"}
													</Button>
												</DialogFooter>
											</form>
										</DialogContent>
									</Dialog>
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