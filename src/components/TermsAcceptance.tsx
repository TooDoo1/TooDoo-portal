import { Checkbox } from "@/components/ui/checkbox";
import { useLegalModals } from "@/components/CookieConsent";
import { cn } from "@/lib/utils";

type TermsVariant = "user" | "company";

type TermsAcceptanceProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant: TermsVariant;
  className?: string;
};

const termsCopy: Record<TermsVariant, { label: string; open: "openUserTerms" | "openCompanyTerms" }> = {
  user: { label: "användarvillkoren", open: "openUserTerms" },
  company: { label: "företagsvillkoren", open: "openCompanyTerms" },
};

export function TermsAcceptance({ id, checked, onCheckedChange, variant, className }: TermsAcceptanceProps) {
  const legalModals = useLegalModals();
  const { label, open } = termsCopy[variant];

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-sm leading-relaxed text-muted-foreground">
        Jag har läst och godkänner{" "}
        <button
          type="button"
          onClick={legalModals[open]}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          {label}
        </button>
        .
      </label>
    </div>
  );
}
