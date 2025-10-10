import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, Phone, Clock, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@shared/schema";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface DailyProductivityRecord {
  date: string;
  userId: string;
  userName: string;
  role: string;
  tasksCompleted: number;
  claimsProcessed: number;
  activitiesLogged: number;
  hoursWorked: number;
  revenueCollected: number;
}

interface DailyMetricsSummary {
  date: string;
  totalTasks: number;
  totalClaims: number;
  totalActivities: number;
  totalRevenue: number;
  activeUsers: number;
}

type DateRange = "today" | "yesterday" | "last7" | "last30" | "custom";
type ViewMode = "daily" | "summary";

export default function Productivity() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  const [dateRange, setDateRange] = useState<DateRange>("last7");
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [startDate, setStartDate] = useState<Date>(startOfDay(subDays(new Date(), 7)));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.SYSTEM_ADMINISTRATOR))) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const { data: historicalData = [], isLoading: isLoadingHistorical, error: historicalError } = useQuery<DailyProductivityRecord[]>({
    queryKey: ['/api/productivity/historical', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/productivity/historical?${params}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: summaryData = [], isLoading: isLoadingSummary, error: summaryError } = useQuery<DailyMetricsSummary[]>({
    queryKey: ['/api/productivity/summary', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/productivity/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch summary data');
      return response.json();
    },
    enabled: !!user,
  });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    const now = new Date();
    
    switch (range) {
      case "today":
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case "yesterday":
        setStartDate(startOfDay(subDays(now, 1)));
        setEndDate(endOfDay(subDays(now, 1)));
        break;
      case "last7":
        setStartDate(startOfDay(subDays(now, 7)));
        setEndDate(endOfDay(now));
        break;
      case "last30":
        setStartDate(startOfDay(subDays(now, 30)));
        setEndDate(endOfDay(now));
        break;
    }
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user || (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.SYSTEM_ADMINISTRATOR)) {
    return null;
  }

  const isLoadingData = isLoadingHistorical || isLoadingSummary;
  const hasError = historicalError || summaryError;

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">Failed to load productivity data</p>
        <Button onClick={() => window.location.reload()} data-testid="button-retry">Retry</Button>
      </div>
    );
  }

  const totalTasks = summaryData.reduce((sum, day) => sum + day.totalTasks, 0);
  const totalRevenue = summaryData.reduce((sum, day) => sum + day.totalRevenue, 0);
  const totalClaims = summaryData.reduce((sum, day) => sum + day.totalClaims, 0);
  const totalActivities = summaryData.reduce((sum, day) => sum + day.totalActivities, 0);

  const avgTasksPerDay = summaryData.length > 0 ? Math.round(totalTasks / summaryData.length) : 0;
  const avgRevenuePerDay = summaryData.length > 0 ? totalRevenue / summaryData.length : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === USER_ROLES.MANAGER || role === USER_ROLES.SYSTEM_ADMINISTRATOR) return "default";
    return "outline";
  };

  const chartData = summaryData.map(day => ({
    date: format(new Date(day.date), 'MM/dd'),
    tasks: day.totalTasks,
    claims: day.totalClaims,
    revenue: day.totalRevenue / 1000,
  }));

  const userSummaryData = historicalData.reduce((acc, record) => {
    const key = `${record.userId}-${record.userName}`;
    if (!acc[key]) {
      acc[key] = {
        userId: record.userId,
        userName: record.userName,
        role: record.role,
        totalTasks: 0,
        totalClaims: 0,
        totalActivities: 0,
        totalRevenue: 0,
        totalHours: 0,
        dailyRecords: [] as DailyProductivityRecord[],
      };
    }
    acc[key].totalTasks += record.tasksCompleted;
    acc[key].totalClaims += record.claimsProcessed;
    acc[key].totalActivities += record.activitiesLogged;
    acc[key].totalRevenue += record.revenueCollected;
    acc[key].totalHours += record.hoursWorked;
    acc[key].dailyRecords.push(record);
    return acc;
  }, {} as Record<string, any>);

  const userSummaries = Object.values(userSummaryData).sort((a: any, b: any) => 
    b.totalRevenue - a.totalRevenue
  );

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-productivity">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Historical Productivity
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Team performance metrics and trends
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value: DateRange) => handleDateRangeChange(value)}>
            <SelectTrigger className="w-[160px]" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" data-testid="option-today">Today</SelectItem>
              <SelectItem value="yesterday" data-testid="option-yesterday">Yesterday</SelectItem>
              <SelectItem value="last7" data-testid="option-last7">Last 7 Days</SelectItem>
              <SelectItem value="last30" data-testid="option-last30">Last 30 Days</SelectItem>
              <SelectItem value="custom" data-testid="option-custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-custom-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "MM/dd/yy")} - {format(endDate, "MM/dd/yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-3">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(startOfDay(date))}
                      initialFocus
                      data-testid="calendar-start-date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(endOfDay(date))}
                      data-testid="calendar-end-date"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Allocated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-tasks">{totalTasks.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {avgTasksPerDay.toLocaleString()} per day
                </p>
                <div className="h-12 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryData}>
                      <Line 
                        type="monotone" 
                        dataKey="totalTasks" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {formatCurrency(avgRevenuePerDay)} per day
                </p>
                <div className="h-12 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryData}>
                      <Line 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-claims">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Processed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-claims">{totalClaims.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Resolved and closed
                </p>
                <div className="h-12 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryData}>
                      <Line 
                        type="monotone" 
                        dataKey="totalClaims" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-activities">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities Logged</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-activities">{totalActivities.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Team interactions
                </p>
                <div className="h-12 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryData}>
                      <Line 
                        type="monotone" 
                        dataKey="totalActivities" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-trend-chart">
        <CardHeader>
          <CardTitle>Productivity Trends</CardTitle>
          <CardDescription>Daily metrics over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="hsl(var(--chart-1))" name="Tasks" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="claims" stroke="hsl(var(--chart-2))" name="Claims" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-3))" name="Revenue ($K)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-productivity-table">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle data-testid="text-table-title">Team Performance</CardTitle>
              <CardDescription data-testid="text-table-description">
                Individual productivity breakdown
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} data-testid="tabs-view-mode">
              <TabsList>
                <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
                <TabsTrigger value="daily" data-testid="tab-daily">Daily View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-name">Team Member</TableHead>
                <TableHead data-testid="header-role">Role</TableHead>
                <TableHead className="text-right" data-testid="header-tasks">Tasks</TableHead>
                <TableHead className="text-right" data-testid="header-claims">Claims</TableHead>
                <TableHead className="text-right" data-testid="header-revenue">Revenue</TableHead>
                <TableHead className="text-right" data-testid="header-hours">Hours</TableHead>
                {viewMode === "daily" && <TableHead className="text-right" data-testid="header-expand"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                <TableRow>
                  <TableCell colSpan={viewMode === "daily" ? 7 : 6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-muted-foreground">Loading productivity data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : userSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewMode === "daily" ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No productivity data available for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                userSummaries.flatMap((summary: any) => {
                  const mainRow = (
                    <TableRow 
                      key={summary.userId}
                      data-testid={`row-user-${summary.userId}`}
                    className={cn(viewMode === "daily" && "cursor-pointer hover-elevate")}
                    onClick={() => viewMode === "daily" && toggleUserExpansion(summary.userId)}
                  >
                    <TableCell className="font-medium" data-testid={`text-name-${summary.userId}`}>
                      {summary.userName}
                    </TableCell>
                    <TableCell data-testid={`badge-role-${summary.userId}`}>
                      <Badge variant={getRoleBadgeVariant(summary.role)}>
                        {summary.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-tasks-${summary.userId}`}>
                      {summary.totalTasks}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-claims-${summary.userId}`}>
                      {summary.totalClaims}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-revenue-${summary.userId}`}>
                      {formatCurrency(summary.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-hours-${summary.userId}`}>
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {summary.totalHours.toFixed(1)}
                      </div>
                    </TableCell>
                    {viewMode === "daily" && (
                      <TableCell className="text-right">
                        <button 
                          data-testid={`button-expand-${summary.userId}`}
                          className="inline-flex items-center justify-center"
                        >
                          {expandedUsers.has(summary.userId) ? (
                            <ChevronDown className="h-4 w-4" data-testid={`icon-chevron-down-${summary.userId}`} />
                          ) : (
                            <ChevronRight className="h-4 w-4" data-testid={`icon-chevron-right-${summary.userId}`} />
                          )}
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                  
                  const dailyRows = (viewMode === "daily" && expandedUsers.has(summary.userId))
                    ? summary.dailyRecords.map((record: DailyProductivityRecord) => (
                    <TableRow 
                      key={`${record.userId}-${record.date}`}
                      className="bg-muted/50"
                      data-testid={`row-daily-${record.userId}-${record.date}`}
                    >
                      <TableCell className="pl-8 text-muted-foreground">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{record.tasksCompleted}</TableCell>
                      <TableCell className="text-right">{record.claimsProcessed}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.revenueCollected)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {record.hoursWorked.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                  : [];
                  
                  return [mainRow, ...dailyRows];
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
