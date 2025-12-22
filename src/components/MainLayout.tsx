import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { TaskWithAssignees, SubtaskWithAssignees, SafeUser } from "@/types/database";
import { AppSidebar } from "./AppSidebar";
import { WelcomeHeader } from "./WelcomeHeader";
import { TaskCard } from "./TaskCard";
import { ActivityFeed } from "./ActivityFeed";
import { EmployeeStats } from "./EmployeeStats";
import { AdminSettings } from "./AdminSettings";
import { ChatsView } from "./ChatsView";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { OnlineUsersDropdown } from "./OnlineUsersDropdown";
import { LinearTasksView } from "./LinearTasksView";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

type ViewType = "home" | "tasks" | "stats" | "chats" | "settings";

interface TaskWithSubtasks extends TaskWithAssignees {
  subtasksList?: SubtaskWithAssignees[];
}

export function MainLayout() {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!api.auth.isAuthenticated()) {
      navigate("/auth");
      return;
    }

    const checkSession = async () => {
      const result = await api.auth.getSession();
      if (!result.success) {
        navigate("/auth");
        return;
      }
      setCurrentUser(result.data || null);
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!loading) {
      fetchTasks();
    }
  }, [loading]);

  const fetchTasks = async () => {
    setTasksLoading(true);
    const result = await api.tasks.getAll();

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
    setTasksLoading(false);
  };

  const handleStartSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.start(subtaskId);

    if (result.success) {
      toast({
        title: "Subtarea iniciada",
        description: "Has comenzado a trabajar en esta subtarea.",
      });
      fetchTasks();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo iniciar la subtarea",
        variant: "destructive",
      });
    }
  };

  const handleCompleteSubtask = async (subtaskId: string) => {
    const result = await api.subtasks.complete(subtaskId);

    if (result.success) {
      toast({
        title: "Subtarea completada",
        description: "Has completado esta subtarea.",
      });
      fetchTasks();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo completar la subtarea",
        variant: "destructive",
      });
    }
  };

  const handleTaskCreated = () => {
    setCreateTaskOpen(false);
    fetchTasks();
    toast({
      title: "Tarea creada",
      description: "La tarea se ha creado correctamente.",
    });
  };

  const transformTaskForCard = (task: TaskWithSubtasks) => {
    const subtasks = (task.subtasksList || []).map((st) => ({
      id: st.id,
      title: st.title,
      status: (st.status === "in_progress" ? "in-progress" : st.status) as "pending" | "in-progress" | "completed",
      assignee: Array.isArray(st.assignees) && st.assignees.length > 0
        ? st.assignees[0].username
        : "Sin asignar",
    }));

    return {
      id: task.id,
      title: task.title,
      description: task.description || "",
      subtasks,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center animate-pulse">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch (currentView) {
      case "home": return "Inicio";
      case "tasks": return "Tareas";
      case "stats": return "Estadisticas";
      case "settings": return "Configuracion";
      case "chats": return "Chats";
    }
  };

  const pendingSubtasksCount = tasks.reduce((acc, task) => {
    const pending = (task.subtasksList || []).filter(st => st.status === "pending").length;
    return acc + pending;
  }, 0);

  const canCreateTasks = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="p-6 space-y-6 overflow-auto h-full">
            <WelcomeHeader
              user={currentUser}
              onCreateTask={canCreateTasks ? () => setCreateTaskOpen(true) : undefined}
            />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Tareas Recientes</h2>
                  <Button variant="outline" size="sm" onClick={fetchTasks} disabled={tasksLoading} className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200">
                    <RefreshCw className={`w-4 h-4 mr-2 ${tasksLoading ? 'animate-spin' : ''} text-indigo-600`} />
                    Actualizar
                  </Button>
                </div>
                {tasksLoading ? (
                  <div className="text-center py-12 text-slate-500">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                    <p className="text-slate-500 mb-4">No hay tareas todavia</p>
                    {canCreateTasks && (
                      <Button onClick={() => setCreateTaskOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear primera tarea
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 stagger-children">
                    {tasks.slice(0, 3).map((task) => (
                      <TaskCard
                        key={task.id}
                        {...transformTaskForCard(task)}
                        onStartSubtask={handleStartSubtask}
                        onCompleteSubtask={handleCompleteSubtask}
                      />
                    ))}
                  </div>
                )}
              </div>
              <ActivityFeed />
            </div>
          </div>
        );
      case "tasks":
        return (
          <div className="flex h-full">
            <div className="flex-1">
              <LinearTasksView
                projectId={selectedProjectId}
                serviceId={selectedServiceId}
                onTaskSelect={(taskId) => setSelectedTaskId(taskId)}
                onCreateTask={canCreateTasks ? () => setCreateTaskOpen(true) : undefined}
              />
            </div>
            {selectedTaskId && (
              <TaskDetailPanel
                taskId={selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={fetchTasks}
              />
            )}
          </div>
        );
      case "stats":
        return <EmployeeStats />;
      case "settings":
        return <AdminSettings />;
      case "chats":
        return <ChatsView />;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-100">
      <AppSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedServiceId={selectedServiceId}
        selectedProjectId={selectedProjectId}
        onServiceSelect={setSelectedServiceId}
        onProjectSelect={(projectId, serviceId) => {
          setSelectedProjectId(projectId);
          setSelectedServiceId(serviceId);
        }}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b border-slate-200 px-6 bg-white sticky top-0 z-10">
          <h1 className="text-base font-semibold text-slate-900">{getHeaderTitle()}</h1>
          <OnlineUsersDropdown />
        </header>
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
