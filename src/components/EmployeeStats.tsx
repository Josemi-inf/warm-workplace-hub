import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock, Target } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  productivity: number;
}

const employees: Employee[] = [
  { id: "1", name: "María González", role: "Diseñadora UI/UX", tasksCompleted: 12, tasksInProgress: 3, tasksPending: 2, productivity: 85 },
  { id: "2", name: "Carlos Ruiz", role: "Desarrollador Frontend", tasksCompleted: 18, tasksInProgress: 2, tasksPending: 4, productivity: 92 },
  { id: "3", name: "Ana Torres", role: "Project Manager", tasksCompleted: 8, tasksInProgress: 5, tasksPending: 3, productivity: 78 },
  { id: "4", name: "Jorge López", role: "Desarrollador Backend", tasksCompleted: 15, tasksInProgress: 1, tasksPending: 2, productivity: 88 },
];

export function EmployeeStats() {
  const totalTasks = employees.reduce((acc, emp) => acc + emp.tasksCompleted + emp.tasksInProgress + emp.tasksPending, 0);
  const totalCompleted = employees.reduce((acc, emp) => acc + emp.tasksCompleted, 0);
  const avgProductivity = Math.round(employees.reduce((acc, emp) => acc + emp.productivity, 0) / employees.length);

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <h2 className="text-2xl font-semibold text-foreground">Estadísticas del Equipo</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tareas Totales</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-completed/20">
              <CheckCircle2 className="h-5 w-5 text-completed" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-in-progress/20">
              <Clock className="h-5 w-5 text-in-progress" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{employees.reduce((acc, emp) => acc + emp.tasksInProgress, 0)}</p>
              <p className="text-xs text-muted-foreground">En Progreso</p>
            </div>
          </div>
        </Card>
        <Card className="card-warm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgProductivity}%</p>
              <p className="text-xs text-muted-foreground">Productividad Promedio</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Rendimiento por Empleado</h3>
        <div className="grid gap-4">
          {employees.map((employee) => (
            <Card key={employee.id} className="card-warm p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-background">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {employee.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.role}</p>
                    </div>
                    <Badge className={employee.productivity >= 85 ? "badge-completed" : employee.productivity >= 70 ? "badge-in-progress" : "badge-pending"}>
                      {employee.productivity}% productividad
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Progress value={employee.productivity} className="flex-1 h-2" />
                  </div>
                  
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-completed" />
                      <span className="text-muted-foreground">{employee.tasksCompleted} completadas</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-in-progress" />
                      <span className="text-muted-foreground">{employee.tasksInProgress} en curso</span>
                    </span>
                    <span className="text-muted-foreground">{employee.tasksPending} pendientes</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
