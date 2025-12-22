import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Activity } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, MessageCircle, UserPlus, Clock, ListTodo, Play, Activity as ActivityIcon } from "lucide-react";
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
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "task_created":
    case "subtask_created":
      return <ListTodo className="h-4 w-4 text-primary" />;
    case "subtask_started":
      return <Play className="h-4 w-4 text-amber-500" />;
    case "time_logged":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "comment_added":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "user_registered":
    case "member_joined":
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case "user_login":
      return <UserPlus className="h-4 w-4 text-blue-500" />;
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
    <Card className="p-6 bg-card border-border/50 h-fit">
      <div className="flex items-center gap-2 mb-5">
        <ActivityIcon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Actividad Reciente
        </h3>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay actividad reciente
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {(activity.username || "??").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <p className="text-sm leading-snug">
                    <span className="font-medium text-foreground">
                      {activity.username || "Usuario"}
                    </span>
                    {" "}
                    <span className="text-muted-foreground">{activity.title}</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  {formatTimestamp(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
