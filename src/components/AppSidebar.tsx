import { useState, useEffect } from "react";
import {
  LogOut,
  Home,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Circle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { SafeUser, ServiceWithProjects, ProjectWithCounts } from "@/types/database";
import { cn } from "@/lib/utils";

type ViewType = "home" | "tasks" | "stats" | "chats" | "settings";

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  selectedServiceId?: string | null;
  selectedProjectId?: string | null;
  onServiceSelect?: (serviceId: string | null) => void;
  onProjectSelect?: (projectId: string | null, serviceId: string | null) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
        active
          ? "bg-white/10 text-white font-medium"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

interface ServiceItemProps {
  service: ServiceWithProjects;
  isExpanded: boolean;
  isSelected: boolean;
  selectedProjectId?: string | null;
  onToggle: () => void;
  onSelect: () => void;
  onProjectSelect: (projectId: string) => void;
}

function ServiceItem({
  service,
  isExpanded,
  isSelected,
  selectedProjectId,
  onToggle,
  onSelect,
  onProjectSelect
}: ServiceItemProps) {
  const hasProjects = service.projects && service.projects.length > 0;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => {
          if (hasProjects) {
            onToggle();
          }
          onSelect();
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 group",
          isSelected && !selectedProjectId
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
      >
        {hasProjects ? (
          <span className="w-4 h-4 flex items-center justify-center transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4" style={{ color: service.color }} />
        ) : (
          <Folder className="w-4 h-4" style={{ color: service.color }} />
        )}
        <span className="flex-1 text-left truncate">{service.name}</span>
        {service.project_count > 0 && (
          <span className="text-xs text-slate-500 group-hover:text-slate-400">
            {service.project_count}
          </span>
        )}
      </button>

      {/* Projects */}
      {isExpanded && hasProjects && (
        <div className="ml-4 mt-0.5 space-y-0.5 animate-expand-in">
          {service.projects!.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isSelected={selectedProjectId === project.id}
              onSelect={() => onProjectSelect(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectItemProps {
  project: ProjectWithCounts;
  isSelected: boolean;
  onSelect: () => void;
}

function ProjectItem({ project, isSelected, onSelect }: ProjectItemProps) {
  const pendingTasks = project.task_count - project.completed_tasks;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 group",
        isSelected
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <Circle
        className="w-2.5 h-2.5"
        style={{ color: project.color, fill: project.color }}
      />
      <span className="flex-1 text-left truncate">{project.name}</span>
      {pendingTasks > 0 && (
        <span className="text-xs text-slate-500 group-hover:text-slate-400">
          {pendingTasks}
        </span>
      )}
    </button>
  );
}

export function AppSidebar({
  currentView,
  onViewChange,
  selectedServiceId,
  selectedProjectId,
  onServiceSelect,
  onProjectSelect
}: AppSidebarProps) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [services, setServices] = useState<ServiceWithProjects[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('sidebar_expanded_services');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [servicesExpanded, setServicesExpanded] = useState(() => {
    return localStorage.getItem('sidebar_services_expanded') !== 'false';
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchServices();
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_expanded_services', JSON.stringify([...expandedServices]));
  }, [expandedServices]);

  useEffect(() => {
    localStorage.setItem('sidebar_services_expanded', String(servicesExpanded));
  }, [servicesExpanded]);

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

  const fetchServices = async () => {
    const result = await api.services.getAll();
    if (result.success && result.data) {
      // Fetch projects for each service
      const servicesWithProjects = await Promise.all(
        result.data.map(async (service) => {
          const projectsResult = await api.services.getProjects(service.id);
          return {
            ...service,
            projects: projectsResult.success ? projectsResult.data : [],
          };
        })
      );
      setServices(servicesWithProjects);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    navigate("/auth");
  };

  const toggleServiceExpanded = (serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleServiceSelect = (serviceId: string) => {
    if (onServiceSelect) {
      onServiceSelect(serviceId);
    }
    onViewChange("tasks");
  };

  const handleProjectSelect = (projectId: string, serviceId: string) => {
    if (onProjectSelect) {
      onProjectSelect(projectId, serviceId);
    }
    onViewChange("tasks");
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canViewStats = isAdmin || isManager;
  const canManageServices = isAdmin || isManager;

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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <NavItem
          icon={<Home className="w-5 h-5" />}
          label="Inicio"
          active={currentView === "home"}
          onClick={() => {
            onViewChange("home");
            if (onServiceSelect) onServiceSelect(null);
            if (onProjectSelect) onProjectSelect(null, null);
          }}
        />

        {/* Services Section */}
        <div className="pt-4">
          <button
            onClick={() => setServicesExpanded(!servicesExpanded)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
          >
            {servicesExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Servicios</span>
            {canManageServices && (
              <Plus
                className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 hover:text-white transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open create service dialog
                }}
              />
            )}
          </button>

          {servicesExpanded && (
            <div className="mt-1 space-y-0.5">
              {services.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-600">Sin servicios</p>
              ) : (
                services.map((service) => (
                  <ServiceItem
                    key={service.id}
                    service={service}
                    isExpanded={expandedServices.has(service.id)}
                    isSelected={selectedServiceId === service.id}
                    selectedProjectId={selectedProjectId}
                    onToggle={() => toggleServiceExpanded(service.id)}
                    onSelect={() => handleServiceSelect(service.id)}
                    onProjectSelect={(projectId) => handleProjectSelect(projectId, service.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        <div className="pt-4">
          <NavItem
            icon={<MessageCircle className="w-5 h-5" />}
            label="Chats"
            active={currentView === "chats"}
            onClick={() => {
              onViewChange("chats");
              if (onServiceSelect) onServiceSelect(null);
              if (onProjectSelect) onProjectSelect(null, null);
            }}
          />
        </div>

        {canViewStats && (
          <NavItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Estadisticas"
            active={currentView === "stats"}
            onClick={() => {
              onViewChange("stats");
              if (onServiceSelect) onServiceSelect(null);
              if (onProjectSelect) onProjectSelect(null, null);
            }}
          />
        )}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-800" />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Configuracion"
              active={currentView === "settings"}
              onClick={() => {
                onViewChange("settings");
                if (onServiceSelect) onServiceSelect(null);
                if (onProjectSelect) onProjectSelect(null, null);
              }}
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
