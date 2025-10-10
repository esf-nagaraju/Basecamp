import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { USER_ROLES } from "@shared/schema";

export default function Analytics() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.SYSTEM_ADMINISTRATOR))) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-analytics-title">Analytics & Reporting</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into claims, revenue, and team performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-placeholder-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Advanced Analytics</div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue trends and forecasting
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-placeholder-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Financial Intelligence</div>
            <p className="text-xs text-muted-foreground mt-1">
              Payor performance and AR aging
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-placeholder-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Denial Analytics</div>
            <p className="text-xs text-muted-foreground mt-1">
              Root cause analysis and trends
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-placeholder-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational Metrics</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cycle time and efficiency analysis
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard - Under Development</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            The Analytics page is currently being designed to provide comprehensive reporting and insights
            for your healthcare revenue cycle management operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
