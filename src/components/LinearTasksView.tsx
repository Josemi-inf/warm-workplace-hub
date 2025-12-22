import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { TaskWithAssignees, SubtaskWithAssignees, SafeUser } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Circle,
  Clock,
  Plus,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskWithSubtasks extends TaskWithAssignees {
  subtasksList?: SubtaskWithAssignees[];
}

interface LinearTasksViewProps {
  projectId?: string | null;
  serviceId?: string | null;
  onTaskSelect?: (taskId: string) => void;
  onCreateTask?: () => void;
}

const PRIORITY_CONFIG = {
  urgent: { label: "Urgente", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  high: { label: "Alta", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  medium: { label: "Media", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  low: { label: "Baja", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
};

const STATUS_CONFIG = {
  pending: { label: "Pendiente", icon: Circle, color: "text-slate-400" },
  in_progress: { label: "En progreso", icon: Clock, color: "text-indigo-600" },
  completed: { label: "Completada", icon: Check, color: "text-green-600" },
  cancelled: { label: "Cancelada", icon: AlertCircle, color: "text-red-400" },
};

function TaskRow({
  task,
  onSelect,
  onStartSubtask,
  onCompleteSubtask,
}: {
  task: TaskWithSubtasks;
  onSelect: () => void;
  onStartSubtask: (subtaskId: string) => void;
  onCompleteSubtask: (subtaskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const subtasks = task.subtasksList || [];
  const completedSubtasks = subtasks.filter(s => s.status === "completed").length;
  const progress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;
  const statusColor = STATUS_CONFIG[task.status]?.color || "text-slate-400";

  return (
    <div className="animate-fade-in">
      {/* Main Task Row */}
      <div
        className="group flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 row-hover cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand Arrow */}
        <ChevronRight
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-200",
            expanded && "rotate-90",
            subtasks.length === 0 && "opacity-0"
          )}
        />

        {/* Status Icon */}
        <StatusIcon className={cn("w-4 h-4", statusColor)} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors",
              task.status === "completed" && "line-through text-slate-400"
            )}
          >
            {task.title}
          </span>
        </div>

        {/* Project Badge */}
        {task.project_name && (
          <span
            className="px-2 py-0.5 text-xs rounded-full text-white truncate max-w-[120px]"
            style={{ backgroundColor: task.project_color || "#6366f1" }}
          >
            {task.project_name}
          </span>
        )}

        {/* Priority */}
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded border",
          priorityConfig.color,
          priorityConfig.bg,
          priorityConfig.border
        )}>
          {priorityConfig.label}
        </span>

        {/* Assignees */}
        <div className="flex -space-x-2">
          {task.assignees.slice(0, 3).map((assignee) => (
            <div
              key={assignee.id}
              className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
              title={assignee.username}
            >
              {assignee.username.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-medium border-2 border-white">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>

        {/* Progress */}
        {subtasks.length > 0 && (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {completedSubtasks}/{subtasks.length}
            </span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </div>
        )}

        {/* View Details */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Ver
        </Button>
      </div>

      {/* Subtasks */}
      {expanded && subtasks.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-100 animate-expand-in">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              onStart={() => onStartSubtask(subtask.id)}
              onComplete={() => onCompleteSubtask(subtask.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubtaskRow({
  subtask,
  onStart,
  onComplete,
}: {
  subtask: SubtaskWithAssignees;
  onStart: () => void;
  onComplete: () => void;
}) {
  const StatusIcon = STATUS_CONFIG[subtask.status]?.icon || Circle;
  const statusColor = STATUS_CONFIG[subtask.status]?.color || "text-slate-400";
  const priorityConfig = PRIORITY_CONFIG[subtask.priority];

  return (
    <div className="group flex items-center gap-3 pl-12 pr-4 py-2 row-hover">
      {/* Checkbox / Status */}
      <button
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          subtask.status === "completed"
            ? "bg-green-600 border-green-600 text-white"
            : subtask.status === "in_progress"
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-400"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (subtask.status === "pending") {
            onStart();
          } else if (subtask.status === "in_progress") {
            onComplete();
          }
        }}
      >
        {subtask.status === "completed" && <Check className="w-3 h-3" />}
        {subtask.status === "in_progress" && <Clock className="w-3 h-3 text-indigo-600" />}
      </button>

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-sm text-slate-700",
          subtask.status === "completed" && "line-through text-slate-400"
        )}
      >
        {subtask.title}
      </span>

      {/* Priority indicator */}
      <div
        className={cn("w-2 h-2 rounded-full", {
          "bg-red-500": subtask.priority === "urgent",
          "bg-orange-500": subtask.priority === "high",
          "bg-yellow-500": subtask.priority === "medium",
          "bg-slate-300": subtask.priority === "low",
        })}
        title={priorityConfig.label}
      />

      {/* Assignee */}
      {subtask.assignees.length > 0 && (
        <div
          className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-medium"
          title={subtask.assignees[0].username}
        >
          {subtask.assignees[0].username.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Time */}
      {subtask.total_time_minutes > 0 && (
        <span className="text-xs text-slate-400">
          {Math.floor(subtask.total_time_minutes / 60)}h {subtask.total_time_minutes % 60}m
        </span>
      )}
    </div>
  );
}

export function LinearTasksView({
  projectId,
  serviceId,
  onTaskSelect,
  onCreateTask,
}: LinearTasksViewProps) {
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    const params: { project_id?: string } = {};
    if (projectId) {
      params.project_id = projectId;
    }

    const result = await api.tasks.getAll(params);

    if (result.success && result.data) {
      const tasksWithSubtasks = await Promise.all(
        result.data.map(async (task) => {
          const subtasksResult = await api.subtasks.getByTask(task.id);
          return {
            ...task,
            subtasksList: subtasksResult.success ? subtasksResult.data : [],
          };
        })
      );
      setTasks(tasksWithSubtasks);
    }
    setLoading(false);
  };

  const handleStartSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.start(subtaskId);
    if (result.success) {
      toast({ title: "Subtarea iniciada", description: "Has comenzado a trabajar en esta subtarea." });
      fetchTasks();
    } else {
      toast({ title: "Error", description: result.error || "No se pudo iniciar la subtarea", variant: "destructive" });
    }
  };

  const handleCompleteSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.complete(subtaskId);
    if (result.success) {
      toast({ title: "Subtarea completada", description: "Has completado esta subtarea." });
      fetchTasks();
    } else {
      toast({ title: "Error", description: result.error || "No se pudo completar la subtarea", variant: "destructive" });
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tareas</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-slate-500">{stats.total} total</span>
              <span className="text-sm text-slate-400">|</span>
              <span className="text-sm text-yellow-600">{stats.pending} pendientes</span>
              <span className="text-sm text-indigo-600">{stats.inProgress} en progreso</span>
              <span className="text-sm text-green-600">{stats.completed} completadas</span>
            </div>
          </div>
          {onCreateTask && (
            <Button onClick={onCreateTask}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarea
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Cargando tareas...</span>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-2">No hay tareas</p>
            <p className="text-sm text-slate-400">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Prueba a cambiar los filtros"
                : "Crea una nueva tarea para comenzar"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onSelect={() => onTaskSelect?.(task.id)}
                onStartSubtask={handleStartSubtask}
                onCompleteSubtask={handleCompleteSubtask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
