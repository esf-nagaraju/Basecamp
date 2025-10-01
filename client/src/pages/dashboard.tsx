import { MetricCard } from "@/components/metric-card";
import { ClaimsTable } from "@/components/claims-table";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ClaimDetailPanel } from "@/components/claim-detail-panel";
import { ClipboardList, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Claim } from "@shared/schema";

export default function Dashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [filters, setFilters] = useState({});

  const { data: claims, isLoading: claimsLoading } = useQuery<Claim[]>({
    queryKey: ['/api/claims', filters],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/metrics'],
  });

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
          value={metricsLoading ? "..." : (claims?.length || 0).toString()}
          icon={<ClipboardList className="h-5 w-5" />}
          subtitle={`${claims?.filter(c => c.status === "new").length || 0} new`}
          trend={{ value: 12, direction: "up" }}
        />
        <MetricCard
          title="Total Balance"
          value={metricsLoading ? "..." : `$${(((claims || []).reduce((sum, c) => sum + parseFloat(c.balanceDue as string || "0"), 0)) / 1000).toFixed(1)}K`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Across all claims"
        />
        <MetricCard
          title="Avg Age"
          value={metricsLoading ? "..." : `${Math.round(claims?.reduce((sum, c) => sum + (c.invoiceAge || 0), 0) / (claims?.length || 1))} days`}
          icon={<Clock className="h-5 w-5" />}
          subtitle="Invoice age"
        />
        <MetricCard
          title="At Risk Claims"
          value={metricsLoading ? "..." : (claims?.filter(c => c.slaStatus === "red").length || 0).toString()}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="SLA breach"
          trend={{ value: -5, direction: "down" }}
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

        <SearchFilterBar onFilterChange={setFilters} />

        {claimsLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading claims...
          </div>
        ) : (
          <>
            <ClaimsTable
              claims={claims?.map(c => ({
                id: c.id!,
                patientName: c.customerName,
                invoiceNumber: c.invoiceNumber,
                payorName: c.payorName,
                balanceDue: parseFloat(c.balanceDue as string || "0"),
                invoiceAge: c.invoiceAge || 0,
                status: c.status,
                slaStatus: c.slaStatus || "green",
                lastAction: c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned",
              })) || []}
              onViewClaim={(claimId) => setSelectedClaimId(claimId)}
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Showing {claims?.length || 0} claims</p>
            </div>
          </>
        )}
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
