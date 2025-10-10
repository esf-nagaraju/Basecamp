import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { Loader2, User, Bell, Monitor } from "lucide-react";

interface UserPreferences {
  theme?: string;
  timezone?: string;
  dateFormat?: string;
  density?: string;
  emailNotifications?: boolean;
  taskAssignmentNotifications?: boolean;
  dailyDigest?: boolean;
  highValueAlerts?: boolean;
  highValueThreshold?: number;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  preferences?: UserPreferences;
}

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: theme,
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    density: 'comfortable',
    emailNotifications: true,
    taskAssignmentNotifications: true,
    dailyDigest: false,
    highValueAlerts: true,
    highValueThreshold: 10000,
    ...(user?.preferences || {}),
  });

  useState(() => {
    if (user?.preferences) {
      setPreferences({
        theme: theme,
        timezone: 'America/New_York',
        dateFormat: 'MM/dd/yyyy',
        density: 'comfortable',
        emailNotifications: true,
        taskAssignmentNotifications: true,
        dailyDigest: false,
        highValueAlerts: true,
        highValueThreshold: 10000,
        ...user.preferences,
      });
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: UserPreferences) => {
      return await apiRequest('PATCH', '/api/user/preferences', { preferences: newPreferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleThemeChange = (value: string) => {
    if (value === 'light' || value === 'dark') {
      setTheme(value);
      setPreferences({ ...preferences, theme: value });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    rcm_specialist: 'RCM Specialist',
    manager: 'Manager',
    system_administrator: 'System Administrator',
    client_user: 'Client User',
    auditor: 'Auditor',
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        {/* Personal Information */}
        <Card data-testid="card-personal-info">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <CardDescription>
              Your basic account information (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={user?.firstName || ''}
                  readOnly
                  disabled
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={user?.lastName || ''}
                  readOnly
                  disabled
                  data-testid="input-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                readOnly
                disabled
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={roleLabels[user?.role || ''] || user?.role || ''}
                readOnly
                disabled
                data-testid="input-role"
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card data-testid="card-display-preferences">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              <CardTitle>Display Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={preferences.theme || theme}
                onValueChange={handleThemeChange}
              >
                <SelectTrigger id="theme" data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Time Zone</Label>
              <Select
                value={preferences.timezone}
                onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
              >
                <SelectTrigger id="timezone" data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={preferences.dateFormat}
                onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
              >
                <SelectTrigger id="dateFormat" data-testid="select-dateformat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="density">Page Density</Label>
              <Select
                value={preferences.density}
                onValueChange={(value) => setPreferences({ ...preferences, density: value })}
              >
                <SelectTrigger id="density" data-testid="select-density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card data-testid="card-notification-preferences">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Control how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, emailNotifications: checked })
                }
                data-testid="switch-email-notifications"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="taskAssignmentNotifications">Task Assignment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when tasks are assigned to you
                </p>
              </div>
              <Switch
                id="taskAssignmentNotifications"
                checked={preferences.taskAssignmentNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, taskAssignmentNotifications: checked })
                }
                data-testid="switch-task-notifications"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dailyDigest">Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of your tasks and activity
                </p>
              </div>
              <Switch
                id="dailyDigest"
                checked={preferences.dailyDigest}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, dailyDigest: checked })
                }
                data-testid="switch-daily-digest"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="highValueAlerts">High-Value Claim Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get alerted for high-value claims
                </p>
              </div>
              <Switch
                id="highValueAlerts"
                checked={preferences.highValueAlerts}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, highValueAlerts: checked })
                }
                data-testid="switch-high-value-alerts"
              />
            </div>

            {preferences.highValueAlerts && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="highValueThreshold">Alert Threshold ($)</Label>
                <Input
                  id="highValueThreshold"
                  type="number"
                  value={preferences.highValueThreshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      highValueThreshold: parseInt(e.target.value) || 10000,
                    })
                  }
                  data-testid="input-high-value-threshold"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSavePreferences}
            disabled={updatePreferencesMutation.isPending}
            data-testid="button-save-preferences"
          >
            {updatePreferencesMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
