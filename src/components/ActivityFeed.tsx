import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, MessageCircle, UserPlus } from "lucide-react";

interface Activity {
  id: string;
  type: "task_completed" | "message" | "user_joined";
  user: string;
  avatar?: string;
  description: string;
  timestamp: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "task_completed",
    user: "María González",
    description: "completó 'Revisión de diseño UI'",
    timestamp: "Hace 5 min",
  },
  {
    id: "2",
    type: "message",
    user: "Carlos Ruiz",
    description: "comentó en 'Integración API'",
    timestamp: "Hace 12 min",
  },
  {
    id: "3",
    type: "user_joined",
    user: "Ana Torres",
    description: "se unió al equipo",
    timestamp: "Hace 1 hora",
  },
];

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "task_completed":
      return <CheckCircle2 className="h-4 w-4 text-completed" />;
    case "message":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "user_joined":
      return <UserPlus className="h-4 w-4 text-accent" />;
  }
};

export function ActivityFeed() {
  return (
    <Card className="card-warm p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Actividad Reciente
      </h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 animate-slide-up">
            <Avatar className="h-9 w-9 border-2 border-background">
              <AvatarImage src={activity.avatar} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {activity.user.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {getActivityIcon(activity.type)}
                <p className="text-sm">
                  <span className="font-medium text-foreground">{activity.user}</span>
                  {" "}
                  <span className="text-muted-foreground">{activity.description}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4 italic">
        Tu equipo está activo hoy 💪
      </p>
    </Card>
  );
}
