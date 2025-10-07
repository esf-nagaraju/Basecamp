import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskWithDetails {
  id: string;
  claimId: string;
  claimNumber: string;
  priority: string;
  status: string;
  progressPercent: number;
  client: string;
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
}

interface TaskMetadata {
  resolutionCategories: string[];
  rootCauseCategories: string[];
  rootCauseDetails: string[];
  resolutionActions: string[];
}

export default function TaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [localTaskChanges, setLocalTaskChanges] = useState<Partial<TaskWithDetails>>({});
  const [timerStartedInModal, setTimerStartedInModal] = useState(false);
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
    queryKey: ['/api/tasks', searchTerm, selectedClient, selectedStatuses, pageSize, currentPage * pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedClient && selectedClient !== 'all') params.append('client', selectedClient);
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach(status => params.append('status', status));
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
                        'rootCauseCategory', 'rootCauseDetail', 'resolutionAction', 'notes'];
    const claimFields = ['actionCategory', 'billingProvider', 'dateClaimSent', 'errorFile', 
                         'financialClass', 'fixedDenial', 'fixedRemarkCode', 'followUpDays', 
                         'grossAmount', 'location', 'maxCreateDate', 'nrcContract', 'payment', 
                         'payorId', 'payorType', 'pfx', 'renderingProvider', 'servicingLocation', 
                         'sfx', 'writeOffs', 'allowedAmount'];
    
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
          <h1 className="text-3xl font-bold">All Tasks</h1>
          <p className="text-muted-foreground">View and assign all claim processing tasks</p>
        </div>
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
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Number</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Invoice Age</TableHead>
                  <TableHead>Invoice Age Bucket</TableHead>
                  <TableHead>Date of Service</TableHead>
                  <TableHead>DOS Age Bucket</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progressPercent || 0} className="w-24" />
                        <span className="text-sm text-muted-foreground">{task.progressPercent || 0}%</span>
                      </div>
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
                    <TableCell data-testid={`text-invoice-age-${task.id}`}>
                      {task.invoiceAge !== null ? task.invoiceAge : '-'}
                    </TableCell>
                    <TableCell data-testid={`text-invoice-age-bucket-${task.id}`}>
                      {task.invoiceAgeBucket || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-date-of-service-${task.id}`}>
                      {task.dateOfService || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-dos-age-bucket-${task.id}`}>
                      {task.dosAgeBucket || '-'}
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
                  <label className="text-sm font-medium">Client</label>
                  <div className="text-lg">{currentTaskData.client}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={currentTaskData.priority || ''}
                    onValueChange={(value) => {
                      setLocalTaskChanges(prev => ({ ...prev, priority: value }));
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
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

              <div>
                <label className="text-sm font-medium">Progress</label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[currentTaskData.progressPercent || 0]}
                      onValueChange={(value) => {
                        setLocalTaskChanges(prev => ({ ...prev, progressPercent: value[0] }));
                      }}
                      max={100}
                      step={5}
                      className="flex-1"
                      data-testid="slider-progress"
                    />
                    <Input
                      type="number"
                      value={currentTaskData.progressPercent || 0}
                      onChange={(e) => {
                        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setLocalTaskChanges(prev => ({ ...prev, progressPercent: value }));
                      }}
                      min={0}
                      max={100}
                      className="w-20"
                      data-testid="input-progress"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
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

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Claim Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Accurio Action/Status</label>
                    <Input
                      value={currentTaskData.accurioActionStatus || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, accurioActionStatus: e.target.value }))}
                      placeholder="Enter status"
                      className="mt-1"
                      data-testid="input-accurio-action-status"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Action Category</label>
                    <Input
                      value={currentTaskData.actionCategory || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, actionCategory: e.target.value }))}
                      placeholder="Enter action category"
                      className="mt-1"
                      data-testid="input-action-category"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date of Service</label>
                    <Input
                      type="date"
                      value={currentTaskData.dateOfService || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, dateOfService: e.target.value }))}
                      className="mt-1"
                      data-testid="input-date-of-service"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date Claim Sent</label>
                    <Input
                      type="date"
                      value={currentTaskData.dateClaimSent || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, dateClaimSent: e.target.value }))}
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, followUpDays: parseInt(e.target.value) || 0 }))}
                      placeholder="Enter follow up days"
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, billingProvider: e.target.value }))}
                      placeholder="Enter billing provider"
                      className="mt-1"
                      data-testid="input-billing-provider"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Rendering Provider</label>
                    <Input
                      value={currentTaskData.renderingProvider || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, renderingProvider: e.target.value }))}
                      placeholder="Enter rendering provider"
                      className="mt-1"
                      data-testid="input-rendering-provider"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={currentTaskData.location || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter location"
                      className="mt-1"
                      data-testid="input-location"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Servicing Location</label>
                    <Input
                      value={currentTaskData.servicingLocation || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, servicingLocation: e.target.value }))}
                      placeholder="Enter servicing location"
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, payorId: e.target.value }))}
                      placeholder="Enter payor ID"
                      className="mt-1"
                      data-testid="input-payor-id"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payor Type</label>
                    <Input
                      value={currentTaskData.payorType || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, payorType: e.target.value }))}
                      placeholder="Enter payor type"
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, allowedAmount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                      data-testid="input-allowed-amount"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Gross Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.grossAmount || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, grossAmount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                      data-testid="input-gross-amount"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTaskData.payment || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, payment: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, writeOffs: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
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
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, financialClass: e.target.value }))}
                      placeholder="Enter financial class"
                      className="mt-1"
                      data-testid="input-financial-class"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">NRC Contract</label>
                    <Input
                      value={currentTaskData.nrcContract || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, nrcContract: e.target.value }))}
                      placeholder="Enter NRC contract"
                      className="mt-1"
                      data-testid="input-nrc-contract"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Pfx</label>
                    <Input
                      value={currentTaskData.pfx || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, pfx: e.target.value }))}
                      placeholder="Enter prefix"
                      className="mt-1"
                      data-testid="input-pfx"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sfx</label>
                    <Input
                      value={currentTaskData.sfx || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, sfx: e.target.value }))}
                      placeholder="Enter suffix"
                      className="mt-1"
                      data-testid="input-sfx"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Error File</label>
                    <Input
                      value={currentTaskData.errorFile || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, errorFile: e.target.value }))}
                      placeholder="Enter error file"
                      className="mt-1"
                      data-testid="input-error-file"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Max Create Date</label>
                    <Input
                      type="date"
                      value={currentTaskData.maxCreateDate || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, maxCreateDate: e.target.value }))}
                      className="mt-1"
                      data-testid="input-max-create-date"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fixed Denial</label>
                    <Input
                      value={currentTaskData.fixedDenial || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, fixedDenial: e.target.value }))}
                      placeholder="Enter fixed denial"
                      className="mt-1"
                      data-testid="input-fixed-denial"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fixed Remark Code</label>
                    <Input
                      value={currentTaskData.fixedRemarkCode || ''}
                      onChange={(e) => setLocalTaskChanges(prev => ({ ...prev, fixedRemarkCode: e.target.value }))}
                      placeholder="Enter fixed remark code"
                      className="mt-1"
                      data-testid="input-fixed-remark-code"
                    />
                  </div>
                </div>
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
    </div>
  );
}
