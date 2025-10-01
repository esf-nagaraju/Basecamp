import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SlaIndicatorProps {
  status: "green" | "yellow" | "red";
  daysRemaining?: number;
  className?: string;
}

export function SlaIndicator({ status, daysRemaining, className }: SlaIndicatorProps) {
  const statusConfig = {
    green: {
      color: "bg-chart-2",
      label: "On Track",
      ring: "ring-chart-2/20",
    },
    yellow: {
      color: "bg-chart-3",
      label: "At Risk",
      ring: "ring-chart-3/20",
    },
    red: {
      color: "bg-destructive animate-pulse",
      label: "Overdue",
      ring: "ring-destructive/20",
    },
  };

  const config = statusConfig[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-3 w-3 rounded-full ring-4",
            config.color,
            config.ring,
            className
          )}
          data-testid={`indicator-sla-${status}`}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{config.label}</p>
        {daysRemaining !== undefined && (
          <p className="text-xs">
            {daysRemaining > 0
              ? `${daysRemaining} days remaining`
              : `${Math.abs(daysRemaining)} days overdue`}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
