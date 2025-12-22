import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Circle, Clock, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subtask {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed";
  assignee: string;
  avatar?: string;
}

interface TaskCardProps {
  id?: string;
  title: string;
  description: string;
  subtasks: Subtask[];
  onStartSubtask?: (subtaskId: string) => void;
  onCompleteSubtask?: (subtaskId: string) => void;
}

export function TaskCard({ title, description, subtasks, onStartSubtask, onCompleteSubtask }: TaskCardProps) {
  const completedCount = subtasks.filter(st => st.status === "completed").length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-5 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-300 card-hover">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 line-clamp-2">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{completedCount}/{totalCount}</p>
              <p className="text-xs text-slate-500">completadas</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out animate-progress",
                progress === 100 ? "bg-green-500" : "bg-indigo-600"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Subtasks */}
        {subtasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            Esta tarea no tiene subtareas
          </p>
        ) : (
          <div className="space-y-2 stagger-children">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                  subtask.status === "completed"
                    ? "bg-slate-50"
                    : "bg-slate-50 hover:bg-indigo-50 hover:scale-[1.01]"
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {subtask.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 animate-bounce-in" />
                  ) : subtask.status === "in-progress" ? (
                    <Clock className="h-5 w-5 text-indigo-600 animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate transition-all duration-200",
                    subtask.status === "completed"
                      ? "line-through text-slate-400"
                      : "text-slate-700"
                  )}>
                    {subtask.title}
                  </p>
                </div>

                {/* Assignee Avatar */}
                <Avatar className="h-7 w-7 flex-shrink-0 transition-transform duration-200 hover:scale-110">
                  <AvatarImage src={subtask.avatar} />
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600 font-medium">
                    {subtask.assignee.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {subtask.status === "pending" && onStartSubtask && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 hover:scale-105"
                      onClick={() => onStartSubtask(subtask.id)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Iniciar
                    </Button>
                  )}

                  {subtask.status === "in-progress" && onCompleteSubtask && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-slate-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 hover:scale-105"
                      onClick={() => onCompleteSubtask(subtask.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Completar
                    </Button>
                  )}

                  {subtask.status === "completed" && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded animate-bounce-in">
                      Listo
                    </span>
                  )}

                  {subtask.status === "in-progress" && !onCompleteSubtask && (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      En curso
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
