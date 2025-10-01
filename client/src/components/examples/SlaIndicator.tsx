import { SlaIndicator } from '../sla-indicator';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function SlaIndicatorExample() {
  return (
    <TooltipProvider>
      <div className="p-6 flex gap-4 items-center bg-background">
        <SlaIndicator status="green" daysRemaining={15} />
        <SlaIndicator status="yellow" daysRemaining={3} />
        <SlaIndicator status="red" daysRemaining={-5} />
      </div>
    </TooltipProvider>
  );
}
