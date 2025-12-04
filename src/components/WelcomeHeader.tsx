import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

interface WelcomeHeaderProps {
  user?: SafeUser | null;
  onCreateTask?: () => void;
}

export function WelcomeHeader({ user, onCreateTask }: WelcomeHeaderProps) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  const fetchOnlineUsers = async () => {
    const result = await api.users.getAll();
    if (result.success && result.data) {
      const online = result.data.filter(u => u.status === "online").length;
      setOnlineCount(online);
    }
  };

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Buenos días" :
    currentHour < 18 ? "Buenas tardes" :
    "Buenas noches";

  const userName = user?.username || "equipo";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/70" />

      <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
        <div className="space-y-6 flex flex-col justify-center">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground animate-slide-up">
              {greeting}, {userName}
            </h1>
            <p className="text-lg text-muted-foreground animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Hoy es un buen día para trabajar juntos. Vamos paso a paso.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md
                         transition-all hover:shadow-lg hover:scale-105"
              onClick={onCreateTask}
            >
              <Plus className="mr-2 h-5 w-5" />
              Crear Nueva Tarea
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-primary/30 hover:bg-primary/5 hover:border-primary/50"
            >
              <Users className="mr-2 h-5 w-5" />
              Ver Tablero de Equipo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground italic animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {onlineCount > 0 ? `${onlineCount} compañero${onlineCount > 1 ? 's' : ''} en línea` : "Conectando..."}
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="w-full h-64 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20
                          flex items-center justify-center border-2 border-primary/20">
            <div className="text-center space-y-2 p-8">
              <div className="text-6xl">🤝</div>
              <p className="text-muted-foreground font-medium">Tu equipo colaborando</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
