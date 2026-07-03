import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginArrowLabel } from "@/components/LoginArrowLabel";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { getUserByEmail, loginPortal, requestPasswordResetLink, setAuthEmail, setAuthRole, setAuthToken, setBusinessId, clearBusinessId } from "@/lib/api";
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
	const [forgotStep, setForgotStep] = useState<"request" | "sent">("request");
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
			if (user.businessId) {
				setBusinessId(user.businessId);
			} else {
				clearBusinessId();
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

	const resetForgotDialog = () => {
		setForgotStep("request");
		setForgotEmail("");
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
			await requestPasswordResetLink(value);
			setForgotStep("sent");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Kunde inte skicka återställningslänk.";
			toast.error(message);
		} finally {
			setForgotIsSubmitting(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-background text-foreground lg:h-screen">
			<button onClick={() => navigate("/")} className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl cursor-pointer hover:scale-110 transition">
				<img src="/icon-96.webp" alt="Landingpage" width={40} height={40} className="h-10 w-10 object-cover" />
			</button>

			<div className="relative z-10 flex min-h-screen w-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
				<div className="flex w-full items-center justify-center bg-background px-6 py-16 lg:h-full lg:w-1/2 lg:py-0">
					<h1 className="text-center text-4xl font-extrabold uppercase leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
						Logga in
						<br />
						på TooDoo
					</h1>
				</div>

				<div className="flex w-full items-center justify-center border-t border-border bg-card px-6 py-12 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:rounded-r-2xl lg:border-l lg:border-t-0 lg:py-0">
					<div className="w-full max-w-md">
						<h2 className="text-2xl font-bold tracking-tight">Logga in:</h2>
						<p className="mt-1 text-sm text-muted-foreground">Logga in för att skapa erbjudanden och redigera företags information.</p>

						<form className="mt-6 space-y-5" onSubmit={handleLogin}>
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
											if (!open) resetForgotDialog();
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
										<DialogContent hideClose className="border-border bg-card sm:max-w-md">
											<DialogHeader>
												<DialogTitle>
													{forgotStep === "request" ? "Glömt lösenord" : "Återställnings email har blivit skickat"}
												</DialogTitle>
												{forgotStep === "request" ? (
													<DialogDescription>
														Ange din e-postadress så skickar vi en länk för att återställa lösenordet.
													</DialogDescription>
												) : null}
											</DialogHeader>
											{forgotStep === "request" ? (
												<form onSubmit={handleForgotPasswordRequest} className="space-y-3">
													<div className="space-y-2">
														<label htmlFor="forgotEmail" className="text-sm font-semibold text-foreground">
															E-post
														</label>
														<Input
															id="forgotEmail"
															type="email"
															autoComplete="email"
															value={forgotEmail}
															onChange={(e) => setForgotEmail(e.target.value)}
															disabled={forgotIsSubmitting}
															placeholder="Din e-postadress"
															className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
														/>
													</div>
													<DialogFooter className="gap-2 sm:gap-0">
														<Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
															Avbryt
														</Button>
														<Button type="submit" disabled={forgotIsSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
															{forgotIsSubmitting ? "Skickar…" : "Skicka återställningslänk"}
														</Button>
													</DialogFooter>
												</form>
											) : (
												<DialogFooter>
													<Button
														type="button"
														className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
														onClick={() => setForgotOpen(false)}
													>
														Stäng
													</Button>
												</DialogFooter>
											)}
										</DialogContent>
									</Dialog>
								</div>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent px-6 text-accent-foreground font-semibold transition-colors hover:bg-accent/90"
							>
								<LoginArrowLabel>{isSubmitting ? "Loggar in" : "Logga in"}</LoginArrowLabel>
							</button>

							<Button type="button" className="h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
								Fortsätt med Google
							</Button>

							<p className="text-center text-sm text-muted-foreground">
								Har du inte ditt företag registrerat? <Link to="/registration" className="font-semibold text-accent underline">Registrera ditt företag!</Link>
							</p>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}