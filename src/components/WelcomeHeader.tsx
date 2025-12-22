import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { Button } from "@/components/ui/button";
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
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {userName}
          </h1>
          <p className="text-slate-500 capitalize">{formattedDate}</p>
        </div>
        {onCreateTask && (
          <Button onClick={onCreateTask} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{onlineCount}</p>
              <p className="text-sm text-slate-500">Equipo en linea</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">Hoy</p>
              <p className="text-sm text-slate-500">Buen dia para avanzar</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">Productivo</p>
              <p className="text-sm text-slate-500">Sigue asi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
