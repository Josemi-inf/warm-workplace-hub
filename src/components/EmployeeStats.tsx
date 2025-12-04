import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { UserStatistics } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock, Target, Users } from "lucide-react";

export function EmployeeStats() {
  const [users, setUsers] = useState<UserStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const result = await api.users.getStatistics();
    if (result.success && result.data) {
      setUsers(result.data);
    }
    setLoading(false);
  };

  const totalHours = users.reduce((acc, u) => acc + (u.total_time_hours || 0), 0);
  const totalSubtasksCompleted = users.reduce((acc, u) => acc + (u.subtasks_completed || 0), 0);
  const totalUsers = users.length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <h2 className="text-2xl font-semibold text-foreground">Estadísticas del Equipo</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Miembros del Equipo</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-completed/20">
              <CheckCircle2 className="h-5 w-5 text-completed" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalSubtasksCompleted}</p>
              <p className="text-xs text-muted-foreground">Subtareas Completadas</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-in-progress/20">
              <Clock className="h-5 w-5 text-in-progress" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Horas Registradas</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.length > 0 ? (totalSubtasksCompleted / users.length).toFixed(1) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Promedio por Persona</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Rendimiento por Empleado</h3>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay datos de empleados todavía</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user) => {
              const productivity = user.subtasks_completed > 0 ? Math.min(100, user.subtasks_completed * 10) : 0;

              return (
                <Card key={user.user_id} className="card-warm p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.department_name || user.role || "Miembro"}
                          </p>
                        </div>
                        <Badge className={productivity >= 70 ? "badge-completed" : productivity >= 40 ? "badge-in-progress" : "badge-pending"}>
                          {user.total_time_hours?.toFixed(1) || 0}h registradas
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        <Progress value={productivity} className="flex-1 h-2" />
                      </div>

                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-completed" />
                          <span className="text-muted-foreground">{user.subtasks_completed || 0} completadas</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">{user.tasks_created_completed || 0} tareas propias</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
