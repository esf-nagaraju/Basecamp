import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, Phone, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProductivityRecord {
  id: string;
  date: string;
  userName: string;
  role: string;
  claimsProcessed: number;
  tasksCompleted: number;
  callsMade: number;
  revenueCollected: number;
  hoursWorked: number;
  trend: "up" | "down" | "stable";
}

const testData: ProductivityRecord[] = [
  {
    id: "1",
    date: "2024-10-02",
    userName: "Sarah Johnson",
    role: "Agent",
    claimsProcessed: 45,
    tasksCompleted: 32,
    callsMade: 28,
    revenueCollected: 12500,
    hoursWorked: 8,
    trend: "up"
  },
  {
    id: "2",
    date: "2024-10-02",
    userName: "Michael Chen",
    role: "Agent",
    claimsProcessed: 38,
    tasksCompleted: 29,
    callsMade: 24,
    revenueCollected: 9800,
    hoursWorked: 8,
    trend: "stable"
  },
  {
    id: "3",
    date: "2024-10-02",
    userName: "Emily Rodriguez",
    role: "Lead",
    claimsProcessed: 52,
    tasksCompleted: 41,
    callsMade: 35,
    revenueCollected: 15200,
    hoursWorked: 8.5,
    trend: "up"
  },
  {
    id: "4",
    date: "2024-10-02",
    userName: "David Kim",
    role: "Agent",
    claimsProcessed: 42,
    tasksCompleted: 30,
    callsMade: 26,
    revenueCollected: 11300,
    hoursWorked: 8,
    trend: "down"
  },
  {
    id: "5",
    date: "2024-10-02",
    userName: "Jessica Martinez",
    role: "Agent",
    claimsProcessed: 48,
    tasksCompleted: 36,
    callsMade: 31,
    revenueCollected: 13400,
    hoursWorked: 8,
    trend: "up"
  },
  {
    id: "6",
    date: "2024-10-02",
    userName: "Robert Taylor",
    role: "Lead",
    claimsProcessed: 50,
    tasksCompleted: 38,
    callsMade: 33,
    revenueCollected: 14100,
    hoursWorked: 8.5,
    trend: "stable"
  },
  {
    id: "7",
    date: "2024-10-02",
    userName: "Amanda White",
    role: "Agent",
    claimsProcessed: 36,
    tasksCompleted: 27,
    callsMade: 22,
    revenueCollected: 8900,
    hoursWorked: 7.5,
    trend: "down"
  },
  {
    id: "8",
    date: "2024-10-02",
    userName: "Christopher Lee",
    role: "Agent",
    claimsProcessed: 44,
    tasksCompleted: 33,
    callsMade: 29,
    revenueCollected: 12000,
    hoursWorked: 8,
    trend: "up"
  },
  {
    id: "9",
    date: "2024-10-02",
    userName: "Nicole Brown",
    role: "Manager",
    claimsProcessed: 55,
    tasksCompleted: 45,
    callsMade: 38,
    revenueCollected: 16500,
    hoursWorked: 9,
    trend: "up"
  },
  {
    id: "10",
    date: "2024-10-02",
    userName: "James Wilson",
    role: "Agent",
    claimsProcessed: 40,
    tasksCompleted: 31,
    callsMade: 25,
    revenueCollected: 10700,
    hoursWorked: 8,
    trend: "stable"
  }
];

export default function Productivity() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "lead" && user.role !== "manager"))) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user || (user.role !== "lead" && user.role !== "manager")) {
    return null;
  }

  const totalClaimsProcessed = testData.reduce((sum, record) => sum + record.claimsProcessed, 0);
  const totalRevenue = testData.reduce((sum, record) => sum + record.revenueCollected, 0);
  const totalTasks = testData.reduce((sum, record) => sum + record.tasksCompleted, 0);
  const totalCalls = testData.reduce((sum, record) => sum + record.callsMade, 0);
  const avgClaimsPerPerson = Math.round(totalClaimsProcessed / testData.length);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else if (trend === "down") {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
    return null;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "Manager") return "default";
    if (role === "Lead") return "secondary";
    return "outline";
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-productivity">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Daily Productivity</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">
          Team performance metrics for October 02, 2024
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-claims">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Processed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-claims">{totalClaimsProcessed}</div>
            <p className="text-xs text-muted-foreground">
              Avg {avgClaimsPerPerson} per person
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {testData.length} team members
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all team members
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-calls">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-calls">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Customer contacts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-productivity-table">
        <CardHeader>
          <CardTitle data-testid="text-table-title">Team Member Performance</CardTitle>
          <CardDescription data-testid="text-table-description">
            Individual productivity metrics for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-name">Name</TableHead>
                <TableHead data-testid="header-role">Role</TableHead>
                <TableHead className="text-right" data-testid="header-claims">Claims</TableHead>
                <TableHead className="text-right" data-testid="header-tasks">Tasks</TableHead>
                <TableHead className="text-right" data-testid="header-calls">Calls</TableHead>
                <TableHead className="text-right" data-testid="header-revenue">Revenue</TableHead>
                <TableHead className="text-right" data-testid="header-hours">Hours</TableHead>
                <TableHead className="text-right" data-testid="header-trend">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testData.map((record) => (
                <TableRow key={record.id} data-testid={`row-productivity-${record.id}`}>
                  <TableCell className="font-medium" data-testid={`text-name-${record.id}`}>
                    {record.userName}
                  </TableCell>
                  <TableCell data-testid={`badge-role-${record.id}`}>
                    <Badge variant={getRoleBadgeVariant(record.role)}>
                      {record.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-claims-${record.id}`}>
                    {record.claimsProcessed}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-tasks-${record.id}`}>
                    {record.tasksCompleted}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-calls-${record.id}`}>
                    {record.callsMade}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-revenue-${record.id}`}>
                    {formatCurrency(record.revenueCollected)}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-hours-${record.id}`}>
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {record.hoursWorked}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`icon-trend-${record.id}`}>
                    {getTrendIcon(record.trend)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
