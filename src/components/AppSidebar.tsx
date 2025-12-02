import { useState, useEffect } from "react";
import { Hash, Volume2, ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  name: string;
  type: "voice" | "text";
  description: string | null;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface AppSidebarProps {
  onChannelSelect: (channel: Channel) => void;
  selectedChannel: Channel | null;
}

export function AppSidebar({ onChannelSelect, selectedChannel }: AppSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, Profile[]>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    fetchProfile();
    fetchVoiceParticipants();

    const voiceChannel = supabase
      .channel('voice-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_participants'
      }, () => {
        fetchVoiceParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(voiceChannel);
    };
  }, []);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setChannels(data as Channel[]);
      if (!selectedChannel && data.length > 0) {
        const textChannel = data.find(c => c.type === 'text');
        if (textChannel) onChannelSelect(textChannel as Channel);
      }
    }
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) setProfile(data as Profile);
    }
  };

  const fetchVoiceParticipants = async () => {
    const { data, error } = await supabase
      .from('voice_participants')
      .select(`
        channel_id,
        profiles:user_id (
          id,
          username,
          avatar_url,
          status
        )
      `);
    
    if (!error && data) {
      const grouped: Record<string, Profile[]> = {};
      data.forEach((item: any) => {
        if (!grouped[item.channel_id]) {
          grouped[item.channel_id] = [];
        }
        if (item.profiles) {
          grouped[item.channel_id].push(item.profiles as Profile);
        }
      });
      setVoiceParticipants(grouped);
    }
  };

  const handleVoiceJoin = async (channel: Channel) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Leave any current voice channel first
    await supabase
      .from('voice_participants')
      .delete()
      .eq('user_id', user.id);

    // Join new channel
    const { error } = await supabase
      .from('voice_participants')
      .insert({ channel_id: channel.id, user_id: user.id });

    if (!error) {
      toast({
        title: `Te uniste a ${channel.name}`,
        description: "Conectado al canal de voz 🎙️",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-xl">🏢</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Inficon</h2>
            <p className="text-xs text-muted-foreground">Espacio de trabajo</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
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
                        onClick={() => onChannelSelect(channel)}
                        isActive={selectedChannel?.id === channel.id}
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
                        className="transition-all duration-200"
                      >
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
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
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        {profile && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{profile.username}</span>
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
