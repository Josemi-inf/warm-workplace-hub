import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Hash } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface TextChannelProps {
  channelId: string;
  channelName: string;
}

export function TextChannel({ channelId, channelName }: TextChannelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`messages-${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as unknown as Message[]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: newMessage.trim()
        });

      if (!error) {
        setNewMessage("");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channelName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground">¡Bienvenido a #{channelName}!</h3>
            <p className="text-muted-foreground mt-1">Este es el inicio del canal. Sé el primero en escribir algo 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 group hover:bg-muted/30 p-2 rounded-lg transition-colors">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {message.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground">
                    {message.profiles?.username || "Usuario"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), "d MMM, HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-foreground/90 break-words">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-border/50 bg-card/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Escribe en #${channelName}...`}
            className="flex-1 bg-background"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
