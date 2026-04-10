import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { createOrder, getBusinessId } from "@/lib/api";

type OfferForm = {
  title: string;
  description: string;
  detailedDescription: string;
  category: string;
  originalPrice: string;
  discountedPrice: string;
  claimsTotal: string;
  expiresAt: string;
  status: "active" | "draft";
};

export default function CompanyNewOffer() {
  const navigate = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const [form, setForm] = useState<OfferForm>({
    title: "",
    description: "",
    detailedDescription: "",
    category: "",
    originalPrice: "",
    discountedPrice: "",
    claimsTotal: "",
    expiresAt: "",
    status: "draft",
  });

  const onChange = (field: keyof OfferForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const stepNumericField = (field: "originalPrice" | "discountedPrice" | "claimsTotal", delta: number) => {
    const current = Number(form[field] || 0);
    const next = Math.max(0, current + delta);
    onChange(field, String(next));
  };

  const statusOptions: Array<{ value: OfferForm["status"]; label: string }> = [
    { value: "draft", label: "Utkast" },
    { value: "active", label: "Aktiv" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.description || !form.category) {
      toast.error("Fyll i titel, kort beskrivning och kategori.");
      return;
    }

    const businessId = getBusinessId();
    if (!businessId) {
      toast.error("Saknar businessId. Registrera/logga in igen.");
      return;
    }

    const nowIso = new Date().toISOString();
    const validToIso = form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : nowIso;

    setIsSubmitting(true);
    try {
      await createOrder({
        title: form.title,
        description: [form.description, form.detailedDescription].filter(Boolean).join("\n\n"),
        price: Number(form.discountedPrice || 0),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        orderTimeFrom: nowIso,
        orderTimeTo: validToIso,
        validFrom: nowIso,
        validTo: validToIso,
        maxRedemptions: form.claimsTotal ? Number(form.claimsTotal) : undefined,
        businessId,
      });

      toast.success("Erbjudande skapat.");
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nytt erbjudande</h1>
          <p className="mt-1 text-muted-foreground">Skapa ett nytt erbjudande som visas i er kampanjlista.</p>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <div className="relative">
                  <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={statusOpen}
                        className={cn(
                          "h-11 w-full rounded-md border bg-background px-3 pr-10 text-left text-sm text-foreground transition-colors focus-visible:outline-none",
                          statusOpen
                            ? "border-accent ring-2 ring-accent"
                            : "border-border focus-visible:ring-2 focus-visible:ring-accent"
                        )}
                      >
                        {statusOptions.find((option) => option.value === form.status)?.label}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {statusOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                  onChange("status", option.value);
                                  setStatusOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.status === option.value ? "opacity-100" : "opacity-0")} />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

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
                <label className="text-sm font-medium text-foreground">Utgangsdatum</label>
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
                        disabled={{ before: tomorrow }}
                        onSelect={(date) => {
                          if (date && date >= tomorrow) {
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/company/offers")}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="h-4 w-4" />
                {isSubmitting ? "Skapar..." : "Skapa erbjudande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
