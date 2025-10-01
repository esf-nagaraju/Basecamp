import { StatusBadge } from '../status-badge';

export default function StatusBadgeExample() {
  return (
    <div className="p-6 flex flex-wrap gap-2 bg-background">
      <StatusBadge status="new" />
      <StatusBadge status="in_work" />
      <StatusBadge status="pending_info" />
      <StatusBadge status="denied" />
      <StatusBadge status="paid" />
      <StatusBadge status="partially_paid" />
    </div>
  );
}
