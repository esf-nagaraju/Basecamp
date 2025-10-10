import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MoreVertical, Shield, Users, Lock, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  profileImageUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  rcm_specialist: 'RCM Specialist',
  manager: 'Manager',
  system_administrator: 'System Administrator',
  client_user: 'Client User',
  auditor: 'Auditor',
};

const ROLE_COLORS: Record<string, string> = {
  rcm_specialist: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  system_administrator: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  client_user: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  auditor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const addUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  role: z.enum(['rcm_specialist', 'manager', 'system_administrator', 'client_user', 'auditor']),
  employeeId: z.string().optional(),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

export default function TeamManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'rcm_specialist',
      employeeId: '',
    },
  });

  // Check if user is System Administrator or Manager
  if (currentUser && currentUser.role !== 'system_administrator' && currentUser.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only System Administrators and Managers can access User Management
          </p>
        </div>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('PATCH', `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: AddUserFormData) => {
      return apiRequest('POST', '/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User added",
        description: "New user has been added successfully",
      });
      setIsAddUserDialogOpen(false);
      addUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    },
  });

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = () => {
    if (editingUser && selectedRole) {
      updateRoleMutation.mutate({ userId: editingUser.id, role: selectedRole });
    }
  };

  const handleAddUser = (data: AddUserFormData) => {
    addUserMutation.mutate(data);
  };

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    // Default to manager permissions if user role is not yet loaded or is manager
    if (!currentUser || currentUser.role === 'manager') {
      // Managers can only create non-elevated roles
      return [
        { value: 'rcm_specialist', label: 'RCM Specialist' },
        { value: 'client_user', label: 'Client User' },
        { value: 'auditor', label: 'Auditor' },
      ];
    }
    
    // System administrators can create any role
    if (currentUser.role === 'system_administrator') {
      return [
        { value: 'rcm_specialist', label: 'RCM Specialist' },
        { value: 'manager', label: 'Manager' },
        { value: 'system_administrator', label: 'System Administrator' },
        { value: 'client_user', label: 'Client User' },
        { value: 'auditor', label: 'Auditor' },
      ];
    }
    
    // For any other role, default to manager permissions (safety fallback)
    return [
      { value: 'rcm_specialist', label: 'RCM Specialist' },
      { value: 'client_user', label: 'Client User' },
      { value: 'auditor', label: 'Auditor' },
    ];
  };

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.fullName) {
      const parts = user.fullName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.fullName[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const adminUsers = users.filter(u => u.role === 'system_administrator' || u.role === 'manager');
  const otherUsers = users.filter(u => u.role !== 'system_administrator' && u.role !== 'manager');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-team-management-title">
            <Users className="h-8 w-8" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their account permissions here
          </p>
        </div>
        <Button 
          onClick={() => setIsAddUserDialogOpen(true)}
          data-testid="button-add-user"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Admin Users Section */}
      <Card data-testid="card-admin-users">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <CardTitle>Admin users</CardTitle>
          </div>
          <CardDescription>
            Admins can add and remove users and manage organization-level settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Date added</div>
              <div className="col-span-2">Last active</div>
              <div className="col-span-1"></div>
            </div>
            {adminUsers.map((user) => (
              <div 
                key={user.id} 
                className="grid grid-cols-12 gap-4 items-center py-2 hover-elevate rounded-md -mx-2 px-2"
                data-testid={`row-user-${user.id}`}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium" data-testid={`text-username-${user.id}`}>
                      {user.fullName || user.email}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <Badge 
                    variant="outline" 
                    className={ROLE_COLORS[user.role]}
                    data-testid={`badge-role-${user.id}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground" data-testid={`text-date-added-${user.id}`}>
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground" data-testid={`text-last-active-${user.id}`}>
                  {format(new Date(user.updatedAt), 'MMM d, yyyy')}
                </div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-menu-${user.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleEditRole(user)}
                        data-testid={`button-edit-role-${user.id}`}
                      >
                        Edit role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other Users Section */}
      <Card data-testid="card-other-users">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <CardTitle>Team members</CardTitle>
          </div>
          <CardDescription>
            Team members can access claims, tasks, and productivity features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Date added</div>
              <div className="col-span-2">Last active</div>
              <div className="col-span-1"></div>
            </div>
            {otherUsers.map((user) => (
              <div 
                key={user.id} 
                className="grid grid-cols-12 gap-4 items-center py-2 hover-elevate rounded-md -mx-2 px-2"
                data-testid={`row-user-${user.id}`}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium" data-testid={`text-username-${user.id}`}>
                      {user.fullName || user.email}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <Badge 
                    variant="outline" 
                    className={ROLE_COLORS[user.role]}
                    data-testid={`badge-role-${user.id}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground" data-testid={`text-date-added-${user.id}`}>
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground" data-testid={`text-last-active-${user.id}`}>
                  {format(new Date(user.updatedAt), 'MMM d, yyyy')}
                </div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-menu-${user.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleEditRole(user)}
                        data-testid={`button-edit-role-${user.id}`}
                      >
                        Edit role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>Edit user role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.fullName || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role" data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rcm_specialist" data-testid="option-rcm-specialist">
                    RCM Specialist
                  </SelectItem>
                  <SelectItem value="manager" data-testid="option-manager">
                    Manager
                  </SelectItem>
                  <SelectItem value="system_administrator" data-testid="option-system-administrator">
                    System Administrator
                  </SelectItem>
                  <SelectItem value="client_user" data-testid="option-client-user">
                    Client User
                  </SelectItem>
                  <SelectItem value="auditor" data-testid="option-auditor">
                    Auditor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingUser(null)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRole} 
              disabled={updateRoleMutation.isPending}
              data-testid="button-save-role"
            >
              {updateRoleMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => {
        setIsAddUserDialogOpen(open);
        if (!open) addUserForm.reset();
      }}>
        <DialogContent data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle>Add new user</DialogTitle>
            <DialogDescription>
              Create a new user account for your organization
            </DialogDescription>
          </DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="John" 
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Doe" 
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="john.doe@example.com" 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableRoles().map((role) => (
                          <SelectItem 
                            key={role.value} 
                            value={role.value}
                            data-testid={`option-new-${role.value.replace('_', '-')}`}
                          >
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="EMP-12345" 
                        data-testid="input-employee-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setIsAddUserDialogOpen(false);
                    addUserForm.reset();
                  }}
                  data-testid="button-cancel-add-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addUserMutation.isPending}
                  data-testid="button-save-add-user"
                >
                  {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
