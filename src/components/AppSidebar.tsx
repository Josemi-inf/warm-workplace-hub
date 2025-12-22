import { useState, useEffect } from "react";
import { LogOut, Home, ListTodo, BarChart3, Settings, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { cn } from "@/lib/utils";

type ViewType = "home" | "tasks" | "stats" | "chats" | "settings";

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-white/10 text-white font-medium"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
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
  const isManager = user?.role === 'manager';
  const canViewStats = isAdmin || isManager;

  const navItems = [
    { id: "home" as ViewType, icon: <Home className="w-5 h-5" />, label: "Inicio" },
    { id: "tasks" as ViewType, icon: <ListTodo className="w-5 h-5" />, label: "Tareas" },
    { id: "chats" as ViewType, icon: <MessageCircle className="w-5 h-5" />, label: "Chats" },
    ...(canViewStats ? [{ id: "stats" as ViewType, icon: <BarChart3 className="w-5 h-5" />, label: "Estadisticas" }] : []),
  ];

  return (
    <aside className="w-60 h-screen flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-semibold text-white text-sm">Inficon Global</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-800" />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Configuracion"
              active={currentView === "settings"}
              onClick={() => onViewChange("settings")}
            />
          </>
        )}
      </nav>

      {/* User */}
      {user && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Cerrar sesion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
