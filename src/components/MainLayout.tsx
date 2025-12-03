import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { Channel } from "@/types/database";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TextChannel } from "./TextChannel";
import { WelcomeHeader } from "./WelcomeHeader";
import { TaskCard } from "./TaskCard";
import { ActivityFeed } from "./ActivityFeed";
import { EmployeeStats } from "./EmployeeStats";
import { useToast } from "@/hooks/use-toast";

type ViewType = "home" | "tasks" | "stats" | "channel";

export function MainLayout() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sample tasks (will be replaced with API data)
  const sampleTasks = [
    {
      id: "1",
      title: "Diseño de nueva landing page",
      description: "Crear mockups y prototipos para la página principal",
      subtasks: [
        { id: "1-1", title: "Wireframes iniciales", status: "completed" as const, assignee: "María González" },
        { id: "1-2", title: "Diseño visual en Figma", status: "in-progress" as const, assignee: "Carlos Ruiz" },
        { id: "1-3", title: "Revisión con cliente", status: "pending" as const, assignee: "Ana Torres" },
      ],
    },
    {
      id: "2",
      title: "Integración de API de pagos",
      description: "Conectar sistema de pagos con Stripe",
      subtasks: [
        { id: "2-1", title: "Configurar cuenta Stripe", status: "completed" as const, assignee: "Jorge López" },
        { id: "2-2", title: "Implementar checkout", status: "pending" as const, assignee: "María González" },
        { id: "2-3", title: "Testing de flujo completo", status: "pending" as const, assignee: "Carlos Ruiz" },
      ],
    },
  ];

  const handleStartSubtask = (subtaskId: string) => {
    toast({
      title: "¡Genial!",
      description: "Has iniciado esta subtarea. Tómala con calma.",
    });
  };

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
      }
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

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
      case "stats": return "Estadísticas";
      case "channel": return selectedChannel ? `#${selectedChannel.name}` : "Canal";
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="p-6 space-y-6 overflow-auto h-full">
            <WelcomeHeader />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-semibold text-foreground">Tareas Recientes</h2>
                {sampleTasks.slice(0, 1).map((task) => (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    description={task.description}
                    subtasks={task.subtasks}
                    onStartSubtask={handleStartSubtask}
                  />
                ))}
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
              <p className="text-sm text-muted-foreground">5 subtareas pendientes</p>
            </div>
            {sampleTasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                subtasks={task.subtasks}
                onStartSubtask={handleStartSubtask}
              />
            ))}
          </div>
        );
      case "stats":
        return <EmployeeStats />;
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
    </SidebarProvider>
  );
}
