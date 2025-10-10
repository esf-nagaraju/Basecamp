import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { USER_ROLES } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingDown, Users, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { subDays, format } from "date-fns";

export default function Analytics() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState({ 
    start: subDays(new Date(), 30), 
    end: new Date() 
  });

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.SYSTEM_ADMINISTRATOR))) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const { data: revenueTrends, isLoading: revenueLoading } = useQuery({
    queryKey: ['/api/analytics/revenue-trends', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
      });
      const res = await fetch(`/api/analytics/revenue-trends?${params}`);
      if (!res.ok) throw new Error('Failed to fetch revenue trends');
      return res.json();
    },
  });

  const { data: denialCodes, isLoading: denialLoading } = useQuery({
    queryKey: ['/api/analytics/denial-codes'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/denial-codes?limit=10');
      if (!res.ok) throw new Error('Failed to fetch denial codes');
      return res.json();
    },
  });

  const { data: teamPerformance, isLoading: teamLoading } = useQuery({
    queryKey: ['/api/analytics/team-performance'],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/team-performance?date=${format(new Date(), 'yyyy-MM-dd')}`);
      if (!res.ok) throw new Error('Failed to fetch team performance');
      return res.json();
    },
  });

  const { data: arAging, isLoading: agingLoading } = useQuery({
    queryKey: ['/api/analytics/ar-aging'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/ar-aging');
      if (!res.ok) throw new Error('Failed to fetch AR aging');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const totalRevenue = revenueTrends?.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0;
  const totalClaims = revenueTrends?.reduce((sum: number, item: any) => sum + item.claims, 0) || 0;
  const avgRevenuePerClaim = totalClaims > 0 ? totalRevenue / totalClaims : 0;

  const totalDenials = denialCodes?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
  const totalDenialBalance = denialCodes?.reduce((sum: number, item: any) => sum + item.totalBalance, 0) || 0;

  const totalARBalance = arAging?.reduce((sum: number, item: any) => sum + item.balance, 0) || 0;
  const over90Days = arAging?.find((item: any) => item.bucket === '90+ days')?.balance || 0;
  const over90Percentage = totalARBalance > 0 ? (over90Days / totalARBalance * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-analytics-title">Analytics & Reporting</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into revenue, denials, team performance, and AR aging
        </p>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days • ${avgRevenuePerClaim.toFixed(0)}/claim avg
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-denials">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Denials</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDenials.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(totalDenialBalance / 1000).toFixed(0)}K at risk
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-team-size">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Today's performance tracked
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ar-aging">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AR 90+ Days</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{over90Percentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(over90Days / 1000).toFixed(0)}K over 90 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <Card data-testid="card-revenue-trends">
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Daily revenue collection over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Loading revenue data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                />
                <YAxis 
                  className="text-xs"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="Revenue"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Denial Codes */}
        <Card data-testid="card-denial-codes">
          <CardHeader>
            <CardTitle>Top Denial Codes</CardTitle>
            <CardDescription>Most frequent denial reasons and financial impact</CardDescription>
          </CardHeader>
          <CardContent>
            {denialLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading denial data...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {denialCodes?.slice(0, 8).map((denial: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{denial.code}</TableCell>
                      <TableCell className="text-right">{denial.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(denial.totalBalance / 1000).toFixed(1)}K</TableCell>
                      <TableCell className="text-right">${denial.avgBalance.toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* AR Aging Distribution */}
        <Card data-testid="card-ar-aging-chart">
          <CardHeader>
            <CardTitle>AR Aging Distribution</CardTitle>
            <CardDescription>Outstanding balance by aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            {agingLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading AR aging data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={arAging}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" className="text-xs" />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                  />
                  <Legend />
                  <Bar dataKey="balance" fill="hsl(var(--chart-2))" name="AR Balance" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Scorecard */}
      <Card data-testid="card-team-performance">
        <CardHeader>
          <CardTitle>Team Performance Scorecard</CardTitle>
          <CardDescription>Individual performance metrics for today</CardDescription>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading team performance...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-right">Claims</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance?.slice(0, 10).map((member: any) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">{member.userName}</TableCell>
                    <TableCell className="text-right">{member.claimsProcessed.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${(member.revenue / 1000).toFixed(1)}K</TableCell>
                    <TableCell className="text-right">{member.pending}</TableCell>
                    <TableCell className="text-right">{member.avgHandlingTime > 0 ? `${member.avgHandlingTime.toFixed(0)}m` : '-'}</TableCell>
                    <TableCell className="text-right">{member.accuracyRate > 0 ? `${member.accuracyRate}%` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
