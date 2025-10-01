import { MetricCard } from "@/components/metric-card";
import { ClaimsTable } from "@/components/claims-table";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ClaimDetailPanel } from "@/components/claim-detail-panel";
import { ClipboardList, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Claim, Task } from "@shared/schema";

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

  const { data: tasks, isLoading: tasksLoading } = useQuery<(Task & { claim?: Claim })[]>({
    queryKey: ['/api/tasks', 'my-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks?status=pending');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const tasksData = await res.json();
      
      const tasksWithClaims = await Promise.all(
        tasksData.map(async (task: Task) => {
          const claimRes = await fetch(`/api/claims/${task.claimId}`);
          if (claimRes.ok) {
            const claim = await claimRes.json();
            return { ...task, claim };
          }
          return task;
        })
      );
      
      return tasksWithClaims;
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

        {tasksLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading your tasks...
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-muted-foreground">No pending tasks assigned to you</p>
          </div>
        ) : (
          <>
            <ClaimsTable
              claims={tasks.map(t => ({
                id: t.claim?.id || t.claimId,
                patientName: t.claim?.customerName || "Unknown",
                invoiceNumber: t.claim?.invoiceNumber || "N/A",
                payorName: t.claim?.payorName || "N/A",
                balanceDue: parseFloat(t.claim?.balanceDue as string || "0"),
                invoiceAge: t.claim?.invoiceAge || 0,
                status: t.claim?.status || "unknown",
                slaStatus: (t.claim?.slaStatus || "green") as "green" | "yellow" | "red",
                lastAction: t.title,
              }))}
              onViewClaim={(claimId) => setSelectedClaimId(claimId)}
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Showing {tasks.length} tasks</p>
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
