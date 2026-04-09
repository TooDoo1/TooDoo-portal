import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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

export default function Registration() {
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
	const [company, setCompany] = useState("");
	const [companyOpen, setCompanyOpen] = useState(false);
	const navigate = useNavigate();
	const shortDescRef = useRef<HTMLTextAreaElement>(null);
	const longDescRef = useRef<HTMLTextAreaElement>(null);
	const companyOptions = [
		{ value: "toodoo-ab", label: "TooDoo AB" },
		{ value: "ikea", label: "IKEA" },
		{ value: "hm", label: "H&M" },
		{ value: "volvo", label: "Volvo" },
		{ value: "ericsson", label: "Ericsson" },
		{ value: "spotify", label: "Spotify" },
		{ value: "skanska", label: "Skanska" },
		{ value: "sandvik", label: "Sandvik" },
		{ value: "electrolux", label: "Electrolux" },
		{ value: "atlas-copco", label: "Atlas Copco" },
		{ value: "seb", label: "SEB" },
		{ value: "swedbank", label: "Swedbank" },
		{ value: "handelsbanken", label: "Handelsbanken" },
		{ value: "ica-gruppen", label: "ICA Gruppen" },
		{ value: "coop-sverige", label: "Coop Sverige" },
		{ value: "axfood", label: "Axfood" },
		{ value: "klarna", label: "Klarna" },
		{ value: "king", label: "King" },
		{ value: "tetra-pak", label: "Tetra Pak" },
		{ value: "alfa-laval", label: "Alfa Laval" },
		{ value: "telia", label: "Telia" },
		{ value: "tele2", label: "Tele2" },
		{ value: "com-hem", label: "Com Hem" },
		{ value: "securitas", label: "Securitas" },
		{ value: "assa-abloy", label: "Assa Abloy" },
		{ value: "boliden", label: "Boliden" },
		{ value: "ssab", label: "SSAB" },
		{ value: "skf", label: "SKF" },
		{ value: "husqvarna", label: "Husqvarna" },
		{ value: "saab", label: "Saab" },
		{ value: "scania", label: "Scania" },
		{ value: "hexagon", label: "Hexagon" },
		{ value: "investor", label: "Investor" },
		{ value: "epiroc", label: "Epiroc" },
		{ value: "nibe", label: "Nibe" },
		{ value: "lifco", label: "Lifco" },
		{ value: "latour", label: "Latour" },
		{ value: "addtech", label: "Addtech" },
		{ value: "indutrade", label: "Indutrade" },
		{ value: "beijer-ref", label: "Beijer Ref" },
		{ value: "jm", label: "JM" },
		{ value: "castellum", label: "Castellum" },
		{ value: "balder", label: "Balder" },
		{ value: "fabege", label: "Fabege" },
		{ value: "kungsleden", label: "Kungsleden" },
		{ value: "peab", label: "Peab" },
		{ value: "ncc", label: "NCC" },
		{ value: "wallenstam", label: "Wallenstam" },
		{ value: "bilia", label: "Bilia" },
		{ value: "mekonomen", label: "Mekonomen" },
		{ value: "systembolaget", label: "Systembolaget" },
		{ value: "annat", label: "Annat företag" },
	];

	const handleTextareaResize = (ref: React.RefObject<HTMLTextAreaElement>) => {
		if (ref.current) {
			ref.current.style.height = 'auto';
			ref.current.style.height = ref.current.scrollHeight + 'px';
		}
	};

	const togglePassword = () => {
		setShowPassword((prev) => {
			const next = !prev;
			if (next) {
				setShowPasswordRepeat(false);
			}
			return next;
		});
	};

	const togglePasswordRepeat = () => {
		setShowPasswordRepeat((prev) => {
			const next = !prev;
			if (next) {
				setShowPassword(false);
			}
			return next;
		});
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
								animation: `registration-shooting-star ${star.duration} linear ${star.delay} infinite`,
							}}
						/>
					);
				})}
			</div>

			<style>{`
				@keyframes registration-shooting-star {
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

			<div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-12 pb-6">
				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10">
						<h1 className="text-3xl font-bold tracking-tight">Registrera dig:</h1>
						<p className="mt-1 text-sm text-muted-foreground">Skapa ett konto för att börja använda tjänsten.</p>

						<div className="mt-6 space-y-2">
							<label htmlFor="email" className="text-lg font-semibold text-foreground">E-post:</label>
							<Input
								id="email"
								placeholder="Din e-postadress"
								className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
							/>
							<div className="space-y-2 pt-2">
								<label htmlFor="phonenumber" className="text-lg font-semibold text-foreground">Telefonnummer:</label>
								<Input
									id="phonenumber"
									placeholder="Ditt telefonnummer"
									className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10 space-y-4">
						<label className="text-lg font-semibold text-foreground">Beskrivning:</label>
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="ml-0.5 text-sm font-semibold text-muted-foreground">Kort beskrivning:</label>
								<Textarea
									ref={shortDescRef}
									placeholder="Berätta lite om ditt företag och vad ni gör"
									onChange={() => handleTextareaResize(shortDescRef)}
									className="resize-none overflow-hidden bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>
							<div className="space-y-2">
								<label className="ml-0.5 text-sm font-semibold text-muted-foreground">Lång beskrivning:</label>
								<Textarea
									ref={longDescRef}
									placeholder="Berätta på en mer detaljerad nivå om ditt företag och vad ni gör"
									onChange={() => handleTextareaResize(longDescRef)}
									className="resize-none overflow-hidden bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="website" className="ml-0.5 text-sm font-semibold text-muted-foreground">Hemsida:</label>
								<Input
									id="website"
									placeholder="Ange hemsida"
									className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10 space-y-4">
						<label className="text-lg font-semibold text-foreground">Företag:</label>
						<div className="space-y-4">
							<div className="space-y-2">
								<label htmlFor="company" className="ml-0.5 text-sm font-semibold text-muted-foreground">Välj företag:</label>
								<Popover open={companyOpen} onOpenChange={setCompanyOpen}>
									<PopoverTrigger asChild>
										<button
											id="company"
											type="button"
											role="combobox"
											aria-expanded={companyOpen}
											className="h-11 w-full rounded-md border border-border bg-background px-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
										>
											{company ? companyOptions.find((option) => option.value === company)?.label : "Välj företag"}
										</button>
									</PopoverTrigger>
									<PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
										<Command>
											<CommandInput placeholder="Sök företag..." />
											<CommandList className="[scrollbar-width:thin] [scrollbar-color:hsl(var(--accent))_hsl(var(--popover))] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-popover [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-accent/80 [&::-webkit-scrollbar-thumb:hover]:bg-accent">
												<CommandEmpty>Inga företag hittades.</CommandEmpty>
												<CommandGroup>
													{companyOptions.map((option) => (
														<CommandItem
															key={option.value}
															value={option.label}
															onSelect={() => {
																setCompany(option.value);
																setCompanyOpen(false);
															}}
														>
															<Check
																className={cn("mr-2 h-4 w-4", company === option.value ? "opacity-100" : "opacity-0")}
															/>
															{option.label}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>

							<div className="space-y-2">
								<label htmlFor="companyCity" className="ml-0.5 text-sm font-semibold text-muted-foreground">Stad:</label>
								<Input
									id="companyCity"
									placeholder="Ange stad"
									className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="companyAddress" className="ml-0.5 text-sm font-semibold text-muted-foreground">Adress:</label>
								<Input
									id="companyAddress"
									placeholder="Ange adress"
									className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10 space-y-4">
						<label className="text-lg font-semibold text-foreground">Lösenord:</label>
						<div className="space-y-4">
							<div className="space-y-2">
								<label htmlFor="password" className="ml-0.5 text-sm font-semibold text-muted-foreground">Skriv ett lösenord:</label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="Välj ett lösenord"
										className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
									/>
									<button
										type="button"
										onClick={togglePassword}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										aria-label={showPassword ? "Dolj lösenord" : "Visa lösenord"}
									>
										{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
							</div>

							<div className="space-y-2">
								<label htmlFor="passwordRepeat" className="ml-0.5 text-sm font-semibold text-muted-foreground">Bekräfta lösenord:</label>
								<div className="relative">
									<Input
										id="passwordRepeat"
										type={showPasswordRepeat ? "text" : "password"}
										placeholder="Bekräfta lösenord"
										className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
									/>
									<button
										type="button"
										onClick={togglePasswordRepeat}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										aria-label={showPasswordRepeat ? "Dolj lösenord" : "Visa lösenord"}
									>
										{showPasswordRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
							</div>
						</div>

					<button onClick={() => navigate("/company")} className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/90">
						<span className="anim-submit-text pointer-events-none relative z-10 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-2">
							Registrera dig
						</span>
						<span className="anim-submit-line pointer-events-none absolute right-12 z-0 h-[1px] w-14 origin-right mr-24 scale-x-0 rounded-full bg-accent-foreground transition-transform duration-300 group-hover:scale-x-100 group-hover:translate-x-10" />
						<span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
							<ArrowRight className="anim-submit-arrow h-4 w-4 transition-transform duration-300 group-hover:translate-x-10" />
						</span>
					</button>
					</div>
				</div>
			</div>
		</div>
	);
}
