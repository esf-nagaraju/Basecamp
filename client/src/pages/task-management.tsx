import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, X, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TaskWithDetails {
  id: string;
  claimId: string;
  claimNumber: string;
  priority: string;
  status: string;
  progressPercent: number;
  client: string;
  assignedTo: string | null;
  assignedToName: string | null;
  totalTimeSeconds: number;
  activeTimerStartedAt: string | null;
  resolutionCategory: string | null;
  rootCauseCategory: string | null;
  rootCauseDetail: string | null;
  resolutionAction: string | null;
  notes: string | null;
  invoiceDate: string | null;
  invoiceAge: number | null;
  invoiceAgeBucket: string | null;
  dateOfService: string | null;
  dosAgeBucket: string | null;
  accurioActionStatus: string | null;
  actionCategory: string | null;
  allowedAmount: string | null;
  billingProvider: string | null;
  dateClaimSent: string | null;
  errorFile: string | null;
  financialClass: string | null;
  fixedDenial: string | null;
  fixedRemarkCode: string | null;
  followUpDays: number | null;
  grossAmount: string | null;
  location: string | null;
  maxCreateDate: string | null;
  nrcContract: string | null;
  payment: string | null;
  payorId: string | null;
  payorType: string | null;
  pfx: string | null;
  renderingProvider: string | null;
  servicingLocation: string | null;
  sfx: string | null;
  totalBalance: string | null;
  writeOffs: string | null;
  lineOfBusiness: string | null;
  criteria: string | null;
  team: string | null;
}

interface TaskMetadata {
  resolutionCategories: string[];
  rootCauseCategories: string[];
  rootCauseDetails: string[];
  resolutionActions: string[];
}

const LINES_OF_BUSINESS = [
  "External",
  "INR/Medicaid (Offshore)",
  "INR/Medicaid/Medicaid Managed Care (Offshore)",
  "INR/Medicaid (Onshore)",
  "Commercial (Offshore)",
  "Commercial (Offshore) Permission Granted",
  "Commercial (Onshore)",
  "Federal, Misc (Onshore)",
  "Medicare (Onshore)",
  "Medicare Advantage (Onshore)",
  "Credit Balance/Audit (Onshore)"
];

const CRITERIA_OPTIONS = [
  "CPR+",
  "Silent Payors, 34 States",
  "Credit Balance (Medicaid/INR all states)",
  "Permission Needed/No Payors, 14 States",
  "Silent Payors",
  "Permission Needed, Yes, Granted Yes",
  "Credit Balance (Medicare, Tricare, Patient)",
  "Permission Needed/No Payors",
  "Note: Triwest allows offshore",
  "Lincare/TP Manila",
  "Medicare",
  "Commercial"
];

const TEAMS = [
  "Acuserve",
  "Accurio",
  "Lincare",
  "TP India",
  "TP Manila"
];

export default function TaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLineOfBusiness, setSelectedLineOfBusiness] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [localTaskChanges, setLocalTaskChanges] = useState<Partial<TaskWithDetails>>({});
  const [timerStartedInModal, setTimerStartedInModal] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const { toast } = useToast();

  const pageSize = 50;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLocalTaskChanges({});
  }, [isModalOpen, selectedTask?.id]);

  useEffect(() => {
    if (isModalOpen && selectedTask?.id) {
      startTimerMutation.mutate(selectedTask.id);
      setTimerStartedInModal(true);
    } else if (!isModalOpen && timerStartedInModal && selectedTask?.id) {
      stopTimerMutation.mutate(selectedTask.id);
      setTimerStartedInModal(false);
    }
  }, [isModalOpen]);

  const { data: tasksData } = useQuery<{ tasks: TaskWithDetails[], totalCount: number }>({
    queryKey: ['/api/tasks', searchTerm, selectedClient, selectedStatuses, selectedLineOfBusiness, selectedCriteria, selectedTeam, pageSize, currentPage * pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedClient && selectedClient !== 'all') params.append('client', selectedClient);
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach(status => params.append('status', status));
      }
      if (selectedLineOfBusiness.length > 0) {
        selectedLineOfBusiness.forEach(lob => params.append('lineOfBusiness', lob));
      }
      if (selectedCriteria.length > 0) {
        selectedCriteria.forEach(criteria => params.append('criteria', criteria));
      }
      if (selectedTeam.length > 0) {
        selectedTeam.forEach(team => params.append('team', team));
      }
      params.append('limit', pageSize.toString());
      params.append('offset', (currentPage * pageSize).toString());

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    refetchInterval: 5000,
  });

  const { data: metadata } = useQuery<TaskMetadata>({
    queryKey: ['/api/task-metadata'],
  });

  const { data: usersData } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: taskDetail, refetch: refetchTaskDetail } = useQuery<TaskWithDetails>({
    queryKey: ['/api/tasks', selectedTask?.id],
    enabled: !!selectedTask?.id,
    refetchInterval: 1000,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<TaskWithDetails>) => {
      return apiRequest('PATCH', `/api/tasks/${selectedTask?.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      refetchTaskDetail();
      setLocalTaskChanges({});
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('POST', `/api/tasks/${taskId}/timer/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      refetchTaskDetail();
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('POST', `/api/tasks/${taskId}/timer/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      refetchTaskDetail();
    },
  });

  const updateClaimMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!currentTaskData?.claimId) throw new Error('No claim ID');
      return apiRequest('PATCH', `/api/claims/${currentTaskData.claimId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      refetchTaskDetail();
      toast({
        title: "Success",
        description: "Claim updated successfully",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/claims/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Success",
        description: `Successfully imported ${data.imported} claims and created ${data.tasksCreated} tasks`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ taskIds, assignedTo }: { taskIds: string[], assignedTo: string | null }) => {
      return apiRequest('PATCH', '/api/tasks/bulk-assign', { taskIds, assignedTo });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setSelectedTaskIds(new Set());
      setIsBulkAssignDialogOpen(false);
      setBulkAssignUserId("");
      toast({
        title: "Success",
        description: `${data.count} task(s) assigned successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    const validTypes = ['text/csv', 'text/plain'];
    const validExtensions = ['.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return 'Invalid file type. Please upload a CSV file only.';
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      return 'File size too large. Maximum size is 100MB.';
    }
    
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    }
  };

  const tasks = tasksData?.tasks || [];
  const totalCount = tasksData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const uniqueClients = Array.from(new Set(tasks.map(t => t.client)))
    .filter(client => client && client.trim() !== '')
    .sort();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getActiveTime = (task: TaskWithDetails) => {
    let total = task.totalTimeSeconds || 0;
    if (task.activeTimerStartedAt) {
      const elapsed = Math.floor((currentTime - new Date(task.activeTimerStartedAt).getTime()) / 1000);
      total += elapsed;
    }
    return formatTime(total);
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'in progress': return 'default';
      case 'escalated': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const handleSaveTask = async () => {
    if (!taskDetail) return;
    
    if (Object.keys(localTaskChanges).length === 0) {
      toast({
        title: "No changes",
        description: "No changes to save",
      });
      return;
    }
    
    const taskFields = ['priority', 'status', 'progressPercent', 'resolutionCategory', 
                        'rootCauseCategory', 'rootCauseDetail', 'resolutionAction', 'notes', 'assignedTo'];
    const claimFields = ['actionCategory', 'billingProvider', 'dateClaimSent', 'errorFile', 
                         'financialClass', 'fixedDenial', 'fixedRemarkCode', 'followUpDays', 
                         'grossAmount', 'location', 'maxCreateDate', 'nrcContract', 'payment', 
                         'payorId', 'payorType', 'pfx', 'renderingProvider', 'servicingLocation', 
                         'sfx', 'writeOffs', 'allowedAmount', 'lineOfBusiness', 'criteria', 'team'];
    
    const taskUpdates: any = {};
    const claimUpdates: any = {};
    
    for (const [key, value] of Object.entries(localTaskChanges)) {
      if (taskFields.includes(key)) {
        taskUpdates[key] = value;
      } else if (claimFields.includes(key)) {
        claimUpdates[key] = value;
      }
    }
    
    if (Object.keys(taskUpdates).length > 0) {
      updateTaskMutation.mutate(taskUpdates);
    }
    
    if (Object.keys(claimUpdates).length > 0) {
      updateClaimMutation.mutate(claimUpdates);
    }
    
    setLocalTaskChanges({});
  };

  const currentTaskData = taskDetail ? { ...taskDetail, ...localTaskChanges } : null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AR Tasks</h1>
          <p className="text-muted-foreground">View and assign all claim processing tasks</p>
        </div>
        <Button 
          onClick={() => setIsUploadDialogOpen(true)}
          data-testid="button-upload-claims"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Claims
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by claim number or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-64" data-testid="select-client">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'all'}
                onValueChange={(value) => setSelectedStatuses(value === 'all' ? [] : value.split(','))}
              >
                <SelectTrigger className="w-48" data-testid="select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Work Group Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Line of Business</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      data-testid="select-line-of-business"
                    >
                      <span className="truncate">
                        {selectedLineOfBusiness.length === 0
                          ? "All Lines of Business"
                          : selectedLineOfBusiness.length === 1
                          ? selectedLineOfBusiness[0]
                          : `${selectedLineOfBusiness.length} selected`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {LINES_OF_BUSINESS.map((lob) => (
                          <CommandItem
                            key={lob}
                            onSelect={() => {
                              setSelectedLineOfBusiness((prev) =>
                                prev.includes(lob)
                                  ? prev.filter((item) => item !== lob)
                                  : [...prev, lob]
                              );
                            }}
                          >
                            <Checkbox
                              checked={selectedLineOfBusiness.includes(lob)}
                              className="mr-2"
                            />
                            {lob}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Criteria</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      data-testid="select-criteria"
                    >
                      <span className="truncate">
                        {selectedCriteria.length === 0
                          ? "All Criteria"
                          : selectedCriteria.length === 1
                          ? selectedCriteria[0]
                          : `${selectedCriteria.length} selected`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {CRITERIA_OPTIONS.map((criteria) => (
                          <CommandItem
                            key={criteria}
                            onSelect={() => {
                              setSelectedCriteria((prev) =>
                                prev.includes(criteria)
                                  ? prev.filter((item) => item !== criteria)
                                  : [...prev, criteria]
                              );
                            }}
                          >
                            <Checkbox
                              checked={selectedCriteria.includes(criteria)}
                              className="mr-2"
                            />
                            {criteria}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Team</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      data-testid="select-team"
                    >
                      <span className="truncate">
                        {selectedTeam.length === 0
                          ? "All Teams"
                          : selectedTeam.length === 1
                          ? selectedTeam[0]
                          : `${selectedTeam.length} selected`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {TEAMS.map((team) => (
                          <CommandItem
                            key={team}
                            onSelect={() => {
                              setSelectedTeam((prev) =>
                                prev.includes(team)
                                  ? prev.filter((item) => item !== team)
                                  : [...prev, team]
                              );
                            }}
                          >
                            <Checkbox
                              checked={selectedTeam.includes(team)}
                              className="mr-2"
                            />
                            {team}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTaskIds.size > 0 && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedTaskIds.size} task(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTaskIds(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsBulkAssignDialogOpen(true)}
                  data-testid="button-bulk-assign"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Bulk Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={tasks.length > 0 && tasks.every(t => selectedTaskIds.has(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds(new Set(tasks.map(t => t.id)));
                        } else {
                          setSelectedTaskIds(new Set());
                        }
                      }}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Claim Number</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payor</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Date of Service</TableHead>
                  <TableHead>Resolution Category</TableHead>
                  <TableHead>Root Cause Category</TableHead>
                  <TableHead>Root Cause Detail</TableHead>
                  <TableHead>Resolution/Action Taken</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTaskIds.has(task.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedTaskIds);
                          if (checked) {
                            newSelected.add(task.id);
                          } else {
                            newSelected.delete(task.id);
                          }
                          setSelectedTaskIds(newSelected);
                        }}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{task.claimNumber}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(task.priority)} data-testid={`badge-priority-${task.id}`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)} data-testid={`badge-status-${task.id}`}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.client}</TableCell>
                    <TableCell>
                      {task.assignedToName ? (
                        <span>{task.assignedToName}</span>
                      ) : (
                        <span className="text-muted-foreground">Assign...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getActiveTime(task)}</span>
                        {task.activeTimerStartedAt && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-invoice-date-${task.id}`}>
                      {task.invoiceDate || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-date-of-service-${task.id}`}>
                      {task.dateOfService || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-resolution-category-${task.id}`}>
                      {task.resolutionCategory || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-root-cause-category-${task.id}`}>
                      {task.rootCauseCategory || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-root-cause-detail-${task.id}`}>
                      {task.rootCauseDetail || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-resolution-action-${task.id}`}>
                      {task.resolutionAction || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsModalOpen(true);
                        }}
                        data-testid={`button-view-${task.id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {tasks.length} of {totalCount.toLocaleString()} tasks
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1 || totalPages === 0}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Accurio Workflow</DialogTitle>
            <DialogDescription>
              Manage task details, track time, and document resolution information
            </DialogDescription>
          </DialogHeader>
          
          {currentTaskData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Claim Number</label>
                  <div className="text-lg font-semibold">{currentTaskData.claimNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Payor</label>
                  <div className="text-lg">{currentTaskData.client}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <Select
                    value={currentTaskData.assignedTo || 'unassigned'}
                    onValueChange={(value) => {
                      setLocalTaskChanges(prev => ({ ...prev, assignedTo: value === 'unassigned' ? null : value }));
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-assigned-to">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(usersData || []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Score</label>
                  <Select
                    value={currentTaskData.priority || ''}
                    onValueChange={(value) => {
                      setLocalTaskChanges(prev => ({ ...prev, priority: value }));
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-priority">
                      <SelectValue placeholder="Select risk score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={currentTaskData.status || ''}
                    onValueChange={(value) => {
                      setLocalTaskChanges(prev => ({ ...prev, status: value }));
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Time Tracking</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold" data-testid="text-time-tracking">{getActiveTime(currentTaskData)}</span>
                    {currentTaskData.activeTimerStartedAt && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" data-testid="indicator-timer-active" />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Claim Details</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium">Line of Business</label>
                    <Select
                      value={currentTaskData.lineOfBusiness || 'NONE'}
                      disabled
                    >
                      <SelectTrigger className="mt-1 bg-muted" data-testid="select-claim-line-of-business">
                        <SelectValue placeholder="Select Line of Business" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {LINES_OF_BUSINESS.map(lob => (
                          <SelectItem key={lob} value={lob}>{lob}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Criteria</label>
                    <Select
                      value={currentTaskData.criteria || 'NONE'}
                      disabled
                    >
                      <SelectTrigger className="mt-1 bg-muted" data-testid="select-claim-criteria">
                        <SelectValue placeholder="Select Criteria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {CRITERIA_OPTIONS.map(criteria => (
                          <SelectItem key={criteria} value={criteria}>{criteria}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Team</label>
                    <Select
                      value={currentTaskData.team || 'NONE'}
                      disabled
                    >
                      <SelectTrigger className="mt-1 bg-muted" data-testid="select-claim-team">
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {TEAMS.map(team => (
                          <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Action/Status</label>
                    <Input
                      value={currentTaskData.accurioActionStatus || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-accurio-action-status"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Action Category</label>
                    <Input
                      value={currentTaskData.actionCategory || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-action-category"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date of Service</label>
                    <Input
                      type="date"
                      value={currentTaskData.dateOfService || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-date-of-service"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date Claim Sent</label>
                    <Input
                      type="date"
                      value={currentTaskData.dateClaimSent || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-date-claim-sent"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Invoice Age Bucket</label>
                    <Input
                      value={currentTaskData.invoiceAgeBucket || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-invoice-age-bucket"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Follow Up Days</label>
                    <Input
                      type="number"
                      value={currentTaskData.followUpDays?.toString() || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-follow-up-days"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Provider Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Billing Provider</label>
                    <Input
                      value={currentTaskData.billingProvider || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-billing-provider"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Rendering Provider</label>
                    <Input
                      value={currentTaskData.renderingProvider || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-rendering-provider"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={currentTaskData.location || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-location"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Servicing Location</label>
                    <Input
                      value={currentTaskData.servicingLocation || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-servicing-location"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Payor Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Payor ID</label>
                    <Input
                      value={currentTaskData.payorId || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-payor-id"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payor Type</label>
                    <Input
                      value={currentTaskData.payorType || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-payor-type"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Financial Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Allowed Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.allowedAmount || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-allowed-amount"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Gross Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.grossAmount || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-gross-amount"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.payment || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-payment"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Total Balance</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.totalBalance || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-total-balance"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Write-Offs</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.writeOffs || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-write-offs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Additional Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Financial Class</label>
                    <Input
                      value={currentTaskData.financialClass || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-financial-class"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">NRC Contract</label>
                    <Input
                      value={currentTaskData.nrcContract || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-nrc-contract"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Pfx</label>
                    <Input
                      value={currentTaskData.pfx || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-pfx"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sfx</label>
                    <Input
                      value={currentTaskData.sfx || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-sfx"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Error File</label>
                    <Input
                      value={currentTaskData.errorFile || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-error-file"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Max Create Date</label>
                    <Input
                      type="date"
                      value={currentTaskData.maxCreateDate || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-max-create-date"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fixed Denial</label>
                    <Input
                      value={currentTaskData.fixedDenial || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-fixed-denial"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fixed Remark Code</label>
                    <Input
                      value={currentTaskData.fixedRemarkCode || ''}
                      disabled
                      className="mt-1 bg-muted"
                      data-testid="input-fixed-remark-code"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Resolution Category</label>
                <Select
                  value={currentTaskData.resolutionCategory || ''}
                  onValueChange={(value) => {
                    setLocalTaskChanges(prev => ({ ...prev, resolutionCategory: value }));
                  }}
                >
                  <SelectTrigger className="mt-1" data-testid="select-resolution-category">
                    <SelectValue placeholder="Select resolution category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(metadata?.resolutionCategories || [])
                      .filter(cat => cat && cat.trim() !== '')
                      .map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Root Cause Category</label>
                <Select
                  value={currentTaskData.rootCauseCategory || ''}
                  onValueChange={(value) => {
                    setLocalTaskChanges(prev => ({ ...prev, rootCauseCategory: value }));
                  }}
                >
                  <SelectTrigger className="mt-1" data-testid="select-root-cause-category">
                    <SelectValue placeholder="Select root cause category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(metadata?.rootCauseCategories || [])
                      .filter(cat => cat && cat.trim() !== '')
                      .map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Root Cause Detail</label>
                <Select
                  value={currentTaskData.rootCauseDetail || ''}
                  onValueChange={(value) => {
                    setLocalTaskChanges(prev => ({ ...prev, rootCauseDetail: value }));
                  }}
                >
                  <SelectTrigger className="mt-1" data-testid="select-root-cause-detail">
                    <SelectValue placeholder="Select root cause detail" />
                  </SelectTrigger>
                  <SelectContent>
                    {(metadata?.rootCauseDetails || [])
                      .filter(detail => detail && detail.trim() !== '')
                      .map(detail => (
                        <SelectItem key={detail} value={detail}>{detail}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Resolution/Action Taken</label>
                <Select
                  value={currentTaskData.resolutionAction || ''}
                  onValueChange={(value) => {
                    setLocalTaskChanges(prev => ({ ...prev, resolutionAction: value }));
                  }}
                >
                  <SelectTrigger className="mt-1" data-testid="select-resolution-action">
                    <SelectValue placeholder="Select resolution action" />
                  </SelectTrigger>
                  <SelectContent>
                    {(metadata?.resolutionActions || [])
                      .filter(action => action && action.trim() !== '')
                      .map(action => (
                        <SelectItem key={action} value={action}>{action}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={currentTaskData.notes || ''}
                  onChange={(e) => {
                    setLocalTaskChanges(prev => ({ ...prev, notes: e.target.value }));
                  }}
                  placeholder="Add notes about this task..."
                  className="mt-1 min-h-24"
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" data-testid="button-escalate">
                  Escalate
                </Button>
                <Button 
                  onClick={handleSaveTask}
                  disabled={updateTaskMutation.isPending}
                  data-testid="button-save"
                >
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Claims Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing claim line details to create new tasks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              data-testid="dropzone-upload"
            >
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports CSV files only (max 100MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild data-testid="button-browse-file">
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">CSV File Requirements:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Must include: Invoice Number (or "Claim Number"), Customer Name (or "Client"), Invoice Date, Balance (or "Balance Due"), Payor Name</li>
                <li>Optional: Date of Service, Invoice Age, Payor Code, Denial Codes, Invoice Age Bucket, DOS Age Bucket, etc.</li>
                <li>First row must contain column headers</li>
                <li>File must be in CSV format (not Excel)</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadFileMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadFileMutation.isPending ? 'Uploading...' : 'Upload & Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Tasks</DialogTitle>
            <DialogDescription>
              Assign {selectedTaskIds.size} selected task(s) to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Assign To</label>
              <Select
                value={bulkAssignUserId}
                onValueChange={setBulkAssignUserId}
              >
                <SelectTrigger data-testid="select-bulk-assign-user">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(usersData || []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkAssignDialogOpen(false);
                  setBulkAssignUserId("");
                }}
                data-testid="button-cancel-bulk-assign"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  bulkAssignMutation.mutate({
                    taskIds: Array.from(selectedTaskIds),
                    assignedTo: bulkAssignUserId === 'unassigned' ? null : bulkAssignUserId
                  });
                }}
                disabled={!bulkAssignUserId || bulkAssignMutation.isPending}
                data-testid="button-confirm-bulk-assign"
              >
                {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign Tasks'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
