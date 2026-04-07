import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive";
}

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success/15 text-success border-success/25" },
  pending: { label: "Väntande", className: "bg-warning/15 text-warning border-warning/25" },
  inactive: { label: "Inaktiv", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium px-2.5 py-0.5", config.className)}>
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", {
        "bg-success": status === "active",
        "bg-warning": status === "pending",
        "bg-muted-foreground": status === "inactive",
      })} />
      {config.label}
    </Badge>
  );
}
