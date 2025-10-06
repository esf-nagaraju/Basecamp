import { useState, useEffect } from "react";
import { Search, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskWithDetails {
  id: string;
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
  const { toast } = useToast();

  const pageSize = 50;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setLocalTaskChanges({});
    }
  }, [isModalOpen, selectedTask?.id]);

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
    refetchInterval: isModalOpen ? false : 1000,
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

  const tasks = tasksData?.tasks || [];
  const totalCount = tasksData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const uniqueClients = Array.from(new Set(tasks.map(t => t.client)))
    .filter(client => client && client.trim() !== '')
    .sort();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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

  const handleSaveTask = () => {
    if (!taskDetail) return;
    
    updateTaskMutation.mutate(localTaskChanges);
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
                  <div className="mt-1">
                    <Badge variant={getPriorityBadgeVariant(currentTaskData.priority)}>
                      {currentTaskData.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(currentTaskData.status)}>
                      {currentTaskData.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Time Tracking</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{getActiveTime(currentTaskData)}</span>
                    {currentTaskData.activeTimerStartedAt ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => stopTimerMutation.mutate(currentTaskData.id)}
                        data-testid="button-stop-timer"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startTimerMutation.mutate(currentTaskData.id)}
                        data-testid="button-start-timer"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
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
    </div>
  );
}
