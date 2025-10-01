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
  const [filters, setFilters] = useState<Record<string, any>>({});

  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v.toString()));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  const queryString = queryParams.toString();

  const { data: claims, isLoading: claimsLoading, isError, error, refetch } = useQuery<Claim[]>({
    queryKey: ['/api/claims', queryString],
    queryFn: async () => {
      const url = queryString ? `/api/claims?${queryString}` : '/api/claims';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch claims');
      return res.json();
    },
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
          value={claimsLoading ? "..." : (claims?.length || 0).toString()}
          icon={<ClipboardList className="h-5 w-5" />}
          subtitle={`${(claims || []).filter(c => c.status === "new").length} new`}
          trend={{ value: 12, direction: "up" }}
        />
        <MetricCard
          title="Total Balance"
          value={claimsLoading ? "..." : `$${(((claims || []).reduce((sum, c) => sum + parseFloat(c.balanceDue as string || "0"), 0)) / 1000).toFixed(1)}K`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Across all claims"
        />
        <MetricCard
          title="Avg Age"
          value={claimsLoading ? "..." : `${Math.round((claims || []).reduce((sum, c) => sum + (c.invoiceAge || 0), 0) / ((claims || []).length || 1))} days`}
          icon={<Clock className="h-5 w-5" />}
          subtitle="Invoice age"
        />
        <MetricCard
          title="At Risk Claims"
          value={claimsLoading ? "..." : ((claims || []).filter(c => c.slaStatus === "red").length).toString()}
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

        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">Failed to load claims: {(error as Error)?.message}</p>
            <Button onClick={() => refetch()} variant="outline" data-testid="button-retry">
              Retry
            </Button>
          </div>
        ) : claimsLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading claims...
          </div>
        ) : !claims || claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-muted-foreground">No claims match your filters</p>
            {(filters.status || filters.search || filters.minAge) && (
              <Button 
                onClick={() => setFilters({})} 
                variant="outline" 
                data-testid="button-clear-all-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <ClaimsTable
              claims={claims.map(c => ({
                id: c.id!,
                patientName: c.customerName,
                invoiceNumber: c.invoiceNumber,
                payorName: c.payorName,
                balanceDue: parseFloat(c.balanceDue as string || "0"),
                invoiceAge: c.invoiceAge || 0,
                status: c.status,
                slaStatus: (c.slaStatus || "green") as "green" | "yellow" | "red",
                lastAction: c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned",
              }))}
              onViewClaim={(claimId) => setSelectedClaimId(claimId)}
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Showing {claims.length} claims</p>
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
