import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { createOrder, getBusinessId, getOrderById, updateOrder } from "@/lib/api";

type OfferForm = {
  title: string;
  description: string;
  detailedDescription: string;
  category: string;
  startAt: string;
  originalPrice: string;
  discountedPrice: string;
  claimsTotal: string;
  couponLifetimeMinutes: string;
  couponLifetimeUnit: "minutes" | "hours" | "days";
  expiresAt: string;
};

export default function CompanyNewOffer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [startOpen, setStartOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const [form, setForm] = useState<OfferForm>({
    title: "",
    description: "",
    detailedDescription: "",
    category: "",
    startAt: "",
    originalPrice: "",
    discountedPrice: "",
    claimsTotal: "",
    couponLifetimeMinutes: "60",
    couponLifetimeUnit: "minutes",
    expiresAt: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("editId")?.trim() ?? "";
    if (!orderId) {
      return;
    }

    setEditOrderId(orderId);
    setIsLoadingOffer(true);

    const loadOrder = async () => {
      try {
        const order = await getOrderById(orderId);
        const rawDescription = typeof order.description === "string" ? order.description : "";
        const rawDetailedDescription = typeof order.detailedDescription === "string" ? order.detailedDescription.trim() : "";
        const descriptionParts = rawDescription.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
        const shortDescription = descriptionParts.length > 1 ? descriptionParts[0] : rawDescription.trim();
        const detailedDescription = rawDetailedDescription || (descriptionParts.length > 1 ? descriptionParts.slice(1).join("\n\n") : "");

        const orderTimeFrom = order.orderTimeFrom || order.validFrom || "";
        const orderTimeTo = order.orderTimeTo || order.validTo || "";
        const couponLifetimeMs = new Date(order.validTo).getTime() - new Date(orderTimeFrom).getTime();
        const couponLifetimeMinutes = Number.isFinite(couponLifetimeMs) && couponLifetimeMs > 0
          ? Math.max(1, Math.round(couponLifetimeMs / (60 * 1000)))
          : 60;

        setForm({
          title: order.title ?? "",
          description: shortDescription,
          detailedDescription,
          category: typeof order.categoryName === "string" ? order.categoryName : "",
          startAt: orderTimeFrom ? format(new Date(orderTimeFrom), "yyyy-MM-dd") : "",
          originalPrice: typeof order.originalPrice === "number" || typeof order.originalPrice === "string" ? String(order.originalPrice) : "",
          discountedPrice: typeof order.price === "number" || typeof order.price === "string" ? String(order.price) : "",
          claimsTotal: typeof order.maxRedemptions === "number" ? String(order.maxRedemptions) : "",
          couponLifetimeMinutes: String(couponLifetimeMinutes),
          couponLifetimeUnit: "minutes",
          expiresAt: orderTimeTo ? format(new Date(orderTimeTo), "yyyy-MM-dd") : "",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kunde inte läsa erbjudandet.";
        toast.error(message);
        navigate("/company/offers");
      } finally {
        setIsLoadingOffer(false);
      }
    };

    void loadOrder();
  }, [location.search, navigate]);
  const startDateForEndPicker = form.startAt ? new Date(form.startAt) : null;
  const expiresMinDate = startDateForEndPicker && !Number.isNaN(startDateForEndPicker.getTime())
    ? startDateForEndPicker
    : tomorrow;
  const expiresDateForStartPicker = form.expiresAt ? new Date(form.expiresAt) : null;
  const startMaxDate = expiresDateForStartPicker && !Number.isNaN(expiresDateForStartPicker.getTime())
    ? expiresDateForStartPicker
    : null;

  const onChange = (field: keyof OfferForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const stepNumericField = (field: "originalPrice" | "discountedPrice" | "claimsTotal" | "couponLifetimeMinutes", delta: number) => {
    const current = Number(form[field] || 0);
    const next = Math.max(0, current + delta);
    onChange(field, String(next));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Fyll i titel och kort beskrivning.");
      return;
    }

    const businessId = getBusinessId();
    if (!businessId) {
      toast.error("Saknar businessId. Registrera/logga in igen.");
      return;
    }

    const price = Number(form.discountedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Pris måste vara ett tal större än 0.");
      return;
    }

    let originalPrice: number | undefined;
    if (form.originalPrice.trim()) {
      const parsedOriginalPrice = Number(form.originalPrice);
      if (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice < 0) {
        toast.error("Ordinarie pris måste vara ett giltigt tal.");
        return;
      }
      originalPrice = parsedOriginalPrice;
    }

    let maxRedemptions: number | undefined;
    if (form.claimsTotal.trim()) {
      const parsedMaxRedemptions = Number(form.claimsTotal);
      if (!Number.isInteger(parsedMaxRedemptions) || parsedMaxRedemptions <= 0) {
        toast.error("Max antal claims måste vara ett heltal större än 0.");
        return;
      }
      maxRedemptions = parsedMaxRedemptions;
    }

    const couponLifetimeValue = Number(form.couponLifetimeMinutes);
    if (!Number.isInteger(couponLifetimeValue) || couponLifetimeValue <= 0) {
      toast.error("Kupong livstid måste vara ett heltal större än 0.");
      return;
    }

    const couponLifetimeMultiplier =
      form.couponLifetimeUnit === "minutes"
        ? 60 * 1000
        : form.couponLifetimeUnit === "hours"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    if (!form.expiresAt) {
      toast.error("Välj ett slutdatum för erbjudandet.");
      return;
    }

    if (!form.startAt) {
      toast.error("Välj en starttid för erbjudandet.");
      return;
    }

    const orderTimeFromDate = new Date(form.startAt);
    const validToDate = new Date(`${form.expiresAt}T23:59:59`);
    if (Number.isNaN(orderTimeFromDate.getTime()) || Number.isNaN(validToDate.getTime())) {
      toast.error("Starttid eller slutdatum är ogiltigt.");
      return;
    }

    if (orderTimeFromDate.getTime() >= validToDate.getTime()) {
      toast.error("Starttid måste vara före utgångsdatum.");
      return;
    }

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const orderTimeFromIso = orderTimeFromDate.toISOString();
    const validToIso = validToDate.toISOString();
    const couponValidToDate = new Date(orderTimeFromDate.getTime() + couponLifetimeValue * couponLifetimeMultiplier);
    const couponValidToIso = couponValidToDate.toISOString();

    if (validToDate.getTime() <= Date.now()) {
      toast.error("Slutdatum måste vara i framtiden.");
      return;
    }

    if (couponValidToDate.getTime() > validToDate.getTime()) {
      toast.error("Kupong livstid får inte passera erbjudandets utgångsdatum.");
      return;
    }

    setIsSubmitting(true);
    try {
      const detailedDescription = form.detailedDescription.trim();
      const description = [form.description.trim(), detailedDescription].filter(Boolean).join("\n\n");
      const payload = {
        title: form.title.trim(),
        description,
        detailedDescription: detailedDescription || undefined,
        price,
        originalPrice,
        orderTimeFrom: orderTimeFromIso,
        orderTimeTo: validToIso,
        validFrom: orderTimeFromIso,
        validTo: couponValidToIso,
        maxRedemptions,
      };

      if (editOrderId) {
        await updateOrder(editOrderId, payload);
        toast.success("Erbjudande uppdaterat.");
      } else {
        await createOrder(payload);
        toast.success("Erbjudande skapat.");
      }

      navigate("/company/offers");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte skapa erbjudandet.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media (max-width: 492px) and (max-height: 672px) {
          .no-hover-motion,
          .no-hover-motion * {
            transition-duration: 0ms !important;
          }

          .no-hover-motion.group:hover .anim-back-arrow,
          .no-hover-motion.group:hover .anim-back-text {
            transform: none !important;
            opacity: 1 !important;
          }

          .no-hover-motion.group:hover .anim-back-line {
            transform: scaleX(0) !important;
          }

          .anim-back-line {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {editOrderId ? "Redigera erbjudande" : "Nytt erbjudande"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {editOrderId ? "Ändra erbjudandet och spara uppdateringarna." : "Skapa ett nytt erbjudande som visas i er kampanjlista."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/company/offers")}
          className="group no-hover-motion relative inline-flex h-10 items-center overflow-hidden rounded-xl border border-border bg-card px-3 pr-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Tillbaka till erbjudanden"
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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Erbjudandeinformation</CardTitle>
          <CardDescription>Fyll i detaljerna nedan och skapa erbjudandet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Titel</label>
                <Input
                  placeholder="Ex. 15% av biobiljett"
                  value={form.title}
                  onChange={(e) => onChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Kort beskrivning</label>
                <Textarea
                  placeholder="Kort text som syns i erbjudandekortet"
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Detaljerad beskrivning</label>
                <Textarea
                  placeholder="Text som visas efter klick pa Mer"
                  value={form.detailedDescription}
                  onChange={(e) => onChange("detailedDescription", e.target.value)}
                  className="min-h-28"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kategori</label>
                <Input
                  placeholder="Ex. Mat & Dryck"
                  value={form.category}
                  onChange={(e) => onChange("category", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ordinarie pris (kr)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="149"
                      value={form.originalPrice}
                      onChange={(e) => onChange("originalPrice", e.target.value)}
                      className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("originalPrice", 1)}
                        aria-label="Okad ordinarie pris"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("originalPrice", -1)}
                        aria-label="Minskat ordinarie pris"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rabatterat pris (kr)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="127"
                      value={form.discountedPrice}
                      onChange={(e) => onChange("discountedPrice", e.target.value)}
                      className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("discountedPrice", 1)}
                        aria-label="Okad rabatterat pris"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => stepNumericField("discountedPrice", -1)}
                        aria-label="Minskat rabatterat pris"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Totalt antal kuponger</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="120"
                    value={form.claimsTotal}
                    onChange={(e) => onChange("claimsTotal", e.target.value)}
                    className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("claimsTotal", 1)}
                      aria-label="Okat antal kuponger"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("claimsTotal", -1)}
                      aria-label="Minskat antal kuponger"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kupong livstid</label>
                <div className="grid grid-cols-[1fr_140px] gap-2">
                  <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="60"
                    value={form.couponLifetimeMinutes}
                    onChange={(e) => onChange("couponLifetimeMinutes", e.target.value)}
                    className="h-11 bg-background border-border pr-10 text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm border border-border bg-card">
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("couponLifetimeMinutes", 1)}
                      aria-label="Oka kupong livstid"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => stepNumericField("couponLifetimeMinutes", -1)}
                      aria-label="Minska kupong livstid"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                  <Select
                    value={form.couponLifetimeUnit}
                    onValueChange={(value) => onChange("couponLifetimeUnit", value as OfferForm["couponLifetimeUnit"])}
                  >
                    <SelectTrigger className="h-11 border-border bg-background text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      <SelectItem value="minutes">Minuter</SelectItem>
                      <SelectItem value="hours">Timmar</SelectItem>
                      <SelectItem value="days">Dagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start datum</label>
                  <div className="relative">
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
                            startOpen
                              ? "border-accent ring-2 ring-accent"
                              : "border-border focus-visible:ring-2 focus-visible:ring-accent"
                          )}
                        >
                          {form.startAt ? format(new Date(form.startAt), "yyyy-MM-dd") : "Välj startdatum"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                          Slutdatum: {form.expiresAt ? format(new Date(form.expiresAt), "yyyy-MM-dd") : "Inte valt"}
                        </div>
                        <Calendar
                          mode="single"
                          selected={form.startAt ? new Date(form.startAt) : undefined}
                          modifiers={
                            form.expiresAt
                              ? { endDate: new Date(form.expiresAt) }
                              : undefined
                          }
                          modifiersClassNames={{
                            endDate: "bg-blue-500/20 text-blue-100 rounded-md",
                          }}
                          disabled={startMaxDate ? [{ before: today }, { after: startMaxDate }] : { before: today }}
                          onSelect={(date) => {
                            if (date && (!startMaxDate || date <= startMaxDate)) {
                              onChange("startAt", format(date, "yyyy-MM-dd"));
                              setStartOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Utgångsdatum</label>
                  <div className="relative">
                    <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
                            expiresOpen
                              ? "border-accent ring-2 ring-accent"
                              : "border-border focus-visible:ring-2 focus-visible:ring-accent"
                          )}
                        >
                          {form.expiresAt ? format(new Date(form.expiresAt), "yyyy-MM-dd") : "Valj utgangsdatum"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto border-border bg-popover p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.expiresAt ? new Date(form.expiresAt) : undefined}
                          modifiers={
                            form.startAt
                              ? { startDate: new Date(form.startAt) }
                              : undefined
                          }
                          modifiersClassNames={{
                            startDate: "bg-accent/25 text-accent-foreground rounded-md",
                          }}
                          disabled={{ before: expiresMinDate }}
                          onSelect={(date) => {
                            if (date && date >= expiresMinDate) {
                              onChange("expiresAt", format(date, "yyyy-MM-dd"));
                              setExpiresOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/company/offers")}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="h-4 w-4" />
                {isSubmitting ? (editOrderId ? "Sparar..." : "Skapar...") : editOrderId ? "Spara ändringar" : "Skapa erbjudande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
