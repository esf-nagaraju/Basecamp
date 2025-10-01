import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ClaimStatus =
  | "new"
  | "in_work"
  | "pending_info"
  | "denied"
  | "appeal_pending"
  | "appealed"
  | "paid"
  | "partially_paid"
  | "write_off"
  | "closed";

interface StatusBadgeProps {
  status: ClaimStatus;
  className?: string;
}

const statusConfig: Record<
  ClaimStatus,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-chart-4 text-white" },
  in_work: { label: "In Work", className: "bg-chart-1 text-white" },
  pending_info: { label: "Pending Info", className: "bg-chart-3 text-white" },
  denied: { label: "Denied", className: "bg-destructive text-destructive-foreground" },
  appeal_pending: { label: "Appeal Pending", className: "bg-chart-3 text-white" },
  appealed: { label: "Appealed", className: "bg-chart-1 text-white" },
  paid: { label: "Paid", className: "bg-chart-2 text-white" },
  partially_paid: { label: "Partially Paid", className: "bg-chart-2/70 text-white" },
  write_off: { label: "Write Off", className: "bg-muted text-muted-foreground" },
  closed: { label: "Closed", className: "bg-secondary text-secondary-foreground" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      className={cn(config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
