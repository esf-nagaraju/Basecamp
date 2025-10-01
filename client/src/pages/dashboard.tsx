import { MetricCard } from "@/components/metric-card";
import { ClaimsTable } from "@/components/claims-table";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ClaimDetailPanel } from "@/components/claim-detail-panel";
import { ClipboardList, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Dashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const mockClaims = [
    {
      id: "1",
      patientName: "Sarah Johnson",
      invoiceNumber: "INV-2024-001234",
      payorName: "Blue Cross Blue Shield",
      balanceDue: 2450.0,
      invoiceAge: 47,
      status: "in_work" as const,
      slaStatus: "yellow" as const,
      lastAction: "Called payor 2 days ago",
    },
    {
      id: "2",
      patientName: "Michael Chen",
      invoiceNumber: "INV-2024-001235",
      payorName: "UnitedHealthcare",
      balanceDue: 1850.5,
      invoiceAge: 23,
      status: "new" as const,
      slaStatus: "green" as const,
      lastAction: "Assigned today",
    },
    {
      id: "3",
      patientName: "Emily Rodriguez",
      invoiceNumber: "INV-2024-001236",
      payorName: "Aetna",
      balanceDue: 5200.0,
      invoiceAge: 92,
      status: "denied" as const,
      slaStatus: "red" as const,
      lastAction: "Submitted appeal 5 days ago",
    },
    {
      id: "4",
      patientName: "David Williams",
      invoiceNumber: "INV-2024-001237",
      payorName: "Cigna",
      balanceDue: 780.25,
      invoiceAge: 15,
      status: "pending_info" as const,
      slaStatus: "green" as const,
      lastAction: "Requested documents today",
    },
    {
      id: "5",
      patientName: "Lisa Anderson",
      invoiceNumber: "INV-2024-001238",
      payorName: "Medicare",
      balanceDue: 3100.0,
      invoiceAge: 68,
      status: "appeal_pending" as const,
      slaStatus: "yellow" as const,
      lastAction: "Appeal in review 10 days ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your claims overview and worklist
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Assigned Claims"
          value="24"
          icon={<ClipboardList className="h-5 w-5" />}
          subtitle="8 new today"
          trend={{ value: 12, direction: "up" }}
        />
        <MetricCard
          title="Total Balance"
          value="$128.5K"
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Across all claims"
          trend={{ value: -5, direction: "down" }}
        />
        <MetricCard
          title="Avg Handle Time"
          value="18.5 min"
          icon={<Clock className="h-5 w-5" />}
          subtitle="Per claim"
          trend={{ value: -8, direction: "down" }}
        />
        <MetricCard
          title="Claims Resolved"
          value="127"
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="This month"
          trend={{ value: 23, direction: "up" }}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Worklist</h2>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-export">
              Export
            </Button>
            <Button data-testid="button-bulk-assign">Bulk Actions</Button>
          </div>
        </div>

        <SearchFilterBar />

        <ClaimsTable
          claims={mockClaims}
          onViewClaim={(claimId) => setSelectedClaimId(claimId)}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Showing 5 of 24 claims</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled data-testid="button-prev">
              Previous
            </Button>
            <Button variant="outline" size="sm" data-testid="button-next">
              Next
            </Button>
          </div>
        </div>
      </div>

      {selectedClaimId && (
        <ClaimDetailPanel
          claimId={selectedClaimId}
          onClose={() => setSelectedClaimId(null)}
        />
      )}
    </div>
  );
}
