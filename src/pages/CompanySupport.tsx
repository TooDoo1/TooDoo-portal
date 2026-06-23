import { useEffect, useState } from "react";
import { Clock, LifeBuoy, Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthEmail, getBusinessById, resolveBusinessId } from "@/lib/api";
import { toast } from "sonner";

const SUPPORT_EMAIL = "info@toodoo.se";

const faqItems = [
  {
    question: "Hur skapar jag ett erbjudande?",
    answer:
      "Gå till Erbjudanden i menyn och klicka på Skapa erbjudande. Fyll i titel, beskrivning, tider och antal innan ni publicerar.",
  },
  {
    question: "Hur verifierar jag kuponger i kassan?",
    answer:
      "Använd Verifiering för att skanna QR-kod eller ange kupongkod manuellt när kunden löser in sitt erbjudande.",
  },
  {
    question: "Hur begär jag ny företagsbild?",
    answer:
      "Under Bildförfrågan kan ni ladda upp eller ange en länk till ny bild. Bilden granskas innan den visas i appen.",
  },
];

const categoryLabels: Record<string, string> = {
  account: "Konto och inloggning",
  offers: "Erbjudanden och event",
  verification: "Verifiering och kuponger",
  billing: "Fakturor och betalning",
  images: "Bilder och profil",
  other: "Övrigt",
};

export default function CompanySupport() {
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const businessId = await resolveBusinessId();
        if (!businessId) return;
        const business = await getBusinessById(businessId);
        setBusinessName(business.name?.trim() || null);
      } catch {
        setBusinessName(null);
      }
    })();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject) {
      toast.error("Ange ett ämne.");
      return;
    }
    if (!trimmedMessage) {
      toast.error("Skriv ett meddelande.");
      return;
    }

    const userEmail = getAuthEmail();
    if (!userEmail) {
      toast.error("Saknar inloggad e-post. Logga in igen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryLabel = categoryLabels[category] ?? categoryLabels.other;
      const body = [
        "Hej TooDoo support,",
        "",
        trimmedMessage,
        "",
        "---",
        `Kategori: ${categoryLabel}`,
        `Företag: ${businessName ?? "Okänt"}`,
        `Avsändare: ${userEmail}`,
      ].join("\n");

      const mailto = `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${encodeURIComponent(`[Kundsupport] ${trimmedSubject}`)}&body=${encodeURIComponent(body)}`;
      toast.success("Mailappen öppnas med ert ärende.");
      window.location.href = mailto;
      setSubject("");
      setMessage("");
      setCategory("other");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kundsupport</h1>
        <p className="mt-1 text-muted-foreground">
          Behöver du hjälp? Här hittar du svar på vanliga frågor och kan kontakta vårt team.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="rounded-lg bg-accent/15 p-2.5 text-accent">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">E-post</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 block text-sm text-accent hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="rounded-lg bg-primary/15 p-2.5 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Svarstid</p>
              <p className="mt-1 text-sm text-muted-foreground">Vanligtvis inom 1–2 arbetsdagar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="rounded-lg bg-success/15 text-success p-2.5">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Plats</p>
              <p className="mt-1 text-sm text-muted-foreground">Helsingborg, Sverige</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <LifeBuoy className="h-5 w-5 text-accent" />
            Skicka ett ärende
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-category">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="support-category">
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-subject">Ämne</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Beskriv kort vad ärendet gäller"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-message">Meddelande</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Berätta mer så vi kan hjälpa dig..."
                rows={6}
                maxLength={4000}
              />
            </div>

            <Button type="submit" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
              <Send className="h-4 w-4" />
              {isSubmitting ? "Öppnar mail..." : "Skicka via e-post"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Vanliga frågor</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left text-foreground">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
