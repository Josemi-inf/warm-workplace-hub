import { useState, useEffect } from "react";
import { LogOut, Home, ListTodo, BarChart3, Settings, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewType = "home" | "tasks" | "stats" | "channel" | "settings";

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

function NavItem({ icon, label, active, onClick, collapsed }: NavItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
        "hover:bg-accent/50",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function AppSidebar({ currentView, onViewChange, collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const storedUser = api.auth.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      return;
    }

    const result = await api.auth.getSession();
    if (result.success && result.data) {
      setUser(result.data);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    navigate("/auth");
  };

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: "home" as ViewType, icon: <Home className="w-5 h-5" />, label: "Inicio" },
    { id: "tasks" as ViewType, icon: <ListTodo className="w-5 h-5" />, label: "Tareas" },
    { id: "stats" as ViewType, icon: <BarChart3 className="w-5 h-5" />, label: "Estadisticas" },
  ];

  const communicationItems = [
    { id: "channel" as ViewType, icon: <MessageSquare className="w-5 h-5" />, label: "Mensajes" },
  ];

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "h-screen flex flex-col bg-card border-r border-border/50 transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-border/50 px-4",
          collapsed && "justify-center px-2"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-semibold text-foreground truncate">Inficon Global</h1>
                <p className="text-xs text-muted-foreground truncate">Espacio de trabajo</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Principal
              </p>
            )}
            {navItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => onViewChange(item.id)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <Separator className="my-4" />

          {/* Communication */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comunicacion
              </p>
            )}
            {communicationItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => onViewChange(item.id)}
                collapsed={collapsed}
              />
            ))}
          </div>

          {/* Admin Settings */}
          {isAdmin && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                {!collapsed && (
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administracion
                  </p>
                )}
                <NavItem
                  icon={<Settings className="w-5 h-5" />}
                  label="Configuracion"
                  active={currentView === "settings"}
                  onClick={() => onViewChange("settings")}
                  collapsed={collapsed}
                />
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/50 space-y-3">
          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={cn(
                "w-full justify-center text-muted-foreground hover:text-foreground",
                !collapsed && "justify-start"
              )}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  <span className="text-xs">Colapsar</span>
                </>
              )}
            </Button>
          )}

          {/* User Profile */}
          {user && (
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-lg bg-accent/30",
              collapsed && "justify-center p-2"
            )}>
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Cerrar sesion</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
