import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
	createBusiness,
	listCategories,
	searchCompaniesByOrgNumber,
	setBusinessId,
} from "@/lib/api";
import { toast } from "sonner";
import { TimePicker } from "@/components/TimePicker";

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

function BusinessAppPreviewCard({
	companyName,
	categoryName,
	imageUrl,
}: {
	companyName: string;
	categoryName: string;
	imageUrl?: string;
}) {
	const [imageFailed, setImageFailed] = useState(false);

	return (
		<div className="mt-4">
			<div className="mx-auto w-full max-w-[420px] rounded-[34px] border border-border bg-gradient-to-b from-slate-950/40 to-slate-900/10 p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)]">
				<div className="rounded-[28px] bg-background/80 p-4">
					<div className="text-sm font-semibold text-foreground">Förhandsvisning (app)</div>
					<div className="mt-3 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
						<div className="h-28 bg-muted relative">
							{imageUrl && !imageFailed ? (
								<img
									src={imageUrl}
									alt=""
									className="h-full w-full object-cover"
									onError={() => setImageFailed(true)}
								/>
							) : (
								<div className="h-full w-full bg-muted" />
							)}
							<div className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
								Erbjudande
							</div>
						</div>
						<div className="p-4">
							<div className="text-lg font-bold text-foreground">{companyName}</div>
							<div className="text-sm text-muted-foreground">{categoryName || "Kategori"}</div>
						</div>
					</div>
					<div className="mt-2 text-xs text-muted-foreground">
						Bilden beskärs automatiskt i appen (cover).
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Registration() {
	const [company, setCompany] = useState("");
	const [companyOpen, setCompanyOpen] = useState(false);
	const [categoryOpen, setCategoryOpen] = useState(false);
	const [categoryId, setCategoryId] = useState("");
	const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccessPopup, setShowSuccessPopup] = useState(false);
	const [orgNumber, setOrgNumber] = useState("");
	const [orgSearchLoading, setOrgSearchLoading] = useState(false);
	const [orgSearchResults, setOrgSearchResults] = useState<
		Array<{
			name: string;
			orgNumber: string;
			addressLine: string;
			city: string;
			street: string;
		}>
	>([]);
	const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null);
	const [imageUrl, setImageUrl] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [uploadedImageUrl, setUploadedImageUrl] = useState("");
	const imageFileInputRef = useRef<HTMLInputElement | null>(null);
	const navigate = useNavigate();
	const longDescRef = useRef<HTMLTextAreaElement>(null);
	const [openingHours, setOpeningHours] = useState<Record<
		"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
		{ closed: boolean; from: string; to: string }
	>>({
		monday: { closed: false, from: "09:00", to: "17:00" },
		tuesday: { closed: false, from: "09:00", to: "17:00" },
		wednesday: { closed: false, from: "09:00", to: "17:00" },
		thursday: { closed: false, from: "09:00", to: "17:00" },
		friday: { closed: false, from: "09:00", to: "17:00" },
		saturday: { closed: true, from: "09:00", to: "17:00" },
		sunday: { closed: true, from: "09:00", to: "17:00" },
	});
	const [groupWeekdays, setGroupWeekdays] = useState(true);
	const [weekdayGroup, setWeekdayGroup] = useState<{ closed: boolean; from: string; to: string }>({
		closed: false,
		from: "09:00",
		to: "17:00",
	});

	const compareTime = (a: string, b: string) => {
		const matchA = (a ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
		const matchB = (b ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
		if (!matchA || !matchB) return 0;
		const ah = Number(matchA[1]);
		const am = Number(matchA[2]);
		const bh = Number(matchB[1]);
		const bm = Number(matchB[2]);
		if (![ah, am, bh, bm].every((n) => Number.isFinite(n))) return 0;
		return ah !== bh ? ah - bh : am - bm;
	};
	const openingHoursLabels: Record<keyof typeof openingHours, string> = {
		monday: "Måndag",
		tuesday: "Tisdag",
		wednesday: "Onsdag",
		thursday: "Torsdag",
		friday: "Fredag",
		saturday: "Lördag",
		sunday: "Söndag",
	};
	const weekdayKeys: Array<keyof typeof openingHours> = ["monday", "tuesday", "wednesday", "thursday", "friday"];
	const weekendKeys: Array<keyof typeof openingHours> = ["saturday", "sunday"];
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

	useEffect(() => {
		const loadCategories = async () => {
			try {
				const categories = await listCategories();
				setCategoryOptions(categories.map((c) => ({ id: c.id, name: c.name })));
				setCategoryId((prev) => prev || categories[0]?.id || "");
			} catch (error) {
				setCategoryOptions([]);
			}
		};

		void loadCategories();
	}, []);

	const imageFilePreviewUrl = useMemo(() => {
		if (!imageFile) return "";
		return URL.createObjectURL(imageFile);
	}, [imageFile]);

	useEffect(() => {
		if (!imageFilePreviewUrl) return;
		return () => URL.revokeObjectURL(imageFilePreviewUrl);
	}, [imageFilePreviewUrl]);

	useEffect(() => {
		if (!imageFilePreviewUrl) {
			setUploadedImageUrl("");
			return;
		}
		setUploadedImageUrl(imageFilePreviewUrl);
	}, [imageFilePreviewUrl]);

	const handleRegister = async () => {
		const email = (document.getElementById("email") as HTMLInputElement | null)?.value.trim() ?? "";
		const phone = (document.getElementById("phonenumber") as HTMLInputElement | null)?.value.trim() ?? "";
		const website = (document.getElementById("website") as HTMLInputElement | null)?.value.trim() ?? "";
		const city = (document.getElementById("companyCity") as HTMLInputElement | null)?.value.trim() ?? "";
		const address = (document.getElementById("companyAddress") as HTMLInputElement | null)?.value.trim() ?? "";
		const longDescription = longDescRef.current?.value.trim() ?? "";
		const companyName =
			selectedCompanyName?.trim() ||
			companyOptions.find((option) => option.value === company)?.label ||
			"Annat företag";

		let normalizedWebsite: string | undefined;
		if (website) {
			try {
				const websiteWithProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(website)
					? website
					: `https://${website}`;
				const parsedWebsite = new URL(websiteWithProtocol);
				if (parsedWebsite.protocol !== "http:" && parsedWebsite.protocol !== "https:") {
					throw new Error("Invalid protocol");
				}
				normalizedWebsite = parsedWebsite.toString();
			} catch {
				toast.error("Hemsida måste vara en giltig URL, till exempel https://example.com.");
				return;
			}
		}

		if (!email || !phone || !city || !address || !companyName || !longDescription || !categoryId) {
			toast.error("Fyll i e-post, telefon, stad, adress, företag, kategori och lång beskrivning.");
			return;
		}

		const trimmedImageUrl = imageUrl.trim();
		const wantsUpload = Boolean(imageFile);
		if (!wantsUpload && trimmedImageUrl) {
			try {
				// eslint-disable-next-line no-new
				new URL(trimmedImageUrl);
			} catch {
				toast.error("Bild URL måste vara en giltig URL.");
				return;
			}
		}

		setIsSubmitting(true);
		try {
			const effectiveOpeningHours = groupWeekdays
				? ({
						...openingHours,
						monday: { ...weekdayGroup },
						tuesday: { ...weekdayGroup },
						wednesday: { ...weekdayGroup },
						thursday: { ...weekdayGroup },
						friday: { ...weekdayGroup },
					} satisfies typeof openingHours)
				: openingHours;

			const openingHoursPayload = Object.fromEntries(
				Object.entries(effectiveOpeningHours)
					.filter(([, v]) => !v.closed)
					.map(([day, v]) => [day, { from: v.from, to: v.to }]),
			);
			const shouldSendOpeningHours = Object.keys(openingHoursPayload).length > 0;

			const businessResponse = await createBusiness({
				name: companyName,
				description: longDescription,
				contactEmail: email,
				contactPhone: phone,
				website: normalizedWebsite,
				address,
				city,
				categoryId: categoryId,
				imageSourceType: wantsUpload ? "UPLOADED" : trimmedImageUrl ? "EXTERNAL_URL" : undefined,
				imageUrl: wantsUpload ? undefined : trimmedImageUrl ? trimmedImageUrl : undefined,
				imageFile: wantsUpload ? imageFile ?? undefined : undefined,
				...(shouldSendOpeningHours ? { openingHours: openingHoursPayload } : {}),
			});

			const businessId =
				typeof businessResponse.id === "string"
					? businessResponse.id
					: typeof (businessResponse as { business?: { id?: string } }).business?.id === "string"
						? (businessResponse as { business: { id: string } }).business.id
						: null;

			if (businessId) {
				setBusinessId(businessId);
			}

			setShowSuccessPopup(true);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Kunde inte slutföra registreringen.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOrgSearch = async () => {
		const raw = orgNumber.trim();
		if (!raw) {
			toast.error("Fyll i organisationsnummer.");
			return;
		}

		setOrgSearchLoading(true);
		try {
			const companies = await searchCompaniesByOrgNumber(raw, 5);
			const mapped = companies.map((c) => {
				const street = c.postalAddress?.street?.trim() ?? "";
				const postalCode = c.postalAddress?.postalCode?.trim() ?? "";
				const city = c.postalAddress?.city?.trim() ?? "";
				const addressLine = [street, [postalCode, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

				return {
					name: c.name,
					orgNumber: c.orgNumber,
					addressLine,
					city,
					street,
				};
			});
			setOrgSearchResults(mapped);
			if (mapped.length === 0) {
				toast.info("Inga träffar.");
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Kunde inte söka företag.";
			toast.error(message);
		} finally {
			setOrgSearchLoading(false);
		}
	};

	const applySelectedCompany = (c: { name: string; city: string; street: string }) => {
		setSelectedCompanyName(c.name);
		setCompany("annat");
		setCompanyOpen(false);

		const cityInput = document.getElementById("companyCity") as HTMLInputElement | null;
		const addressInput = document.getElementById("companyAddress") as HTMLInputElement | null;
		if (cityInput && c.city) cityInput.value = c.city;
		if (addressInput && c.street) addressInput.value = c.street;
	};

	const previewCompanyName =
		selectedCompanyName?.trim() ||
		(company ? companyOptions.find((option) => option.value === company)?.label : "") ||
		"Ditt företag";
	const previewCategoryName = categoryOptions.find((c) => c.id === categoryId)?.name ?? "";
	const previewImageUrl = imageFilePreviewUrl || imageUrl.trim() || "";

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
					onClick={() => navigate("/login")}
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
						<label className="text-lg font-semibold text-foreground">Beskrivning och kategori:</label>
						<div className="space-y-4">
							<div className="space-y-2">
								<label htmlFor="category" className="ml-0.5 text-sm font-semibold text-muted-foreground">Kategori:</label>
								<Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
									<PopoverTrigger asChild>
										<button
											id="category"
											type="button"
											role="combobox"
											aria-expanded={categoryOpen}
											className="h-11 w-full rounded-md border border-border bg-background px-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
										>
											{categoryId ? categoryOptions.find((option) => option.id === categoryId)?.name : "Välj kategori"}
										</button>
									</PopoverTrigger>
									<PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
										<Command>
											<CommandInput placeholder="Sök kategori..." />
											<CommandList>
												<CommandEmpty>Inga kategorier hittades.</CommandEmpty>
												<CommandGroup>
													{categoryOptions.map((option) => (
														<CommandItem
															key={option.id}
															value={option.name}
															onSelect={() => {
																setCategoryId(option.id);
																setCategoryOpen(false);
															}}
														>
															<Check
																className={cn("mr-2 h-4 w-4", categoryId === option.id ? "opacity-100" : "opacity-0")}
															/>
															{option.name}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
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
											{selectedCompanyName?.trim()
												? selectedCompanyName
												: company
													? companyOptions.find((option) => option.value === company)?.label
													: "Välj företag"}
										</button>
									</PopoverTrigger>
									<PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
										<Command>
											<CommandInput placeholder="Sök företag..." />
											<CommandList>
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
								<label htmlFor="orgNumber" className="ml-0.5 text-sm font-semibold text-muted-foreground">
									Organisationsnummer:
								</label>
								<div className="flex gap-2">
									<Input
										id="orgNumber"
										value={orgNumber}
										onChange={(e) => setOrgNumber(e.target.value)}
										placeholder="556703-7485"
										className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
									/>
									<button
										type="button"
										disabled={orgSearchLoading}
										onClick={handleOrgSearch}
										className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
									>
										{orgSearchLoading ? "Söker..." : "Sök"}
									</button>
								</div>

								{orgSearchResults.length > 0 ? (
									<div className="rounded-xl border border-border bg-background/30 p-2">
										<div className="space-y-1">
											{orgSearchResults.map((c) => (
												<button
													key={`${c.orgNumber}-${c.name}`}
													type="button"
													onClick={() => applySelectedCompany(c)}
													className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/20"
												>
													<div className="flex items-center justify-between gap-3">
														<div className="min-w-0">
															<div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
															<div className="truncate text-xs text-muted-foreground">
																Org.nr: {c.orgNumber}
																{c.addressLine ? ` · ${c.addressLine}` : ""}
															</div>
														</div>
														<Check className={cn("h-4 w-4 shrink-0", selectedCompanyName === c.name ? "opacity-100" : "opacity-0")} />
													</div>
												</button>
											))}
										</div>
									</div>
								) : null}
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

							<div className="space-y-2">
								<label className="ml-0.5 text-sm font-semibold text-muted-foreground">
									Bild URL <span className="text-xs text-muted-foreground">(valfritt)</span>
								</label>
								<div className="flex gap-2">
									<Input
										placeholder="https://example.com/image.png"
										value={imageFile ? uploadedImageUrl : imageUrl}
										onChange={(e) => {
											const next = e.target.value;
											if (imageFile) {
												// If the user edits the field, switch to URL mode.
												if (!next.trim()) {
													setImageFile(null);
													setUploadedImageUrl("");
													setImageUrl("");
													return;
												}
												if (next !== uploadedImageUrl) {
													setImageFile(null);
													setUploadedImageUrl("");
													setImageUrl(next);
												}
												return;
											}
											setImageUrl(next);
										}}
										className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent"
									/>
									<button
										type="button"
										onClick={() => imageFileInputRef.current?.click()}
										className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
										disabled={isSubmitting}
									>
										Ladda upp
									</button>
									<input
										ref={imageFileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										disabled={isSubmitting}
										onChange={(e) => {
											const file = e.target.files?.[0] ?? null;
											setImageFile(file);
											if (file) setImageUrl("");
											if (imageFileInputRef.current) imageFileInputRef.current.value = "";
										}}
									/>
								</div>

								<BusinessAppPreviewCard
									companyName={previewCompanyName}
									categoryName={previewCategoryName}
									imageUrl={previewImageUrl || undefined}
								/>
							</div>

							<div className="space-y-3 pt-2">
								<label className="ml-0.5 text-sm font-semibold text-muted-foreground">Öppettider (valfritt):</label>
								<div className="space-y-2 rounded-xl border border-border bg-background/30 p-3">
									<div className="flex items-center justify-between gap-3">
										<button
											type="button"
											aria-pressed={groupWeekdays}
											onClick={() => {
												const next = !groupWeekdays;
												setGroupWeekdays(next);
												if (next) {
													// When enabling grouping, seed group values from Monday for least surprise.
													setWeekdayGroup({ ...openingHours.monday });
												}
											}}
											className={cn(
												"inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
												"group",
												groupWeekdays
													? "border-accent bg-accent text-accent-foreground"
													: "border-border bg-background text-foreground hover:bg-accent/15",
											)}
										>
											<span
												className={cn(
													"grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
													groupWeekdays
														? "border-accent-foreground/30 bg-accent-foreground/10"
														: "border-border bg-background/40",
												)}
												aria-hidden="true"
											>
												{groupWeekdays ? "✓" : ""}
											</span>
											<span className="flex flex-col items-start leading-tight">
												<span>Mån–Fre</span>
												<span className={cn("text-[11px] font-medium", groupWeekdays ? "text-accent-foreground/80" : "text-muted-foreground")}>
													Komprimerar vardagar till en rad
												</span>
											</span>
										</button>
									</div>

									<div className="grid gap-2">
										{groupWeekdays ? (
											<div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-background/40 p-2 sm:grid-cols-[140px_1fr]">
												<div className="flex items-center gap-3 sm:w-[140px]">
													<button
														type="button"
														aria-pressed={weekdayGroup.closed}
														onClick={() => setWeekdayGroup((prev) => ({ ...prev, closed: !prev.closed }))}
														className={cn(
															"inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
															weekdayGroup.closed
																? "border-destructive bg-destructive text-destructive-foreground"
																: "border-border bg-background text-foreground hover:bg-accent/15",
														)}
													>
														<span
															className={cn(
																"grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
																weekdayGroup.closed
																	? "border-destructive-foreground/30 bg-destructive-foreground/10"
																	: "border-border bg-background/40",
															)}
															aria-hidden="true"
														>
															{weekdayGroup.closed ? "✕" : ""}
														</span>
														<span className="flex flex-col items-start leading-tight">
															<span>Mån–Fre</span>
															<span className={cn("text-[11px] font-medium", weekdayGroup.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
																{weekdayGroup.closed ? "Stängt" : "Öppet"}
															</span>
														</span>
													</button>
												</div>

												<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
													<TimePicker
														label="Välj starttid"
														disabled={weekdayGroup.closed}
														value={weekdayGroup.from}
														onChange={(from) =>
															setWeekdayGroup((prev) => {
																const next = { ...prev, from };
																if (!next.closed && next.to && compareTime(next.from, next.to) > 0) {
																	next.to = next.from;
																}
																return next;
															})
														}
													/>
													<span className="text-xs text-muted-foreground text-center">–</span>
													<TimePicker
														label="Välj sluttid"
														disabled={weekdayGroup.closed}
														value={weekdayGroup.to}
														onChange={(to) =>
															setWeekdayGroup((prev) => {
																const next = { ...prev, to };
																if (!next.closed && next.from && compareTime(next.from, next.to) > 0) {
																	next.from = next.to;
																}
																return next;
															})
														}
													/>
												</div>
											</div>
										) : (
											weekdayKeys.map((dayKey) => {
												const value = openingHours[dayKey];
												return (
													<div
														key={dayKey}
														className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-background/40 p-2 sm:grid-cols-[140px_1fr]"
													>
														<div className="flex items-center gap-3 sm:w-[140px]">
															<button
																type="button"
																aria-pressed={value.closed}
																onClick={() =>
																	setOpeningHours((prev) => ({
																		...prev,
																		[dayKey]: { ...prev[dayKey], closed: !prev[dayKey].closed },
																	}))
																}
																className={cn(
																	"inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
																	value.closed
																		? "border-destructive bg-destructive text-destructive-foreground"
																		: "border-border bg-background text-foreground hover:bg-accent/15",
																)}
															>
																<span
																	className={cn(
																		"grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
																		value.closed
																			? "border-destructive-foreground/30 bg-destructive-foreground/10"
																			: "border-border bg-background/40",
																	)}
																	aria-hidden="true"
																>
																	{value.closed ? "✕" : ""}
																</span>
																<span className="flex flex-col items-start leading-tight">
																	<span>{openingHoursLabels[dayKey]}</span>
																	<span className={cn("text-[11px] font-medium", value.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
																		{value.closed ? "Stängt" : "Öppet"}
																	</span>
																</span>
															</button>
														</div>

														<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
															<TimePicker
																label="Välj starttid"
																disabled={value.closed}
																value={value.from}
																onChange={(from) =>
																	setOpeningHours((prev) => {
																		const nextDay = { ...prev[dayKey], from };
																		if (!nextDay.closed && nextDay.to && compareTime(nextDay.from, nextDay.to) > 0) {
																			nextDay.to = nextDay.from;
																		}
																		return { ...prev, [dayKey]: nextDay };
																	})
																}
															/>
															<span className="text-xs text-muted-foreground text-center">–</span>
															<TimePicker
																label="Välj sluttid"
																disabled={value.closed}
																value={value.to}
																onChange={(to) =>
																	setOpeningHours((prev) => {
																		const nextDay = { ...prev[dayKey], to };
																		if (!nextDay.closed && nextDay.from && compareTime(nextDay.from, nextDay.to) > 0) {
																			nextDay.from = nextDay.to;
																		}
																		return { ...prev, [dayKey]: nextDay };
																	})
																}
															/>
														</div>
													</div>
												);
											})
										)}

										{weekendKeys.map((dayKey) => {
											const value = openingHours[dayKey];
											return (
												<div
													key={dayKey}
													className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-background/40 p-2 sm:grid-cols-[140px_1fr]"
												>
													<div className="flex items-center gap-3 sm:w-[140px]">
														<button
															type="button"
															aria-pressed={value.closed}
															onClick={() =>
																setOpeningHours((prev) => ({
																	...prev,
																	[dayKey]: { ...prev[dayKey], closed: !prev[dayKey].closed },
																}))
															}
															className={cn(
																"inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
																value.closed
																	? "border-destructive bg-destructive text-destructive-foreground"
																	: "border-border bg-background text-foreground hover:bg-accent/15",
															)}
														>
															<span
																className={cn(
																	"grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none",
																	value.closed
																		? "border-destructive-foreground/30 bg-destructive-foreground/10"
																		: "border-border bg-background/40",
																)}
																aria-hidden="true"
															>
																{value.closed ? "✕" : ""}
															</span>
															<span className="flex flex-col items-start leading-tight">
																<span>{openingHoursLabels[dayKey]}</span>
																<span className={cn("text-[11px] font-medium", value.closed ? "text-destructive-foreground/80" : "text-muted-foreground")}>
																	{value.closed ? "Stängt" : "Öppet"}
																</span>
															</span>
														</button>
													</div>

													<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
														<TimePicker
															label="Välj starttid"
															disabled={value.closed}
															value={value.from}
															onChange={(from) =>
																setOpeningHours((prev) => {
																	const nextDay = { ...prev[dayKey], from };
																	if (!nextDay.closed && nextDay.to && compareTime(nextDay.from, nextDay.to) > 0) {
																		nextDay.to = nextDay.from;
																	}
																	return { ...prev, [dayKey]: nextDay };
																})
															}
														/>
														<span className="text-xs text-muted-foreground text-center">–</span>
														<TimePicker
															label="Välj sluttid"
															disabled={value.closed}
															value={value.to}
															onChange={(to) =>
																setOpeningHours((prev) => {
																	const nextDay = { ...prev[dayKey], to };
																	if (!nextDay.closed && nextDay.from && compareTime(nextDay.from, nextDay.to) > 0) {
																		nextDay.from = nextDay.to;
																	}
																	return { ...prev, [dayKey]: nextDay };
																})
															}
														/>
													</div>
												</div>
											);
										})}
									</div>
								</div>
								<p className="text-xs text-muted-foreground">
									Vi skickar bara dagar som inte är markerade som “Stängt”.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
					<div className="relative z-10 space-y-4">
						<label className="text-lg font-semibold text-foreground">Slutför registrering:</label>

					<button type="button" disabled={isSubmitting} onClick={handleRegister} className="group no-hover-motion relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/90">
						<span className="anim-submit-text pointer-events-none relative z-10 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-4">
							{isSubmitting ? "Registrerar" : "Registrera företag"}
						</span>
						<span className="anim-submit-line pointer-events-none absolute right-9 z-0 h-[1px] w-14 origin-right mr-24 scale-x-0 rounded-full bg-accent-foreground transition-transform duration-300 group-hover:scale-x-100 group-hover:translate-x-10" />
						<span className="pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
							<ArrowRight className="anim-submit-arrow h-4 w-4 transition-transform duration-300 group-hover:translate-x-10" />
						</span>
					</button>
					</div>
				</div>
			</div>

			{showSuccessPopup && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
					<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)]">
						<p className="text-sm text-foreground leading-relaxed">
							Din förfrågan har blivit skickade till vår admin du kommer få ett mail till din e-post om hur din förfrågan gick och fortsatta steg.
						</p>
						<button
							type="button"
							onClick={() => {
								setShowSuccessPopup(false);
								navigate("/login");
							}}
							className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
						>
							Tillbaka till logg in
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
