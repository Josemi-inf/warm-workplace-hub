import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Activity } from "@/types/database";
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
      return <ListTodo className="h-4 w-4 text-indigo-600" />;
    case "subtask_started":
      return <Play className="h-4 w-4 text-indigo-600" />;
    case "time_logged":
      return <Clock className="h-4 w-4 text-indigo-600" />;
    case "comment_added":
      return <MessageCircle className="h-4 w-4 text-indigo-600" />;
    case "user_registered":
    case "member_joined":
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case "user_login":
      return <UserPlus className="h-4 w-4 text-indigo-600" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-slate-400" />;
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
    <div className="p-5 bg-white rounded-lg border border-slate-200 h-fit animate-fade-in-up card-hover">
      <div className="flex items-center gap-2 mb-4">
        <ActivityIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-base font-semibold text-slate-900">
          Actividad Reciente
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-shimmer rounded-lg p-2">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm animate-fade-in">
          No hay actividad reciente
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 transition-all duration-200 hover:bg-slate-50 rounded-lg p-2 -mx-2"
            >
              <Avatar className="h-8 w-8 flex-shrink-0 transition-transform duration-200 hover:scale-110">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600 font-medium">
                  {(activity.username || "??").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <p className="text-sm leading-snug">
                    <span className="font-medium text-slate-900">
                      {activity.username || "Usuario"}
                    </span>
                    {" "}
                    <span className="text-slate-500">{activity.title}</span>
                  </p>
                </div>
                <p className="text-xs text-slate-400 pl-6">
                  {formatTimestamp(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
