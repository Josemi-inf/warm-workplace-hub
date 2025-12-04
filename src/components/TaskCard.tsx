import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Play, Check } from "lucide-react";

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

  return (
    <Card className="card-warm p-6 animate-slide-up">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline" className="ml-4">
            {completedCount}/{totalCount} completadas
          </Badge>
        </div>

        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Esta tarea no tiene subtareas
          </p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30
                           transition-all hover:bg-background hover:border-primary/20"
              >
                <div className="flex-shrink-0">
                  {subtask.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-completed" />
                  ) : subtask.status === "in-progress" ? (
                    <Clock className="h-5 w-5 text-in-progress animate-gentle-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    subtask.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                  }`}>
                    {subtask.title}
                  </p>
                </div>

                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={subtask.avatar} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {subtask.assignee.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {subtask.status === "pending" && onStartSubtask && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 hover:bg-primary/10 hover:text-primary"
                    onClick={() => onStartSubtask(subtask.id)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Iniciar
                  </Button>
                )}

                {subtask.status === "in-progress" && onCompleteSubtask && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 hover:bg-completed/10 hover:text-completed"
                    onClick={() => onCompleteSubtask(subtask.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Completar
                  </Button>
                )}

                {subtask.status === "completed" && (
                  <Badge className="badge-completed">Listo</Badge>
                )}

                {subtask.status === "in-progress" && !onCompleteSubtask && (
                  <Badge className="badge-in-progress">En curso</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
