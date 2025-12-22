import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { TaskWithAssignees, SubtaskWithAssignees, TaskComment, SafeUser } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Check,
  Circle,
  Clock,
  Plus,
  Play,
  Square,
  MessageSquare,
  Calendar,
  Flag,
  User,
  Trash2,
  Edit2,
  Send,
  Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskWithSubtasks extends TaskWithAssignees {
  subtasksList?: SubtaskWithAssignees[];
}

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const PRIORITY_CONFIG = {
  urgent: { label: "Urgente", color: "text-red-600", bg: "bg-red-50" },
  high: { label: "Alta", color: "text-orange-600", bg: "bg-orange-50" },
  medium: { label: "Media", color: "text-yellow-600", bg: "bg-yellow-50" },
  low: { label: "Baja", color: "text-slate-500", bg: "bg-slate-50" },
};

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "text-slate-500", bg: "bg-slate-100" },
  in_progress: { label: "En progreso", color: "text-indigo-600", bg: "bg-indigo-50" },
  completed: { label: "Completada", color: "text-green-600", bg: "bg-green-50" },
  cancelled: { label: "Cancelada", color: "text-red-500", bg: "bg-red-50" },
};

export function TaskDetailPanel({ taskId, onClose, onUpdate }: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskWithSubtasks | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [activeTimers, setActiveTimers] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    const result = await api.tasks.getById(taskId);

    if (result.success && result.data) {
      const subtasksResult = await api.subtasks.getByTask(taskId);
      setTask({
        ...result.data,
        subtasksList: subtasksResult.success ? subtasksResult.data : [],
      });
      setEditedTitle(result.data.title);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const result = await api.comments.getByTask(taskId);
    if (result.success && result.data) {
      setComments(result.data);
    }
  };

  const handleUpdateTitle = async () => {
    if (!task || editedTitle.trim() === task.title) {
      setEditingTitle(false);
      return;
    }

    const result = await api.tasks.update(taskId, { title: editedTitle.trim() });
    if (result.success) {
      setTask({ ...task, title: editedTitle.trim() });
      toast({ title: "Titulo actualizado" });
      onUpdate?.();
    }
    setEditingTitle(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!task) return;
    const result = await api.tasks.update(taskId, { status: status as any });
    if (result.success) {
      setTask({ ...task, status: status as any });
      toast({ title: "Estado actualizado" });
      onUpdate?.();
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    if (!task) return;
    const result = await api.tasks.update(taskId, { priority: priority as any });
    if (result.success) {
      setTask({ ...task, priority: priority as any });
      toast({ title: "Prioridad actualizada" });
      onUpdate?.();
    }
  };

  const handleStartSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.start(subtaskId);
    if (result.success) {
      toast({ title: "Subtarea iniciada" });
      fetchTask();
      onUpdate?.();
    }
  };

  const handleCompleteSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.complete(subtaskId);
    if (result.success) {
      toast({ title: "Subtarea completada" });
      fetchTask();
      onUpdate?.();
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const result = await api.subtasks.create({
      task_id: taskId,
      title: newSubtaskTitle.trim(),
      status: "pending",
      priority: "medium",
      order_index: (task?.subtasksList?.length || 0) + 1,
    });

    if (result.success) {
      toast({ title: "Subtarea creada" });
      setNewSubtaskTitle("");
      setShowAddSubtask(false);
      fetchTask();
      onUpdate?.();
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.delete(subtaskId);
    if (result.success) {
      toast({ title: "Subtarea eliminada" });
      fetchTask();
      onUpdate?.();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const result = await api.comments.create({
      task_id: taskId,
      content: newComment.trim(),
    });

    if (result.success) {
      setNewComment("");
      fetchComments();
    }
  };

  const handleStartTimer = async (subtaskId: string) => {
    const result = await api.timeEntries.startTimer(subtaskId);
    if (result.success) {
      setActiveTimers(prev => ({ ...prev, [subtaskId]: true }));
      toast({ title: "Temporizador iniciado" });
    }
  };

  const getTotalTime = (subtask: SubtaskWithAssignees) => {
    const hours = Math.floor(subtask.total_time_minutes / 60);
    const minutes = subtask.total_time_minutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="w-96 h-full bg-white border-l border-slate-200 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-96 h-full bg-white border-l border-slate-200 flex items-center justify-center">
        <p className="text-slate-500">Tarea no encontrada</p>
      </div>
    );
  }

  const subtasks = task.subtasksList || [];
  const completedSubtasks = subtasks.filter(s => s.status === "completed").length;
  const progress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
  const totalTime = subtasks.reduce((acc, s) => acc + s.total_time_minutes, 0);

  return (
    <div className="w-96 h-full bg-white border-l border-slate-200 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-500">Detalle de tarea</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            {editingTitle ? (
              <div className="flex gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="font-semibold"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateTitle()}
                  autoFocus
                />
                <Button size="sm" onClick={handleUpdateTitle}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h2
                className="text-lg font-semibold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
            {task.description && (
              <p className="text-sm text-slate-500 mt-1">{task.description}</p>
            )}
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
              <Select value={task.status} onValueChange={handleUpdateStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Prioridad</label>
              <Select value={task.priority} onValueChange={handleUpdatePriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress & Time */}
          <div className="p-3 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Progreso</span>
              <span className="text-sm font-medium text-slate-900">
                {completedSubtasks}/{subtasks.length} subtareas
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-slate-500">
                <Timer className="w-4 h-4" />
                <span>Tiempo total</span>
              </div>
              <span className="font-medium text-slate-900">
                {Math.floor(totalTime / 60)}h {totalTime % 60}m
              </span>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">Asignados</label>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                    {assignee.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700">{assignee.username}</span>
                </div>
              ))}
              {task.assignees.length === 0 && (
                <span className="text-sm text-slate-400">Sin asignar</span>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500">Subtareas</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddSubtask(!showAddSubtask)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showAddSubtask && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Nueva subtarea..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  autoFocus
                />
                <Button size="sm" onClick={handleAddSubtask}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="space-y-1">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <button
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      subtask.status === "completed"
                        ? "bg-green-600 border-green-600 text-white"
                        : subtask.status === "in_progress"
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-300 hover:border-indigo-400"
                    )}
                    onClick={() => {
                      if (subtask.status === "pending") handleStartSubtask(subtask.id);
                      else if (subtask.status === "in_progress") handleCompleteSubtask(subtask.id);
                    }}
                  >
                    {subtask.status === "completed" && <Check className="w-3 h-3" />}
                    {subtask.status === "in_progress" && <Clock className="w-3 h-3 text-indigo-600" />}
                  </button>

                  <span
                    className={cn(
                      "flex-1 text-sm",
                      subtask.status === "completed" && "line-through text-slate-400"
                    )}
                  >
                    {subtask.title}
                  </span>

                  {subtask.total_time_minutes > 0 && (
                    <span className="text-xs text-slate-400">{getTotalTime(subtask)}</span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={() => handleStartTimer(subtask.id)}
                    title="Iniciar temporizador"
                  >
                    <Play className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {subtasks.length === 0 && !showAddSubtask && (
                <p className="text-sm text-slate-400 text-center py-4">
                  Sin subtareas
                </p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Comentarios ({comments.length})
            </label>

            <div className="space-y-3 mb-3">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs">
                      ?
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{comment.content}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
