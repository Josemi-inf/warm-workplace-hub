import { useState, useEffect } from "react";
import { Hash, Volume2, ChevronDown, ChevronRight, LogOut, PhoneOff, Home, ListTodo, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { Channel, SafeUser } from "@/types/database";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

type ViewType = "home" | "tasks" | "stats" | "channel";

interface AppSidebarProps {
  onChannelSelect: (channel: Channel) => void;
  selectedChannel: Channel | null;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function AppSidebar({ onChannelSelect, selectedChannel, currentView, onViewChange }: AppSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, SafeUser[]>>({});
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    fetchUser();
    // Note: Voice participants would need WebSocket or polling for real-time updates
  }, []);

  const fetchChannels = async () => {
    const result = await api.channels.getAll();

    if (result.success && result.data) {
      setChannels(result.data);
      if (!selectedChannel && result.data.length > 0) {
        const textChannel = result.data.find(c => c.type === 'text');
        if (textChannel) onChannelSelect(textChannel);
      }
    }
  };

  const fetchUser = async () => {
    // First try to get from localStorage
    const storedUser = api.auth.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      return;
    }

    // Otherwise fetch from API
    const result = await api.auth.getSession();
    if (result.success && result.data) {
      setUser(result.data);
    }
  };

  const handleVoiceJoin = async (channel: Channel) => {
    // TODO: Implement voice channel joining via API
    setCurrentVoiceChannel(channel.id);
    toast({
      title: `Te uniste a ${channel.name}`,
      description: "Conectado al canal de voz",
    });
  };

  const handleVoiceLeave = async () => {
    // TODO: Implement voice channel leaving via API
    setCurrentVoiceChannel(null);
    toast({
      title: "Desconectado",
      description: "Has salido del canal de voz",
    });
  };

  const handleLogout = async () => {
    await api.auth.logout();
    navigate("/auth");
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/0 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Inficon Global" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Inficon Global</h3>
            <p className="text-xs text-muted-foreground">Espacio de trabajo</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>NAVEGACIÓN</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("home")}
                  isActive={currentView === "home"}
                >
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <span>Inicio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("tasks")}
                  isActive={currentView === "tasks"}
                >
                  <ListTodo className="w-4 h-4 text-muted-foreground" />
                  <span>Tareas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("stats")}
                  isActive={currentView === "stats"}
                >
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span>Estadísticas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Text Channels */}
        <Collapsible open={textOpen} onOpenChange={setTextOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                {textOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                CANALES DE TEXTO
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {textChannels.map((channel) => (
                    <SidebarMenuItem key={channel.id}>
                      <SidebarMenuButton
                        onClick={() => {
                          onChannelSelect(channel);
                          onViewChange("channel");
                        }}
                        isActive={selectedChannel?.id === channel.id && currentView === "channel"}
                        className="transition-all duration-200"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span>{channel.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Voice Channels */}
        <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                {voiceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                CANALES DE VOZ
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {voiceChannels.map((channel) => (
                    <SidebarMenuItem key={channel.id}>
                      <SidebarMenuButton
                        onClick={() => handleVoiceJoin(channel)}
                        className={`transition-all duration-200 ${currentVoiceChannel === channel.id ? 'bg-primary/10' : ''}`}
                      >
                        <Volume2 className={`w-4 h-4 ${currentVoiceChannel === channel.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>{channel.name}</span>
                      </SidebarMenuButton>
                      {/* Show participants in voice channel */}
                      {voiceParticipants[channel.id]?.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {voiceParticipants[channel.id].map((participant) => (
                            <div key={participant.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-[10px] bg-primary/10">
                                  {participant.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{participant.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {/* Leave voice channel button */}
                  {currentVoiceChannel && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={handleVoiceLeave}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>Salir del canal</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{user.username}</span>
                <span className="text-xs text-completed">● En línea</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
