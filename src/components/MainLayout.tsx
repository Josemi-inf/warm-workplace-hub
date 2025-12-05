import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { Channel, TaskWithAssignees, SubtaskWithAssignees, SafeUser } from "@/types/database";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TextChannel } from "./TextChannel";
import { WelcomeHeader } from "./WelcomeHeader";
import { TaskCard } from "./TaskCard";
import { ActivityFeed } from "./ActivityFeed";
import { EmployeeStats } from "./EmployeeStats";
import { AdminSettings } from "./AdminSettings";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

type ViewType = "home" | "tasks" | "stats" | "channel" | "settings";

interface TaskWithSubtasks extends TaskWithAssignees {
  subtasksList?: SubtaskWithAssignees[];
}

export function MainLayout() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if authenticated
    if (!api.auth.isAuthenticated()) {
      navigate("/auth");
      return;
    }

    // Verify session is valid
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
      // Fetch subtasks for each task
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

  // Transform tasks for TaskCard component
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch (currentView) {
      case "home": return "Inicio";
      case "tasks": return "Tareas";
      case "stats": return "Estadisticas";
      case "settings": return "Ajustes Generales";
      case "channel": return selectedChannel ? `#${selectedChannel.name}` : "Canal";
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
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Tareas Recientes</h2>
                  <Button variant="ghost" size="sm" onClick={fetchTasks} disabled={tasksLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${tasksLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
                {tasksLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No hay tareas todavía</p>
                    {canCreateTasks && (
                      <Button onClick={() => setCreateTaskOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear primera tarea
                      </Button>
                    )}
                  </div>
                ) : (
                  tasks.slice(0, 2).map((task) => (
                    <TaskCard
                      key={task.id}
                      {...transformTaskForCard(task)}
                      onStartSubtask={handleStartSubtask}
                      onCompleteSubtask={handleCompleteSubtask}
                    />
                  ))
                )}
              </div>
              <ActivityFeed />
            </div>
          </div>
        );
      case "tasks":
        return (
          <div className="p-6 space-y-6 overflow-auto h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Todas las Tareas</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{pendingSubtasksCount} subtareas pendientes</p>
                {canCreateTasks && (
                  <Button onClick={() => setCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Tarea
                  </Button>
                )}
              </div>
            </div>
            {tasksLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando tareas...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No hay tareas todavía</p>
                {canCreateTasks && (
                  <Button onClick={() => setCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera tarea
                  </Button>
                )}
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  {...transformTaskForCard(task)}
                  onStartSubtask={handleStartSubtask}
                  onCompleteSubtask={handleCompleteSubtask}
                />
              ))
            )}
          </div>
        );
      case "stats":
        return <EmployeeStats />;
      case "settings":
        return <AdminSettings />;
      case "channel":
        return selectedChannel?.type === "text" ? (
          <TextChannel channelId={selectedChannel.id} channelName={selectedChannel.name} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Selecciona un canal de texto para chatear</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          onChannelSelect={setSelectedChannel}
          selectedChannel={selectedChannel}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <main className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border/50 px-4 bg-card/30">
            <SidebarTrigger className="mr-2" />
            <span className="text-sm text-muted-foreground font-medium">{getHeaderTitle()}</span>
          </header>
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </main>
      </div>
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onTaskCreated={handleTaskCreated}
      />
    </SidebarProvider>
  );
}
