import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
}

export function TenantSwitcher() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['/api/user/tenants'],
  });

  const { data: userWithTenant } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest('POST', '/api/user/switch-tenant', { tenantId });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Tenant Switched",
        description: `Now viewing ${data.activeTenantName}`,
      });
      
      // Invalidate all queries to refresh data for the new tenant
      queryClient.invalidateQueries();
      
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Switch Failed",
        description: error.message || "Failed to switch tenant",
        variant: "destructive",
      });
    },
  });

  const currentTenantId = userWithTenant?.activeTenantId || user?.tenantId;
  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          data-testid="button-tenant-switcher"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentTenant?.name || "Select client..."}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  onSelect={() => {
                    if (tenant.id !== currentTenantId) {
                      switchTenantMutation.mutate(tenant.id);
                    } else {
                      setOpen(false);
                    }
                  }}
                  data-testid={`tenant-option-${tenant.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentTenantId === tenant.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tenant.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
