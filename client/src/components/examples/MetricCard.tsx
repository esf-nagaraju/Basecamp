import { MetricCard } from '../metric-card';
import { ClipboardList } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="p-6 space-y-4 bg-background">
      <MetricCard
        title="Assigned Claims"
        value="24"
        icon={<ClipboardList className="h-5 w-5" />}
        subtitle="8 new today"
        trend={{ value: 12, direction: "up" }}
      />
    </div>
  );
}
