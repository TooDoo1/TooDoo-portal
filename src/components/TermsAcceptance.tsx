import { Checkbox } from "@/components/ui/checkbox";
import { useLegalModals } from "@/components/CookieConsent";
import { cn } from "@/lib/utils";

type TermsAcceptanceProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function TermsAcceptance({ id, checked, onCheckedChange, className }: TermsAcceptanceProps) {
  const { openTermsOfService } = useLegalModals();

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
          onClick={openTermsOfService}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          användarvillkoren
        </button>
        .
      </label>
    </div>
  );
}
