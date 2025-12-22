import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnlineStatus {
  online: SafeUser[];
  offline: SafeUser[];
}

function StatusIndicator({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5",
        status === "online" && "bg-green-500",
        status === "busy" && "bg-red-500",
        status === "away" && "bg-yellow-500",
        status === "offline" && "bg-slate-300"
      )}
    />
  );
}

function UserItem({ user }: { user: SafeUser }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <StatusIndicator status={user.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
        <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
      </div>
    </div>
  );
}

export function OnlineUsersDropdown() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<OnlineStatus>({ online: [], offline: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    const result = await api.users.getOnlineStatus();
    if (result.success && result.data) {
      setUsers(result.data);
    }
    setLoading(false);
  };

  const onlineCount = users.online.length;
  const totalCount = users.online.length + users.offline.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900">
          <div className="relative">
            <Users className="w-5 h-5" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-medium">
                {onlineCount > 9 ? "9+" : onlineCount}
              </span>
            )}
          </div>
          <span className="text-sm hidden sm:inline">
            {onlineCount} en linea
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Usuarios</h3>
          <p className="text-xs text-slate-500">
            {onlineCount} de {totalCount} en linea
          </p>
        </div>

        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Cargando...
            </div>
          ) : (
            <div className="p-2">
              {/* Online Users */}
              {users.online.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-xs font-medium text-green-600 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    En linea - {users.online.length}
                  </p>
                  <div className="mt-1">
                    {users.online.map((user) => (
                      <UserItem key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {users.online.length > 0 && users.offline.length > 0 && (
                <DropdownMenuSeparator className="my-2" />
              )}

              {/* Offline Users */}
              {users.offline.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    Desconectados - {users.offline.length}
                  </p>
                  <div className="mt-1 opacity-60">
                    {users.offline.map((user) => (
                      <UserItem key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {users.online.length === 0 && users.offline.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No hay usuarios
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
