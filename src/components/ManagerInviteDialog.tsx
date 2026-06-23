import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ManagerInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  defaultEmail?: string;
  isSubmitting?: boolean;
  onSubmit: (email: string) => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ManagerInviteDialog({
  open,
  onOpenChange,
  companyName,
  defaultEmail = "",
  isSubmitting = false,
  onSubmit,
}: ManagerInviteDialogProps) {
  const [email, setEmail] = useState(defaultEmail);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
    }
  }, [open, defaultEmail]);

  const handleSubmit = () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return;
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skicka managerinbjudan</DialogTitle>
          <DialogDescription>
            Ange e-postadressen som ska få inbjudan för {companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="manager-invite-email">E-postadress</Label>
          <Input
            id="manager-invite-email"
            type="email"
            autoComplete="email"
            placeholder="manager@foretag.se"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            className="bg-background border-border text-foreground"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-border"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button
            type="button"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValidEmail(email)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              "Skicka inbjudan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
