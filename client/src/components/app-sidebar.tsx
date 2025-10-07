import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  FileText,
  AlertCircle,
  LogOut,
  Upload,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: ["agent", "lead", "manager", "admin"],
  },
  {
    title: "My Worklist",
    url: "/worklist",
    icon: ClipboardList,
    roles: ["agent"],
  },
  {
    title: "Team Management",
    url: "/team",
    icon: Users,
    roles: ["lead", "manager", "admin"],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    roles: ["lead", "manager", "admin"],
  },
  {
    title: "Claims",
    url: "/claims",
    icon: FileText,
    roles: ["agent", "lead", "manager", "admin"],
  },
  {
    title: "Denials",
    url: "/denials",
    icon: AlertCircle,
    roles: ["agent", "lead", "manager", "admin"],
  },
  {
    title: "Task Management",
    url: "/task-management",
    icon: Upload,
    roles: ["agent", "lead", "manager", "admin"],
  },
  {
    title: "Productivity",
    url: "/productivity",
    icon: TrendingUp,
    roles: ["lead", "manager", "admin"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["agent", "lead", "manager", "admin"],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const currentRole = user?.role || "agent";

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.fullName) {
      const parts = user.fullName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      agent: "AR Specialist",
      lead: "Team Lead",
      manager: "AR Manager",
      client: "Client",
      admin: "Administrator",
    };
    return roleMap[role] || role;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ClipboardList className="h-6 w-6" />
          </div>
          {state === "expanded" && (
            <div>
              <h2 className="text-lg font-semibold">ClaimFlowPro</h2>
              <p className="text-xs text-muted-foreground">AR Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="link-settings">
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        {state === "expanded" ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar>
                {user?.profileImageUrl && (
                  <AvatarImage src={user.profileImageUrl} alt={user.fullName || user.email || 'User'} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate" data-testid="text-user-name">
                  {user?.fullName || user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-user-role">
                  {getRoleLabel(currentRole)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </>
        ) : (
          <div className="flex justify-center">
            <Avatar>
              {user?.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={user.fullName || user.email || 'User'} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
