import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Section = {
  title: string;
  body: string;
};

type LegalDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  sections: readonly Section[];
};

export function LegalDocumentDialog({
  open,
  onOpenChange,
  title,
  description,
  sections,
}: LegalDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="max-h-[calc(85vh-7rem)] min-h-[8rem] overflow-y-auto px-6 py-5">
          {sections.length > 0 ? (
            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
