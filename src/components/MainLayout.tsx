import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TextChannel } from "./TextChannel";

interface Channel {
  id: string;
  name: string;
  type: "voice" | "text";
  description: string | null;
}

interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          onChannelSelect={setSelectedChannel} 
          selectedChannel={selectedChannel}
        />
        <main className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border/50 px-4 bg-card/30">
            <SidebarTrigger className="mr-2" />
            <span className="text-sm text-muted-foreground">
              {selectedChannel ? `#${selectedChannel.name}` : "Selecciona un canal"}
            </span>
          </header>
          <div className="flex-1 overflow-hidden">
            {selectedChannel?.type === "text" ? (
              <TextChannel 
                channelId={selectedChannel.id} 
                channelName={selectedChannel.name} 
              />
            ) : children ? (
              children
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Selecciona un canal de texto para empezar a chatear</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
