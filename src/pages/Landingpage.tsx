import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Mail,
	MapPin,
	Smartphone,
	Zap,
	Building2,
	Globe,
	ArrowRight,
	Menu,
	X,
	Sparkles,
	Tag,
	CalendarHeart,
	BadgePercent,
	ShieldCheck,
	Heart,
	ChevronLeft,
	ChevronDown,
	Share2,
	Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api";
import { LoginArrowLabel } from "@/components/LoginArrowLabel";
import { useLegalModals } from "@/components/CookieConsent";

const iconMap: Record<string, JSX.Element> = {
	map: <MapPin className="h-6 w-6" />,
	business: <Building2 className="h-6 w-6" />,
	zap: <Zap className="h-6 w-6" />,
	globe: <Globe className="h-6 w-6" />,
};

const navLinks = [
	{ label: "Hur det fungerar", href: "#guide" },
	{ label: "Appen", href: "#appen" },
	{ label: "Erbjudanden", href: "#erbjudanden" },
	{ label: "Kontakt", href: "#kontakt" },
];

const audiences = [
	{
		id: "user",
		badge: "För dig",
		prefix: "Upptäck stadens",
		words: ["bästa deals", "lokala event", "nya upplevelser"],
		suffix: "nära dig",
		subtitle:
			"TooDoo samlar erbjudanden, event och upplevelser från lokala företag — på ett ställe. Spara tid, spara pengar och hitta nya favoriter.",
		cta: { label: "Kom igång gratis", to: "#appen" },
		trust: [
			{ icon: <BadgePercent className="h-4 w-4" />, label: "Gratis att börja" },
			{ icon: <ShieldCheck className="h-4 w-4" />, label: "Inga bindningstider" },
			{ icon: <MapPin className="h-4 w-4" />, label: "100% lokalt" },
		],
	},
	{
		id: "company",
		badge: "För företag",
		prefix: "Nå fler",
		words: ["kunder", "gäster", "bokningar", "intäkter"],
		suffix: "till ditt företag",
		subtitle:
			"Med TooDoo skapar du erbjudanden som syns för tusentals lokala användare. Fyll lediga tider, bygg lojalitet och väx ditt företag — helt utan bindningstid.",
		cta: { label: "Registrera företag", to: "/registration" },
		trust: [
			{ icon: <BadgePercent className="h-4 w-4" />, label: "Gratis att komma igång" },
			{ icon: <ShieldCheck className="h-4 w-4" />, label: "Inga bindningstider" },
			{ icon: <MapPin className="h-4 w-4" />, label: "Lokala kunder" },
		],
	},
];

const heroHighlightMinWidth: Record<(typeof audiences)[number]["id"], string> = {
	user: "min-w-[10.5rem] sm:min-w-[12rem]",
	company: "min-w-[7.5rem] sm:min-w-[9rem]",
};

function HeroRotatingCopy({
	audience,
	wordIndex,
	onCta,
}: {
	audience: number;
	wordIndex: number;
	onCta: (to: string) => void;
}) {
	return (
		<>
			<div className="relative h-8 w-full">
				{audiences.map((a, i) => (
					<span
						key={a.id}
						aria-hidden={i !== audience}
						className={cn(
							"inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-opacity duration-500",
							i === audience
								? "relative opacity-100"
								: "pointer-events-none absolute left-0 top-0 opacity-0",
						)}
					>
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
						</span>
						{a.badge}
					</span>
				))}
			</div>

			<h1 className="relative min-h-[8.75rem] w-full text-balance text-[clamp(2.5rem,6.4vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight sm:min-h-[7.5rem] lg:min-h-[6.25rem]">
				{audiences.map((a, i) => (
					<span
						key={a.id}
						aria-hidden={i !== audience}
						className={cn(
							"block w-full transition-opacity duration-500",
							i === audience
								? "relative opacity-100"
								: "pointer-events-none absolute inset-0 opacity-0",
						)}
					>
						{a.prefix}{" "}
						<span
							key={i === audience ? `word-${wordIndex}` : `word-${a.id}`}
							className={cn(
								"inline-block bg-gradient-to-r from-primary to-accent bg-clip-text pb-[0.12em] leading-[1.15] text-transparent",
								heroHighlightMinWidth[a.id],
								i === audience && "animate-word-in",
							)}
						>
							{i === audience ? a.words[wordIndex] : a.words[0]}
						</span>
						<br />
						{a.suffix}
					</span>
				))}
			</h1>

			<div className="relative min-h-[7.25rem] w-full max-w-lg sm:min-h-[5.5rem]">
				{audiences.map((a, i) => (
					<p
						key={a.id}
						aria-hidden={i !== audience}
						className={cn(
							"text-pretty text-base text-muted-foreground transition-opacity duration-500 sm:text-lg",
							i === audience
								? "opacity-100"
								: "pointer-events-none absolute inset-0 opacity-0",
						)}
					>
						{a.subtitle}
					</p>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<div className="relative h-12 min-w-[12.5rem]">
					{audiences.map((a, i) => (
						<button
							key={a.id}
							type="button"
							aria-hidden={i !== audience}
							tabIndex={i === audience ? 0 : -1}
							onClick={() => onCta(a.cta.to)}
							className={cn(
								"group no-hover-motion relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-accent pl-7 pr-10 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-opacity duration-500 hover:bg-accent/90",
								i === audience
									? "opacity-100"
									: "pointer-events-none absolute left-0 top-0 opacity-0",
							)}
						>
							<LoginArrowLabel>{a.cta.label}</LoginArrowLabel>
						</button>
					))}
				</div>
				<a
					href="#guide"
					className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-7 text-sm font-semibold transition-colors hover:bg-secondary"
				>
					Se hur det fungerar
				</a>
			</div>

			<div className="relative min-h-[4.75rem] w-full sm:min-h-[2.75rem]">
				{audiences.map((a, i) => (
					<ul
						key={a.id}
						aria-hidden={i !== audience}
						className={cn(
							"flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 transition-opacity duration-500",
							i === audience
								? "opacity-100"
								: "pointer-events-none absolute inset-0 opacity-0",
						)}
					>
						{a.trust.map((item) => (
							<li key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
								<span className="text-success">{item.icon}</span>
								{item.label}
							</li>
						))}
					</ul>
				))}
			</div>
		</>
	);
}

const marqueeItems = [
	"Restauranger",
	"Caféer",
	"Bagerier",
	"Spa & Wellness",
	"Event",
	"Gym & Träning",
	"Skönhet",
	"Upplevelser",
	"Nattliv",
	"Aktiviteter",
];

const features = [
	{
		icon: <Tag className="h-5 w-5" />,
		title: "Exklusiva deals",
		desc: "Rabatter och erbjudanden du bara hittar i TooDoo — uppdaterade varje dag.",
	},
	{
		icon: <CalendarHeart className="h-5 w-5" />,
		title: "Lokala event",
		desc: "Upptäck aktiviteter och upplevelser nära dig och claima din plats direkt.",
	},
	{
		icon: <Zap className="h-5 w-5" />,
		title: "Claima på sekunder",
		desc: "Tryck, claima och visa upp i kassan. Inga koder att leta efter.",
	},
	{
		icon: <Globe className="h-5 w-5" />,
		title: "Hela din stad",
		desc: "Allt från caféer till upplevelser, samlat på ett ställe.",
	},
];

const steps = [
	{ number: "01", title: "Skapa konto", desc: "Registrera dig gratis på några sekunder — som användare eller företag." },
	{ number: "02", title: "Utforska deals", desc: "Bläddra bland hundratals lokala erbjudanden, event och upplevelser." },
	{ number: "03", title: "Claima erbjudanden", desc: "Tryck på ett erbjudande och claima det direkt i appen innan det tar slut." },
	{ number: "04", title: "Njut", desc: "Visa upp ditt erbjudande på plats och njut till rabatterat pris!" },
];

const phoneScreens = [
	{
		name: "Green Spoon Bistro",
		address: "Drottninggatan 12, Helsingborg",
		phone: "+46 70 100 10 01",
		hours: "Idag 09:00 – 17:00",
		image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=70",
		deal: "50% rabatt på bakverk",
		price: "15 kr",
		oldPrice: "30 kr",
		claimed: 3,
		total: 10,
	},
	{
		name: "Café Lykke",
		address: "Stortorget 3, Helsingborg",
		phone: "+46 70 300 30 03",
		hours: "Idag 08:00 – 18:00",
		image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=70",
		deal: "Köp 1 få 1 fika",
		price: "45 kr",
		oldPrice: "90 kr",
		claimed: 8,
		total: 20,
	},
	{
		name: "Nordic Spa & Wellness",
		address: "Kungsgatan 8, Helsingborg",
		phone: "+46 70 200 20 02",
		hours: "Idag 10:00 – 20:00",
		image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=70",
		deal: "Massage 60 min",
		price: "499 kr",
		oldPrice: "799 kr",
		claimed: 6,
		total: 15,
	},
];

function PhoneScreenPanel({ screen, active }: { screen: (typeof phoneScreens)[number]; active: boolean }) {
	return (
		<div
			className={cn(
				"absolute inset-0 flex flex-col transition-opacity duration-700",
				active ? "opacity-100" : "opacity-0",
			)}
			aria-hidden={!active}
		>
			<div className="relative h-[34%] min-h-[8.5rem] w-full shrink-0 overflow-hidden">
				<img src={screen.image} alt={screen.name} loading="lazy" className="h-full w-full object-cover" />
				<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
				<span className="absolute left-4 top-9 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 text-white backdrop-blur">
					<ChevronLeft className="h-4 w-4" />
				</span>
				<span className="absolute right-4 top-9 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 text-white backdrop-blur">
					<Heart className="h-4 w-4" />
				</span>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3.5 pt-2.5">
				<div className="shrink-0">
					<h3 className="text-[15px] font-extrabold leading-tight">{screen.name}</h3>
					<p className="mt-2 text-[10px] font-medium leading-relaxed text-foreground/90">
						Adress: {screen.address}
					</p>
					<p className="mt-1 pb-5 text-[10px] font-medium leading-relaxed text-foreground/90">
						Telefon: <span className="text-accent underline">{screen.phone}</span>
					</p>
				</div>

				<div className="grid shrink-0 grid-cols-2 gap-2.5">
					<div className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[10px] font-bold text-background">
						<MapPin className="h-3 w-3" /> Hitta hit
					</div>
					<div className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[10px] font-bold text-background">
						<Globe className="h-3 w-3" /> Webbplats
					</div>
				</div>

				<div className="shrink-0 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-success" />
						<div className="leading-snug">
							<p className="text-[10px] font-bold">Öppet</p>
							<p className="mt-0.5 text-[9px] text-muted-foreground">{screen.hours}</p>
						</div>
					</div>
					<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
				</div>

				<div className="shrink-0 rounded-xl border border-border bg-card p-3">
					<div className="flex gap-3">
						<div className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-lg">
							<img src={screen.image} alt="" aria-hidden className="h-full w-full object-cover" />
							<span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background/70 text-white">
								<Share2 className="h-2 w-2" />
							</span>
							<span className="absolute inset-x-0 bottom-0 bg-background/80 py-0.5 text-center text-[7px] font-semibold text-white">
								462:44:24
							</span>
						</div>
						<div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
							<p className="text-[10px] font-semibold leading-snug text-muted-foreground">{screen.deal}</p>
							<p className="text-[10px]">
								<span className="font-extrabold text-muted-foreground">{screen.price}</span>{" "}
								<span className="text-accent line-through">{screen.oldPrice}</span>
							</p>
							<p className="text-[9px] text-muted-foreground">
								Claimade: {screen.claimed} / {screen.total}
							</p>
							<div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
								<span
									className="block h-full rounded-full bg-primary"
									style={{ width: `${Math.round((screen.claimed / screen.total) * 100)}%` }}
								/>
							</div>
						</div>
					</div>
					<button
						aria-hidden
						tabIndex={-1}
						className="mt-3 w-full rounded-full bg-primary py-2.5 text-[10px] font-bold text-primary-foreground"
					>
						Logga in för att claima!
					</button>
				</div>
			</div>
		</div>
	);
}

type Deal = {
	icon?: string;
	title?: string;
	description?: string;
};

/** Reveal children with a fade-up transition once they scroll into view. */
function Reveal({
	children,
	className,
	delay = 0,
}: {
	children: React.ReactNode;
	className?: string;
	delay?: number;
}) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					io.disconnect();
				}
			},
			{ threshold: 0.15 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			style={{ transitionDelay: `${delay}ms` }}
			className={cn(
				"transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
				visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
				className,
			)}
		>
			{children}
		</div>
	);
}

function MarqueeRow({ reverse }: { reverse?: boolean }) {
	const copies = 4;

	return (
		<div className="overflow-hidden">
			<div
				className={cn(
					"flex w-max pause-on-hover",
					reverse ? "animate-marquee-reverse" : "animate-marquee",
				)}
				style={reverse ? { marginLeft: "-4rem" } : undefined}
			>
				{Array.from({ length: copies }).map((_, copyIndex) => (
					<div key={copyIndex} className="flex shrink-0 items-center gap-3 pr-3">
						{marqueeItems.map((item) => (
							<span key={`${copyIndex}-${item}`} className="flex items-center gap-3">
								<span className="whitespace-nowrap rounded-full border border-border bg-card/50 px-5 py-2 text-sm font-semibold text-muted-foreground">
									{item}
								</span>
								<Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/60" />
							</span>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function SectionHeading({
	eyebrow,
	title,
	subtitle,
	align = "center",
}: {
	eyebrow: string;
	title: string;
	subtitle?: string;
	align?: "center" | "left";
}) {
	return (
		<div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}>
			<span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
				{eyebrow}
			</span>
			<h2 className="mt-4 text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-extrabold leading-[1.1] tracking-tight">
				{title}
			</h2>
			{subtitle ? (
				<p className={cn("mt-4 text-base text-muted-foreground sm:text-lg", align === "center" && "mx-auto max-w-xl")}>
					{subtitle}
				</p>
			) : null}
		</div>
	);
}

export default function LandingPage() {
	const navigate = useNavigate();
	const { openPrivacyPolicy, openTermsOfService, openCookiePolicy, openCookieSettings } = useLegalModals();
	const [scrolled, setScrolled] = useState(false);
	const [deals, setDeals] = useState<Deal[]>([]);
	const [loading, setLoading] = useState(true);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [audience, setAudience] = useState(0);
	const [wordIndex, setWordIndex] = useState(0);
	const [activeScreen, setActiveScreen] = useState(0);
	const [activeStep, setActiveStep] = useState(0);
	const audienceRef = useRef(0);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		audienceRef.current = audience;
	}, [audience]);

	// cycle through a few highlight words, then swap the whole pitch (users <-> companies)
	useEffect(() => {
		const t = setInterval(() => {
			setWordIndex((w) => {
				const words = audiences[audienceRef.current].words;
				if (w + 1 < words.length) {
					return w + 1;
				}
				setAudience((a) => (a + 1) % audiences.length);
				return 0;
			});
		}, 2200);
		return () => clearInterval(t);
	}, []);

	// auto-cycling phone screens
	useEffect(() => {
		const t = setInterval(() => setActiveScreen((i) => (i + 1) % phoneScreens.length), 3800);
		return () => clearInterval(t);
	}, []);

	// auto-advancing step highlight
	useEffect(() => {
		const t = setInterval(() => setActiveStep((i) => (i + 1) % steps.length), 2600);
		return () => clearInterval(t);
	}, []);

	useEffect(() => {
		let cancelled = false;

		const run = () => {
			fetch(`${getApiBaseUrl()}/deals`)
				.then((res) => {
					if (!res.ok) throw new Error(`Deals request failed (${res.status})`);
					return res.json();
				})
				.then((data) => {
					if (cancelled) return;
					setDeals(Array.isArray(data) ? data : []);
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

	return (
		<div className="min-h-screen overflow-x-hidden bg-background text-foreground">
			{/* NAV */}
			<nav
				className={cn(
					"fixed inset-x-0 top-0 z-50 transition-all duration-300",
					scrolled || mobileOpen
						? "border-b border-border bg-background/80 backdrop-blur-xl"
						: "border-b border-transparent",
				)}
			>
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
					<button
						onClick={() => navigate("/")}
						className="flex items-center gap-3 transition-opacity hover:opacity-90"
						aria-label="TooDoo hem"
					>
						<img src="/Icon.jpg" alt="TooDoo" className="h-9 w-9 rounded-xl object-cover ring-1 ring-border" />
						<span className="text-xl font-extrabold tracking-tight">
							Too<span className="text-primary">Doo</span>
						</span>
					</button>

					<div className="hidden items-center gap-1 lg:flex">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							>
								{link.label}
							</a>
						))}
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => navigate("/registration")}
							className="hidden h-10 items-center rounded-lg border border-border bg-transparent px-4 text-sm font-semibold transition-colors hover:bg-secondary sm:inline-flex"
						>
							Registrera företag
						</button>
						<button
							onClick={() => navigate("/login")}
							className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
						>
							Logga in
						</button>
						<button
							onClick={() => setMobileOpen((prev) => !prev)}
							className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary lg:hidden"
							aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
							aria-expanded={mobileOpen}
						>
							{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</button>
					</div>
				</div>

				{/* MOBILE MENU */}
				<div
					className={cn(
						"overflow-hidden border-t border-border/60 lg:hidden",
						mobileOpen ? "max-h-96" : "max-h-0 border-t-0",
						"transition-[max-height] duration-300 ease-in-out",
					)}
				>
					<div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								onClick={() => setMobileOpen(false)}
								className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							>
								{link.label}
							</a>
						))}
						<button
							onClick={() => {
								setMobileOpen(false);
								navigate("/registration");
							}}
							className="mt-1 inline-flex h-11 items-center justify-center rounded-lg border border-border text-sm font-semibold transition-colors hover:bg-secondary sm:hidden"
						>
							Registrera ditt företag
						</button>
					</div>
				</div>
			</nav>

			{/* HERO */}
			<section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-20">
				{/* animated backdrop */}
				<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
					<div className="absolute inset-0 bg-grid mask-fade-y opacity-70" />
					<div className="animate-blob absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-primary/25 blur-3xl" />
					<div className="animate-blob absolute -top-20 right-0 h-[460px] w-[460px] rounded-full bg-accent/20 blur-3xl [animation-delay:3s]" />
					<div className="animate-blob absolute bottom-0 left-1/2 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl [animation-delay:6s]" />
				</div>

				<div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr]">
					{/* copy */}
					<div className="flex flex-col items-start gap-6 animate-fade-up">
						<HeroRotatingCopy
							audience={audience}
							wordIndex={wordIndex}
							onCta={(to) => {
								if (to.startsWith("#")) {
									document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
								} else {
									navigate(to);
								}
							}}
						/>
					</div>

					{/* phone mockup (auto-cycling businesses) */}
					<div className="relative mx-auto w-full max-w-sm animate-fade-up [animation-delay:120ms] lg:mx-0 lg:ml-auto">
						<div
							aria-hidden
							className="absolute inset-0 -z-10 translate-y-6 scale-95 rounded-[3rem] bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl"
						/>

						<div className="relative mx-auto aspect-[9/19] w-[280px] rounded-[2.75rem] border border-border bg-card p-3 shadow-2xl shadow-primary/10 sm:w-[300px]">
							<div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-background">
								{/* status bar (shared) */}
								<div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-2.5 text-[11px] font-semibold text-white">
									<span>13:25</span>
									<span className="flex items-center gap-1.5">
										<span className="flex items-end gap-[2px]">
											<span className="h-1.5 w-[3px] rounded-sm bg-white/90" />
											<span className="h-2 w-[3px] rounded-sm bg-white/90" />
											<span className="h-2.5 w-[3px] rounded-sm bg-white/50" />
										</span>
										<Wifi className="h-3 w-3" />
										<span className="flex h-2.5 w-5 items-center rounded-[3px] border border-white/80 p-[1px]">
											<span className="h-full w-1/3 rounded-[1px] bg-white" />
										</span>
									</span>
								</div>

								{phoneScreens.map((screen, i) => (
									<PhoneScreenPanel key={screen.name} screen={screen} active={i === activeScreen} />
								))}
							</div>
						</div>

						{/* screen selector dots */}
						<div className="mt-5 flex justify-center gap-2">
							{phoneScreens.map((screen, i) => (
								<button
									key={screen.name}
									onClick={() => setActiveScreen(i)}
									aria-label={`Visa ${screen.name}`}
									className={cn(
										"h-2 rounded-full transition-all duration-300",
										i === activeScreen ? "w-7 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/50",
									)}
								/>
							))}
						</div>

						{/* floating proof cards */}
						<div className="absolute -left-6 top-28 hidden animate-float-soft items-center gap-2.5 rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur sm:flex">
							<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
								<Zap className="h-4 w-4" />
							</span>
							<div className="leading-tight">
								<p className="text-xs font-bold">Claimad!</p>
								<p className="text-[10px] text-muted-foreground">Sparade 120 kr</p>
							</div>
						</div>

						<div className="absolute -right-4 bottom-24 hidden animate-float-soft items-center gap-2.5 rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur [animation-delay:1.5s] sm:flex">
							<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
								<Sparkles className="h-4 w-4" />
							</span>
							<div className="leading-tight">
								<p className="text-xs font-bold">12 nya deals</p>
								<p className="text-[10px] text-muted-foreground">nära dig idag</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* MARQUEE */}
			<section aria-hidden className="relative overflow-hidden border-y border-border bg-card/30 py-6">
				<div className="flex flex-col gap-3">
					<MarqueeRow />
					<MarqueeRow reverse />
				</div>
				<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background via-background/80 to-transparent" />
				<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background via-background/80 to-transparent" />
			</section>

			{/* FEATURES */}
			<section id="appen" className="scroll-mt-20 py-24">
				<div className="mx-auto max-w-6xl px-6">
					<Reveal>
						<SectionHeading
							eyebrow="Appen"
							title="Allt du behöver — i fickan"
							subtitle="TooDoo-appen ger dig tillgång till exklusiva erbjudanden från lokala företag, direkt i din smartphone."
						/>
					</Reveal>

					<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{features.map((feature, i) => (
							<Reveal key={feature.title} delay={i * 90}>
								<div className="group h-full rounded-2xl border border-border bg-card/40 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:shadow-primary/10">
									<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										{feature.icon}
									</div>
									<h3 className="mt-4 text-base font-bold">{feature.title}</h3>
									<p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
								</div>
							</Reveal>
						))}
					</div>

					<Reveal delay={120}>
						<div className="mt-10 flex flex-wrap justify-center gap-3">
							<button className="group inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-border/80 hover:bg-secondary">
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

							<button className="group inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-border/80 hover:bg-secondary">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-foreground">
									<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.76.03 2.99 2.63 3.99 2.66 4l-.08.26zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
								</svg>
								<div className="text-left leading-none">
									<div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ladda ner på</div>
									<div className="mt-1 text-sm font-bold">App Store</div>
								</div>
							</button>
						</div>
					</Reveal>
				</div>
			</section>

			{/* STEPS */}
			<section id="guide" className="scroll-mt-20 border-y border-border bg-card/40 py-24">
				<div className="mx-auto max-w-6xl px-6">
					<Reveal>
						<SectionHeading
							eyebrow="Guide"
							title="Så här fungerar det"
							subtitle="Från konto till claimad deal på under en minut."
						/>
					</Reveal>

					<div className="relative mt-14">
						<div
							aria-hidden
							className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
						/>
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
							{steps.map((s, i) => {
								const active = i === activeStep;
								return (
									<Reveal key={s.number} delay={i * 90}>
										<button
											onClick={() => setActiveStep(i)}
											className="flex w-full flex-col items-center text-center"
										>
											<div
												className={cn(
													"flex h-14 w-14 items-center justify-center rounded-2xl border text-lg font-extrabold transition-all duration-500",
													active
														? "scale-110 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
														: "border-border bg-background text-primary",
												)}
											>
												{s.number}
											</div>
											<h3
												className={cn(
													"mt-5 text-base font-bold transition-colors duration-500",
													active ? "text-foreground" : "text-muted-foreground",
												)}
											>
												{s.title}
											</h3>
											<p
												className={cn(
													"mt-2 max-w-xs text-sm transition-colors duration-500",
													active ? "text-foreground/80" : "text-muted-foreground",
												)}
											>
												{s.desc}
											</p>
										</button>
									</Reveal>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			{/* DEALS */}
			<section id="erbjudanden" className="scroll-mt-20 py-24">
				<div className="mx-auto max-w-6xl px-6">
					<Reveal>
						<SectionHeading eyebrow="Erbjudanden" title="Utvalda deals" subtitle="Ett smakprov på vad som väntar i appen." />
					</Reveal>

					<div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{loading ? (
							<>
								{[0, 1, 2].map((i) => (
									<div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card/40" />
								))}
							</>
						) : deals.length > 0 ? (
							deals.map((deal, i) => (
								<Reveal key={i} delay={i * 80}>
									<div className="group h-full cursor-pointer rounded-2xl border border-border bg-card/40 p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:shadow-primary/10">
										<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
											{iconMap[deal.icon ?? ""] ?? <Zap className="h-6 w-6" />}
										</div>
										<h3 className="mt-4 text-lg font-bold">{deal.title}</h3>
										<p className="mt-2 text-sm text-muted-foreground">{deal.description}</p>
									</div>
								</Reveal>
							))
						) : (
							<>
								<Reveal>
									<div className="group h-full cursor-pointer rounded-2xl border border-border bg-card/40 p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:shadow-primary/10">
										<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
											<Globe className="h-6 w-6" />
										</div>
										<h3 className="mt-4 text-lg font-bold">Hitta upplevelser nära dig</h3>
										<p className="mt-2 text-sm text-muted-foreground">Utforska lokala aktiviteter och event.</p>
									</div>
								</Reveal>
								<Reveal delay={80}>
									<div className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-7 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
										<span
											aria-hidden
											className="animate-shimmer absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
										/>
										<div className="absolute right-5 top-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
											Företag
										</div>
										<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
											<Building2 className="h-6 w-6" />
										</div>
										<h3 className="mt-4 text-lg font-bold">Är du ett företag?</h3>
										<p className="mt-2 text-sm text-muted-foreground">Nå tusentals användare med dina erbjudanden.</p>
										<button
											onClick={() => navigate("/registration")}
											className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-90"
										>
											Registrera ditt företag <ArrowRight className="h-4 w-4" />
										</button>
									</div>
								</Reveal>
								<Reveal delay={160}>
									<div className="group h-full cursor-pointer rounded-2xl border border-border bg-card/40 p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:shadow-primary/10">
										<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
											<Zap className="h-6 w-6" />
										</div>
										<h3 className="mt-4 text-lg font-bold">Exklusiva deals</h3>
										<p className="mt-2 text-sm text-muted-foreground">Tidsbegränsade erbjudanden varje dag.</p>
									</div>
								</Reveal>
							</>
						)}
					</div>
				</div>
			</section>

			{/* CTA BAND */}
			<section className="py-24">
				<div className="mx-auto max-w-6xl px-6">
					<Reveal>
						<div className="relative overflow-hidden rounded-3xl border border-border px-6 py-16 text-center sm:px-12">
							<div
								aria-hidden
								className="animate-gradient absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30"
							/>
							<div aria-hidden className="absolute inset-0 -z-10 bg-background/60" />
							<h2 className="mx-auto max-w-2xl text-balance text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
								Driver du ett företag? Nå nya kunder idag.
							</h2>
							<p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
								Skapa erbjudanden, fyll lediga tider och bygg lojalitet — TooDoo hjälper lokala företag att växa.
							</p>
							<div className="mt-8 flex flex-wrap justify-center gap-3">
								<button
									onClick={() => navigate("/registration")}
									className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90"
								>
									Registrera ditt företag <ArrowRight className="h-4 w-4" />
								</button>
								<button
									onClick={() => navigate("/login")}
									className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background/80 px-7 text-sm font-semibold backdrop-blur transition-colors hover:bg-secondary"
								>
									Till företagsportalen
								</button>
							</div>
						</div>
					</Reveal>
				</div>
			</section>

			{/* CONTACT */}
			<section id="kontakt" className="scroll-mt-20 border-t border-border bg-card/40 py-24">
				<div className="mx-auto max-w-3xl px-6">
					<Reveal>
						<SectionHeading
							eyebrow="Kontakt"
							title="Kontakta oss"
							subtitle="Har du frågor om appen, erbjudanden eller företagskonto? Hör av dig."
						/>
					</Reveal>

					<div className="mt-12 grid gap-4 sm:grid-cols-3">
						{[
							{ icon: <Mail className="h-5 w-5" />, title: "E-post", label: "info@toodoo.se" },
							{ icon: <MapPin className="h-5 w-5" />, title: "Kontor", label: "Helsingborg, Sverige" },
							{ icon: <Smartphone className="h-5 w-5" />, title: "Sociala medier", label: "@toodoo.se" },
						].map((item, i) => (
							<Reveal key={i} delay={i * 90}>
								<div className="group rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
									<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										{item.icon}
									</div>
									<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.title}</p>
									<p className="mt-1 text-sm font-medium">{item.label}</p>
								</div>
							</Reveal>
						))}
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="border-t border-border bg-background py-14">
				<div className="mx-auto max-w-6xl px-6">
					<div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
						<div className="max-w-xs">
							<div className="flex items-center gap-3">
								<img src="/Icon.jpg" alt="TooDoo" className="h-9 w-9 rounded-xl object-cover ring-1 ring-border" />
								<span className="text-lg font-extrabold tracking-tight">
									Too<span className="text-primary">Doo</span>
								</span>
							</div>
							<p className="mt-4 text-sm text-muted-foreground">
								Stadens bästa erbjudanden, event och upplevelser — samlat på ett ställe.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-foreground">Utforska</p>
								<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
									<li><a href="#guide" className="transition-colors hover:text-foreground">Hur det fungerar</a></li>
									<li><a href="#appen" className="transition-colors hover:text-foreground">Appen</a></li>
									<li><a href="#erbjudanden" className="transition-colors hover:text-foreground">Erbjudanden</a></li>
									<li><a href="#kontakt" className="transition-colors hover:text-foreground">Kontakt</a></li>
								</ul>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-foreground">Företag</p>
								<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
									<li>
										<button onClick={() => navigate("/registration")} className="transition-colors hover:text-foreground">
											Registrera företag
										</button>
									</li>
									<li>
										<button onClick={() => navigate("/login")} className="transition-colors hover:text-foreground">
											Företagsportal
										</button>
									</li>
								</ul>
							</div>
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-foreground">Juridik</p>
								<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
									<li>
										<button type="button" onClick={openPrivacyPolicy} className="transition-colors hover:text-foreground">
											Integritet
										</button>
									</li>
									<li>
										<button type="button" onClick={openTermsOfService} className="transition-colors hover:text-foreground">
											Villkor
										</button>
									</li>
									<li>
										<button type="button" onClick={openCookiePolicy} className="transition-colors hover:text-foreground">
											Cookies
										</button>
									</li>
									<li>
										<button type="button" onClick={openCookieSettings} className="transition-colors hover:text-foreground">
											Cookie-inställningar
										</button>
									</li>
								</ul>
							</div>
						</div>
					</div>

					<div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
						<p className="text-xs text-muted-foreground">© 2026 TooDoo. Alla rättigheter förbehållna.</p>
						<p className="text-xs text-muted-foreground">Gjort med omtanke i Helsingborg</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
