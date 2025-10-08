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
  UserCog,
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
import { USER_ROLES } from "@shared/schema";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: [USER_ROLES.RCM_SPECIALIST, USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR, USER_ROLES.CLIENT_USER, USER_ROLES.AUDITOR],
  },
  {
    title: "My Worklist",
    url: "/worklist",
    icon: ClipboardList,
    roles: [USER_ROLES.RCM_SPECIALIST],
  },
  {
    title: "Team Management",
    url: "/team",
    icon: Users,
    roles: [USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    roles: [USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR, USER_ROLES.CLIENT_USER, USER_ROLES.AUDITOR],
  },
  {
    title: "Claims",
    url: "/claims",
    icon: FileText,
    roles: [USER_ROLES.RCM_SPECIALIST, USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR, USER_ROLES.AUDITOR],
  },
  {
    title: "Denials",
    url: "/denials",
    icon: AlertCircle,
    roles: [USER_ROLES.RCM_SPECIALIST, USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    title: "Accounts Receivable",
    url: "/task-management",
    icon: Upload,
    roles: [USER_ROLES.RCM_SPECIALIST, USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    title: "Productivity",
    url: "/productivity",
    icon: TrendingUp,
    roles: [USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    title: "User Management",
    url: "/team-management",
    icon: UserCog,
    roles: [USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: [USER_ROLES.SYSTEM_ADMINISTRATOR],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const currentRole = (user?.role || USER_ROLES.RCM_SPECIALIST) as string;

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(currentRole as any)
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
      [USER_ROLES.RCM_SPECIALIST]: "RCM Specialist",
      [USER_ROLES.MANAGER]: "Manager",
      [USER_ROLES.SYSTEM_ADMINISTRATOR]: "System Administrator",
      [USER_ROLES.CLIENT_USER]: "Client User",
      [USER_ROLES.AUDITOR]: "Auditor",
    };
    return roleMap[role] || role;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-semibold">ClaimFlowPro</h2>
            <p className="text-xs text-muted-foreground">AR Management</p>
          </div>
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
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Avatar>
            {user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={user.fullName || user.email || 'User'} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
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
          size={state === "collapsed" ? "icon" : "sm"}
          className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:min-w-0"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
