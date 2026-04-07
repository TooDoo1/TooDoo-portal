import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive";
}

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success/10 text-success border-success/20 hover:bg-success/20" },
  pending: { label: "Väntande", className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" },
  inactive: { label: "Inaktiv", className: "bg-muted text-muted-foreground border-border hover:bg-muted" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
