import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { Channel, TaskWithAssignees, SubtaskWithAssignees, SafeUser } from "@/types/database";
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
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
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
      fetchChannels();
    }
  }, [loading]);

  const fetchChannels = async () => {
    const result = await api.channels.getAll();
    if (result.success && result.data) {
      setChannels(result.data);
      // Set default text channel
      const textChannel = result.data.find(c => c.type === 'text');
      if (textChannel && !selectedChannel) {
        setSelectedChannel(textChannel);
      }
    }
  };

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
      case "settings": return "Configuracion General";
      case "channel": return selectedChannel ? `Mensajes - #${selectedChannel.name}` : "Mensajes";
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
          <div className="p-8 space-y-8 overflow-auto h-full max-w-7xl mx-auto">
            <WelcomeHeader
              user={currentUser}
              onCreateTask={canCreateTasks ? () => setCreateTaskOpen(true) : undefined}
            />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Tareas Recientes</h2>
                    <p className="text-sm text-muted-foreground mt-1">Tus tareas activas y pendientes</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTasks} disabled={tasksLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${tasksLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
                {tasksLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <p className="text-muted-foreground mb-4">No hay tareas todavia</p>
                    {canCreateTasks && (
                      <Button onClick={() => setCreateTaskOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear primera tarea
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
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
          <div className="p-8 space-y-6 overflow-auto h-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Todas las Tareas</h2>
                <p className="text-sm text-muted-foreground mt-1">{pendingSubtasksCount} subtareas pendientes</p>
              </div>
              {canCreateTasks && (
                <Button onClick={() => setCreateTaskOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Tarea
                </Button>
              )}
            </div>
            {tasksLoading ? (
              <div className="text-center py-12 text-muted-foreground">Cargando tareas...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground mb-4">No hay tareas todavia</p>
                {canCreateTasks && (
                  <Button onClick={() => setCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera tarea
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
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
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center border-b border-border/50 px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">{getHeaderTitle()}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-hidden bg-muted/30">
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
