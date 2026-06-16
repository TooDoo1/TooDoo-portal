import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Mail,
	MapPin,
	Smartphone,
	Zap,
	Building2,
	Globe,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ArrowRight,
	Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginArrowLabel } from "@/components/LoginArrowLabel";

const slides = [
	"/Icon.jpg",
	"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70",
	"https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=70",
];

const iconMap: Record<string, JSX.Element> = {
	map: <MapPin className="h-7 w-7" />,
	business: <Building2 className="h-7 w-7" />,
	zap: <Zap className="h-7 w-7" />,
	globe: <Globe className="h-7 w-7" />,
};

const steps = [
	{ number: "01", title: "Skapa konto", desc: "Registrera dig gratis på några sekunder — som användare eller företag." },
	{ number: "02", title: "Utforska deals", desc: "Bläddra bland hundratals lokala erbjudanden, event och upplevelser." },
	{ number: "03", title: "Claima erbjudanden", desc: "Tryck på ett erbjudande och claima det direkt i appen innan det tar slut." },
	{ number: "04", title: "Njut", desc: "Visa upp ditt erbjudande på plats och njut av upplevelsen till rabatterat pris!" },
];

const navItems = [
	{ label: "Om oss", items: ["Om oss", "Vår idé"] },
	{ label: "Företag", items: ["För företag", "Registrera företag"] },
	{ label: "Exklusiva deals", items: ["Alla deals", "Populära deals"] },
];

type Deal = {
	icon?: string;
	title?: string;
	description?: string;
};

export default function LandingPage() {
	const navigate = useNavigate();
	const [current, setCurrent] = useState(0);
	const [scrolled, setScrolled] = useState(false);
	const [deals, setDeals] = useState<Deal[]>([]);
	const [loading, setLoading] = useState(true);
	const [step, setStep] = useState(0);
	const [openNav, setOpenNav] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const startSlider = () => {
		timerRef.current = setInterval(() => {
			setCurrent((prev) => (prev + 1) % slides.length);
		}, 5000);
	};

	const stopSlider = () => {
		if (timerRef.current) clearInterval(timerRef.current);
	};

	const nextSlide = () => {
		stopSlider();
		setCurrent((prev) => (prev + 1) % slides.length);
		startSlider();
	};
	const prevSlide = () => {
		stopSlider();
		setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
		startSlider();
	};

	const nextStep = () => setStep((prev) => (prev + 1) % steps.length);
	const prevStep = () => setStep((prev) => (prev - 1 + steps.length) % steps.length);

	useEffect(() => {
		startSlider();
		return () => stopSlider();
	}, []);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 40);
		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		let cancelled = false;

		const run = () => {
			fetch("http://83.248.14.115:4000/deals")
				.then((res) => res.json())
				.then((data) => {
					if (cancelled) return;
					setDeals(data);
					setLoading(false);
				})
				.catch((err) => {
					console.error("API error:", err);
					if (!cancelled) setLoading(false);
				});
		};

		const w = window as unknown as {
			requestIdleCallback?: (cb: () => void) => number;
			cancelIdleCallback?: (id: number) => void;
		};
		if (typeof w.requestIdleCallback === "function") {
			const id = w.requestIdleCallback(run);
			return () => {
				cancelled = true;
				try {
					w.cancelIdleCallback?.(id);
				} catch {
					/* ignore */
				}
			};
		}

		const t = window.setTimeout(run, 800);
		return () => {
			cancelled = true;
			window.clearTimeout(t);
		};
	}, []);

	useEffect(() => {
		const next = slides[(current + 1) % slides.length];
		if (!next || next.startsWith("/")) return;
		const img = new Image();
		img.decoding = "async";
		img.loading = "lazy";
		img.src = next;
	}, [current]);

	const handleNavEnter = (label: string) => {
		if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
		setOpenNav(label);
	};

	const handleNavLeave = () => {
		navTimeoutRef.current = setTimeout(() => setOpenNav(null), 120);
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* NAV */}
			<nav
				className={cn(
					"fixed inset-x-0 top-0 z-50 transition-colors duration-300",
					scrolled ? "border-b border-border bg-background/85 backdrop-blur" : "border-b border-transparent",
				)}
			>
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
					<button
						onClick={() => navigate("/")}
						className="flex items-center gap-3 transition-opacity hover:opacity-90"
						aria-label="TooDoo hem"
					>
						<img src="/Icon.jpg" alt="TooDoo" className="h-9 w-9 rounded-lg object-cover" />
						<span className="text-xl font-extrabold tracking-tight">
							Too<span className="text-primary">Doo</span>
						</span>
					</button>

					<div className="hidden items-center gap-1 lg:flex">
						{navItems.map((nav) => (
							<div
								key={nav.label}
								className="relative"
								onMouseEnter={() => handleNavEnter(nav.label)}
								onMouseLeave={handleNavLeave}
							>
								<button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
									{nav.label}
									<ChevronDown
										size={14}
										className={cn("opacity-60 transition-transform duration-200", openNav === nav.label && "rotate-180")}
									/>
								</button>
								<div
									className={cn(
										"absolute left-1/2 top-full z-40 mt-2 min-w-[180px] -translate-x-1/2 rounded-xl border border-border bg-popover p-1.5 shadow-xl transition-all duration-200",
										openNav === nav.label
											? "pointer-events-auto translate-y-0 opacity-100"
											: "pointer-events-none -translate-y-1 opacity-0",
									)}
								>
									{nav.items.map((item) => (
										<div
											key={item}
											className="cursor-pointer rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
										>
											{item}
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => navigate("/registration")}
							className="hidden h-10 items-center rounded-lg border border-border bg-transparent px-4 text-sm font-semibold transition-colors hover:bg-secondary sm:inline-flex"
						>
							Registrera ditt företag
						</button>
						<button
							onClick={() => navigate("/login")}
							className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
						>
							Logga in
						</button>
					</div>
				</div>
			</nav>

			{/* HERO */}
			<section className="relative overflow-hidden pt-20 pb-16 lg:pt-24 lg:pb-20">
				<div
					aria-hidden
					className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-accent/15 to-transparent blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] -translate-x-1/3 rounded-full bg-accent/10 blur-3xl"
				/>

				<div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.95fr_1.2fr] lg:items-center">
					<div className="flex flex-col gap-6">
						

						<h1 className="text-4xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
							Hitta de bästa
							<br />
							<span className="text-primary">upplevelserna</span> nära dig
						</h1>

						<p className="max-w-lg text-base text-muted-foreground sm:text-lg">
							TooDoo samlar alla erbjudanden från företag i din stad — spara tid och pengar, och upptäck nya favoriter samtidigt.
						</p>

						<div className="mt-2 flex flex-wrap gap-3">
							<button
								onClick={() => navigate("/login")}
								className="group no-hover-motion relative inline-flex h-12 items-center justify-center overflow-hidden rounded-lg bg-accent pl-7 pr-10 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
							>
								<LoginArrowLabel>Kom igång</LoginArrowLabel>
							</button>
							<button className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-7 text-sm font-semibold transition-colors hover:bg-secondary">
								Ladda ner appen
							</button>
						</div>

						<div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
							<div>
								<div className="text-xl font-extrabold text-foreground">500+</div>
								<div>Lokala företag</div>
							</div>
							<div className="h-10 w-px bg-border" />
							<div>
								<div className="text-xl font-extrabold text-foreground">10k+</div>
								<div>Aktiva användare</div>
							</div>
							<div className="h-10 w-px bg-border" />
							<div>
								<div className="text-xl font-extrabold text-foreground">1k+</div>
								<div>Deals i veckan</div>
							</div>
						</div>
					</div>

					<div className="relative mx-auto w-full lg:mx-0 lg:-mr-16 xl:-mr-24">
						<div className="relative aspect-[4/5] min-h-[420px] w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10 sm:min-h-[480px] lg:min-h-[560px] lg:max-h-[72vh] lg:rounded-l-none lg:rounded-r-[2rem] lg:border-l-0">
						{slides.map((slide, i) => (
							<div
								key={slide}
								className={cn(
									"absolute inset-0 bg-cover bg-center transition-opacity duration-700",
									i === current ? "opacity-100" : "opacity-0",
								)}
								style={{ backgroundImage: `url(${slide})` }}
							/>
						))}
						<div
							aria-hidden
							className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-background via-background/75 via-[22%] to-transparent"
						/>
						<div
							aria-hidden
							className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-background/50 via-transparent to-transparent"
						/>

						<button
							onClick={prevSlide}
							className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground backdrop-blur transition-colors hover:bg-background/60"
							aria-label="Föregående"
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button
							onClick={nextSlide}
							className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground backdrop-blur transition-colors hover:bg-background/60"
							aria-label="Nästa"
						>
							<ChevronRight className="h-5 w-5" />
						</button>

						<div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2">
							{slides.map((_, i) => (
								<button
									key={i}
									onClick={() => {
										stopSlider();
										setCurrent(i);
										startSlider();
									}}
									aria-label={`Bild ${i + 1}`}
									className={cn(
										"h-2 rounded-full transition-all duration-300",
										i === current ? "w-8 bg-primary" : "w-2 bg-white/50 hover:bg-white/70",
									)}
								/>
							))}
						</div>
						</div>
					</div>
				</div>
			</section>

			{/* APP */}
			<section className="border-y border-border bg-card/40 py-20">
				<div className="mx-auto max-w-3xl px-6 text-center">
					<p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Appen</p>
					<h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
						Allt du behöver — i fickan
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
						TooDoo-appen ger dig tillgång till exklusiva erbjudanden från lokala företag, direkt i din smartphone.
						Claima deals, utforska event och spara pengar — var du än är.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<button className="group inline-flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-border/80 hover:bg-secondary">
							<img
								src="/Google_Play_2022_icon.svg"
								alt=""
								aria-hidden
								className="h-[22px] w-[22px] shrink-0 object-contain"
							/>
							<div className="text-left leading-none">
								<div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hämta på</div>
								<div className="mt-1 text-sm font-bold">Google Play</div>
							</div>
						</button>

						<button className="group inline-flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-border/80 hover:bg-secondary">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-foreground">
								<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.76.03 2.99 2.63 3.99 2.66 4l-.08.26zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
							</svg>
							<div className="text-left leading-none">
								<div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ladda ner på</div>
								<div className="mt-1 text-sm font-bold">App Store</div>
							</div>
						</button>
					</div>
				</div>
			</section>

			{/* STEPS */}
			<section className="py-20">
				<div className="mx-auto max-w-3xl px-6 text-center">
					<p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Guide</p>
					<h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">Så här fungerar det</h2>

					<div className="relative mt-10 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl shadow-black/20 sm:p-12">
						<div className="mb-8 flex justify-center gap-2">
							{steps.map((_, i) => (
								<button
									key={i}
									onClick={() => setStep(i)}
									aria-label={`Steg ${i + 1}`}
									className={cn(
										"h-2 rounded-full transition-all duration-300",
										i === step ? "w-8 bg-primary" : "w-2 bg-secondary hover:bg-secondary/70",
									)}
								/>
							))}
						</div>
						<div className="text-6xl font-extrabold leading-none text-primary/20 sm:text-7xl">
							{steps[step].number}
						</div>
						<h3 className="mt-3 text-2xl font-bold">{steps[step].title}</h3>
						<p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
							{steps[step].desc}
						</p>

						<div className="mt-8 flex justify-center gap-3">
							<button
								onClick={prevStep}
								aria-label="Föregående steg"
								className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-secondary"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
							<button
								onClick={nextStep}
								aria-label="Nästa steg"
								className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* DEALS */}
			<section className="border-y border-border bg-card/40 py-20">
				<div className="mx-auto max-w-6xl px-6">
					<div className="mb-10 text-center">
						<p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Erbjudanden</p>
						<h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">Utvalda deals</h2>
					</div>

					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{loading ? (
							<>
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className="h-44 animate-pulse rounded-2xl border border-border bg-background/40"
									/>
								))}
							</>
						) : deals.length > 0 ? (
							deals.map((deal, i) => (
								<div
									key={i}
									className="group cursor-pointer rounded-2xl border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
								>
									<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										{iconMap[deal.icon ?? ""] ?? <Zap className="h-7 w-7" />}
									</div>
									<h3 className="mt-4 text-lg font-bold">{deal.title}</h3>
									<p className="mt-2 text-sm text-muted-foreground">{deal.description}</p>
								</div>
							))
						) : (
							<>
								<div className="group cursor-pointer rounded-2xl border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
									<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<Globe className="h-7 w-7" />
									</div>
									<h3 className="mt-4 text-lg font-bold">Hitta upplevelser nära dig</h3>
									<p className="mt-2 text-sm text-muted-foreground">Utforska lokala aktiviteter och event.</p>
								</div>
								<div className="group relative cursor-pointer rounded-2xl border border-primary/40 bg-primary/5 p-7 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
									<div className="absolute right-5 top-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
										Företag
									</div>
									<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
										<Building2 className="h-7 w-7" />
									</div>
									<h3 className="mt-4 text-lg font-bold">Är du ett företag?</h3>
									<p className="mt-2 text-sm text-muted-foreground">
										Nå tusentals användare med dina erbjudanden.
									</p>
									<button
										onClick={() => navigate("/registration")}
										className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-90"
									>
										Registrera ditt företag <ArrowRight className="h-4 w-4" />
									</button>
								</div>
								<div className="group cursor-pointer rounded-2xl border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
									<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<Zap className="h-7 w-7" />
									</div>
									<h3 className="mt-4 text-lg font-bold">Exklusiva deals</h3>
									<p className="mt-2 text-sm text-muted-foreground">Tidsbegränsade erbjudanden varje dag.</p>
								</div>
							</>
						)}
					</div>
				</div>
			</section>

			{/* CONTACT */}
			<section className="py-20">
				<div className="mx-auto max-w-3xl px-6 text-center">
					<p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Kontakt</p>
					<h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">Hör av dig</h2>
					<p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
						Vi älskar att höra från er — oavsett om ni har frågor, idéer eller bara vill säga hej.
					</p>

					<div className="mt-10 grid gap-4 sm:grid-cols-3">
						{[
							{ icon: <Mail className="h-5 w-5" />, label: "info@toodoo.se" },
							{ icon: <MapPin className="h-5 w-5" />, label: "Helsingborg" },
							{ icon: <Smartphone className="h-5 w-5" />, label: "@toodoo.se" },
						].map((item, i) => (
							<div
								key={i}
								className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
							>
								<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									{item.icon}
								</div>
								<p className="text-sm font-medium">{item.label}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="border-t border-border bg-card/30 py-10">
				<div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
					<div className="flex items-center gap-3">
						<img src="/Icon.jpg" alt="TooDoo" className="h-8 w-8 rounded-lg object-cover" />
						<span className="text-lg font-extrabold tracking-tight">
							Too<span className="text-primary">Doo</span>
						</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
						{["Om oss", "Kontakt", "Företagsportal"].map((label) => (
							<span key={label} className="cursor-pointer transition-colors hover:text-foreground">
								{label}
							</span>
						))}
					</div>
					<p className="text-xs text-muted-foreground">© 2026 TooDoo. Alla rättigheter förbehållna.</p>
				</div>
			</footer>
		</div>
	);
}
