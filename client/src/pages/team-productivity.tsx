import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Target, TrendingUp, Award, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface TeamMember {
  userId: string;
  employeeName: string;
  employeeId: string | null;
  email: string | null;
  role: string;
  region: string | null;
  payer: string | null;
  dailyClaimTarget: number;
  claimsProcessedToday: number;
  performancePercent: number;
  status: string;
}

const formatRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'rcm_specialist': 'RCM Specialist',
    'auditor': 'Auditor',
    'manager': 'Manager',
    'system_administrator': 'System Administrator',
  };
  return roleMap[role] || role;
};

type SortColumn = 'name' | 'employeeId';
type SortDirection = 'asc' | 'desc' | null;

export default function TeamProductivity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [assignRegion, setAssignRegion] = useState("");
  const [assignPayer, setAssignPayer] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { data: fetchedMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/team/members', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      const response = await fetch(`/api/team/members?${params}`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
    enabled: !!user,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const members = [...fetchedMembers].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: string | null = null;
    let bValue: string | null = null;

    if (sortColumn === 'name') {
      aValue = a.employeeName;
      bValue = b.employeeName;
    } else if (sortColumn === 'employeeId') {
      aValue = a.employeeId;
      bValue = b.employeeId;
    }

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { userIds: string[]; region?: string; payer?: string }) => {
      return await apiRequest('POST', '/api/team/assign', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      setIsAssignDialogOpen(false);
      setSelectedMembers([]);
      setAssignRegion("");
      setAssignPayer("");
      toast({
        title: "Success",
        description: "Team assignments updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignments",
        variant: "destructive",
      });
    },
  });

  const targetMutation = useMutation({
    mutationFn: async (data: { userIds: string[]; claimTarget: number }) => {
      return await apiRequest('POST', '/api/team/targets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      setIsTargetDialogOpen(false);
      setSelectedMembers([]);
      setTargetAmount("");
      toast({
        title: "Success",
        description: "Daily targets updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update targets",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(members.map(m => m.userId));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, userId]);
    } else {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    }
  };

  const handleAssign = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one team member",
        variant: "destructive",
      });
      return;
    }

    assignMutation.mutate({
      userIds: selectedMembers,
      region: assignRegion || undefined,
      payer: assignPayer || undefined,
    });
  };

  const handleSetTarget = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one team member",
        variant: "destructive",
      });
      return;
    }

    const target = parseInt(targetAmount);
    if (isNaN(target) || target < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid target number",
        variant: "destructive",
      });
      return;
    }

    targetMutation.mutate({
      userIds: selectedMembers,
      claimTarget: target,
    });
  };

  const getPerformanceBadge = (percent: number) => {
    if (percent >= 100) {
      return <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-high-performance">High</Badge>;
    } else if (percent >= 80) {
      return <Badge className="bg-yellow-600 hover:bg-yellow-700" data-testid="badge-medium-performance">Medium</Badge>;
    } else {
      return <Badge className="bg-red-600 hover:bg-red-700" data-testid="badge-low-performance">Low</Badge>;
    }
  };

  const totalMembers = members.length;
  const avgPerformance = totalMembers > 0
    ? Math.round(members.reduce((sum, m) => sum + m.performancePercent, 0) / totalMembers)
    : 0;
  const highPerformers = members.filter(m => m.performancePercent >= 100).length;
  const totalProcessed = members.reduce((sum, m) => sum + m.claimsProcessedToday, 0);

  if (!user || (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.SYSTEM_ADMINISTRATOR)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Team Productivity
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage team assignments, targets, and monitor real-time productivity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-members">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-performance">{avgPerformance}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-high-performers">{highPerformers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Processed Today</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-processed">{totalProcessed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Team Members</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-members"
                />
              </div>
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={selectedMembers.length === 0}
                    data-testid="button-assign-region-payer"
                  >
                    Assign Region/Payer
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-assign">
                  <DialogHeader>
                    <DialogTitle>Assign Region/Payer</DialogTitle>
                    <DialogDescription>
                      Assign region and payer to {selectedMembers.length} selected member(s)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        value={assignRegion}
                        onChange={(e) => setAssignRegion(e.target.value)}
                        placeholder="Enter region (optional)"
                        data-testid="input-assign-region"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payer">Payer</Label>
                      <Input
                        id="payer"
                        value={assignPayer}
                        onChange={(e) => setAssignPayer(e.target.value)}
                        placeholder="Enter payer (optional)"
                        data-testid="input-assign-payer"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} data-testid="button-cancel-assign">
                      Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={assignMutation.isPending} data-testid="button-confirm-assign">
                      {assignMutation.isPending ? "Assigning..." : "Assign"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={selectedMembers.length === 0}
                    data-testid="button-set-daily-target"
                  >
                    Set Daily Target
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-target">
                  <DialogHeader>
                    <DialogTitle>Set Daily Target</DialogTitle>
                    <DialogDescription>
                      Set daily claim target for {selectedMembers.length} selected member(s)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="target">Claims Target</Label>
                      <Input
                        id="target"
                        type="number"
                        min="0"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="Enter daily target"
                        data-testid="input-daily-target"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)} data-testid="button-cancel-target">
                      Cancel
                    </Button>
                    <Button onClick={handleSetTarget} disabled={targetMutation.isPending} data-testid="button-confirm-target">
                      {targetMutation.isPending ? "Setting..." : "Set Target"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === members.length && members.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-8 px-2 hover-elevate"
                        data-testid="button-sort-name"
                      >
                        Name
                        {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('employeeId')}
                        className="h-8 px-2 hover-elevate"
                        data-testid="button-sort-employee-id"
                      >
                        Employee ID
                        {getSortIcon('employeeId')}
                      </Button>
                    </TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Daily Target</TableHead>
                    <TableHead>Processed Today</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No team members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.userId} data-testid={`row-member-${member.userId}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.userId)}
                            onChange={(e) => handleSelectMember(member.userId, e.target.checked)}
                            data-testid={`checkbox-member-${member.userId}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${member.userId}`}>
                          {member.employeeName}
                        </TableCell>
                        <TableCell data-testid={`text-employee-id-${member.userId}`}>
                          {member.employeeId || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-role-${member.userId}`}>
                          {formatRole(member.role)}
                        </TableCell>
                        <TableCell data-testid={`text-region-${member.userId}`}>
                          {member.region || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-payer-${member.userId}`}>
                          {member.payer || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-target-${member.userId}`}>
                          {member.dailyClaimTarget}
                        </TableCell>
                        <TableCell data-testid={`text-processed-${member.userId}`}>
                          {member.claimsProcessedToday}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span data-testid={`text-performance-${member.userId}`}>
                              {member.performancePercent}%
                            </span>
                            {getPerformanceBadge(member.performancePercent)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
