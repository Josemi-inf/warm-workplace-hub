import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Activity } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, MessageCircle, UserPlus, Clock, ListTodo, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityWithUser extends Activity {
  username?: string;
  avatar_url?: string | null;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "task_completed":
    case "subtask_completed":
      return <CheckCircle2 className="h-4 w-4 text-completed" />;
    case "task_created":
    case "subtask_created":
      return <ListTodo className="h-4 w-4 text-primary" />;
    case "subtask_started":
      return <Play className="h-4 w-4 text-in-progress" />;
    case "time_logged":
      return <Clock className="h-4 w-4 text-accent" />;
    case "comment_added":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "user_registered":
    case "member_joined":
      return <UserPlus className="h-4 w-4 text-accent" />;
    case "user_login":
      return <UserPlus className="h-4 w-4 text-completed" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  }
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Poll every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    const result = await api.activities.getAll({ limit: 10 });

    if (result.success && result.data) {
      setActivities(result.data as ActivityWithUser[]);
    }
    setLoading(false);
  };

  const formatTimestamp = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
    } catch {
      return "hace un momento";
    }
  };

  return (
    <Card className="card-warm p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Actividad Reciente
      </h3>

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">Cargando...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <p>No hay actividad reciente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 animate-slide-up">
              <Avatar className="h-9 w-9 border-2 border-background">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(activity.username || "??").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.activity_type)}
                  <p className="text-sm">
                    <span className="font-medium text-foreground">
                      {activity.username || "Usuario"}
                    </span>
                    {" "}
                    <span className="text-muted-foreground">{activity.title}</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4 italic">
          Tu equipo está activo
        </p>
      )}
    </Card>
  );
}
