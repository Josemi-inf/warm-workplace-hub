import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { UserStatistics } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle2, Clock, Target, Users, RefreshCw, AlertCircle } from "lucide-react";

export function EmployeeStats() {
  const [users, setUsers] = useState<UserStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    const result = await api.users.getStatistics();
    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      setError(result.error || "Error al cargar estadísticas");
    }
    setLoading(false);
  };

  const totalHours = users.reduce((acc, u) => acc + (u.total_time_hours || 0), 0);
  const totalSubtasksCompleted = users.reduce((acc, u) => acc + (u.subtasks_completed || 0), 0);
  const totalUsers = users.length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchStats} variant="outline" className="hover-lift">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Estadísticas del Equipo</h2>
        <Button variant="ghost" size="sm" onClick={fetchStats} className="hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-children">
        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-300 card-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
              <p className="text-xs text-slate-500">Miembros del Equipo</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-green-300 transition-all duration-300 card-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalSubtasksCompleted}</p>
              <p className="text-xs text-slate-500">Subtareas Completadas</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-300 card-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-slate-500">Horas Registradas</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-300 card-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {users.length > 0 ? (totalSubtasksCompleted / users.length).toFixed(1) : 0}
              </p>
              <p className="text-xs text-slate-500">Promedio por Persona</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Rendimiento por Empleado</h3>
        {users.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-200 animate-fade-in">
            <p>No hay datos de empleados todavía</p>
          </div>
        ) : (
          <div className="grid gap-4 stagger-children">
            {users.map((user) => {
              const productivity = user.subtasks_completed > 0 ? Math.min(100, user.subtasks_completed * 10) : 0;

              return (
                <div key={user.user_id} className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-all duration-300 card-hover">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-indigo-100 transition-transform duration-200 hover:scale-110">
                      <AvatarFallback className="bg-indigo-50 text-indigo-600 font-semibold">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{user.username}</p>
                          <p className="text-sm text-slate-500">
                            {user.department_name || user.role || "Miembro"}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          productivity >= 70
                            ? "bg-green-50 text-green-600"
                            : productivity >= 40
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {user.total_time_hours?.toFixed(1) || 0}h registradas
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <Progress value={productivity} className="flex-1 h-2" />
                      </div>

                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-slate-500">{user.subtasks_completed || 0} completadas</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-indigo-600" />
                          <span className="text-slate-500">{user.tasks_created_completed || 0} tareas propias</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
