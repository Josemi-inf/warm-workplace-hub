import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    <Card className="p-6 bg-card border border-border/50 hover:border-border transition-colors">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{completedCount}/{totalCount}</p>
              <p className="text-xs text-muted-foreground">completadas</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress === 100 ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Subtasks */}
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
            Esta tarea no tiene subtareas
          </p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  "border border-transparent",
                  subtask.status === "completed"
                    ? "bg-muted/30"
                    : "bg-muted/50 hover:bg-muted hover:border-border/50"
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {subtask.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : subtask.status === "in-progress" ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    subtask.status === "completed"
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  )}>
                    {subtask.title}
                  </p>
                </div>

                {/* Assignee Avatar */}
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={subtask.avatar} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {subtask.assignee.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {subtask.status === "pending" && onStartSubtask && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
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
                      className="h-8 px-3 text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
                      onClick={() => onCompleteSubtask(subtask.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Completar
                    </Button>
                  )}

                  {subtask.status === "completed" && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Listo
                    </Badge>
                  )}

                  {subtask.status === "in-progress" && !onCompleteSubtask && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      En curso
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
