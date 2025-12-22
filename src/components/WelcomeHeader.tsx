import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users, Calendar, TrendingUp } from "lucide-react";

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
    currentHour < 12 ? "Buenos dias" :
    currentHour < 18 ? "Buenas tardes" :
    "Buenas noches";

  const userName = user?.username || "equipo";

  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}, {userName}
          </h1>
          <p className="text-muted-foreground capitalize">{formattedDate}</p>
        </div>
        {onCreateTask && (
          <Button onClick={onCreateTask} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Tarea
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-card border-border/50 hover:border-border transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Equipo en linea</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border/50 hover:border-border transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Hoy</p>
              <p className="text-sm text-muted-foreground">Buen dia para avanzar</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border/50 hover:border-border transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Productivo</p>
              <p className="text-sm text-muted-foreground">Sigue asi</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
