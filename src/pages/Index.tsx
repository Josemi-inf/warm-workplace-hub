import { useState } from "react";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { TaskCard } from "@/components/TaskCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();

  const sampleTasks = [
    {
      id: "1",
      title: "Diseño de nueva landing page",
      description: "Crear mockups y prototipos para la página principal",
      subtasks: [
        {
          id: "1-1",
          title: "Wireframes iniciales",
          status: "completed" as const,
          assignee: "María González",
        },
        {
          id: "1-2",
          title: "Diseño visual en Figma",
          status: "in-progress" as const,
          assignee: "Carlos Ruiz",
        },
        {
          id: "1-3",
          title: "Revisión con cliente",
          status: "pending" as const,
          assignee: "Ana Torres",
        },
      ],
    },
    {
      id: "2",
      title: "Integración de API de pagos",
      description: "Conectar sistema de pagos con Stripe",
      subtasks: [
        {
          id: "2-1",
          title: "Configurar cuenta Stripe",
          status: "completed" as const,
          assignee: "Jorge López",
        },
        {
          id: "2-2",
          title: "Implementar checkout",
          status: "pending" as const,
          assignee: "María González",
        },
        {
          id: "2-3",
          title: "Testing de flujo completo",
          status: "pending" as const,
          assignee: "Carlos Ruiz",
        },
      ],
    },
  ];

  const handleStartSubtask = (subtaskId: string) => {
    toast({
      title: "¡Genial! 🎉",
      description: "Has iniciado esta subtarea. Tómala con calma.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <WelcomeHeader />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">
                Tareas de Hoy
              </h2>
              <p className="text-sm text-muted-foreground">
                5 subtareas pendientes
              </p>
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

            <p className="text-center text-muted-foreground italic py-4">
              ¡Buen trabajo equipo! Otra tarea completada juntos. 🌟
            </p>
          </div>

          <div className="space-y-6">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
