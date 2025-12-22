import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import type { SafeUser } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, ArrowLeft, Search, MessageCircle, Trash2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ChatParticipant {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message: ChatMessage | null;
  unread_count: number;
}

export function ChatsView() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      await fetchCurrentUser();
      await initGlobalChat();
      await fetchChats();
      await fetchUsers();
    };
    init();

    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (selectedChat) {
        fetchMessages(selectedChat.id, true);
      }
      fetchChats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCurrentUser = async () => {
    const result = await api.auth.getSession();
    if (result.success && result.data) {
      setCurrentUser(result.data);
    }
  };

  const initGlobalChat = async () => {
    // Initialize global chat if it doesn't exist
    await api.chats.initGlobal();
  };

  const fetchChats = async () => {
    const result = await api.chats.getAll();
    if (result.success && result.data) {
      setChats(result.data);
    }
    setLoading(false);
  };

  const fetchMessages = async (chatId: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    const result = await api.chats.getMessages(chatId);
    if (result.success && result.data) {
      setMessages(result.data);
    }
    if (!silent) setMessagesLoading(false);
  };

  const fetchUsers = async () => {
    const result = await api.users.getAll();
    if (result.success && result.data) {
      setUsers(result.data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;

    const result = await api.chats.sendMessage(selectedChat.id, newMessage.trim());
    if (result.success && result.data) {
      setMessages([...messages, result.data]);
      setNewMessage("");
      fetchChats();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un usuario",
        variant: "destructive",
      });
      return;
    }

    const result = await api.chats.create({
      participant_ids: selectedUsers,
      is_group: selectedUsers.length > 1,
    });

    if (result.success && result.data) {
      setCreateChatOpen(false);
      setSelectedUsers([]);
      fetchChats();
      setSelectedChat(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo crear el chat",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("¿Estás seguro de que quieres eliminar este chat?")) {
      return;
    }

    const result = await api.chats.delete(chatId);
    if (result.success) {
      toast({
        title: "Chat eliminado",
        description: "El chat se ha eliminado correctamente.",
      });
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
      fetchChats();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar el chat",
        variant: "destructive",
      });
    }
  };

  const canDeleteChat = (chat: Chat) => {
    if (!currentUser) return false;
    // Admin can delete any chat except global
    if (currentUser.role === 'admin') {
      return !(chat.name === 'Inficon Global' && chat.is_group);
    }
    // Creator can delete their own chats except global
    if (chat.created_by === currentUser.id) {
      return !(chat.name === 'Inficon Global' && chat.is_group);
    }
    return false;
  };

  const isGlobalChat = (chat: Chat) => {
    return chat.name === 'Inficon Global' && chat.is_group;
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (!chat.is_group && chat.participants) {
      const otherParticipant = chat.participants.find(p => p.id !== currentUser?.id);
      return otherParticipant?.username || "Chat";
    }
    return chat.participants?.map(p => p.username).join(", ") || "Chat";
  };

  const getChatInitials = (chat: Chat) => {
    const name = getChatName(chat);
    return name.slice(0, 2).toUpperCase();
  };

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
    } catch {
      return "";
    }
  };

  const filteredUsers = users.filter(
    u => u.id !== currentUser?.id &&
    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 animate-fade-in">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-indigo-300 animate-pulse" />
          <p>Cargando chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Chat List */}
      <div className={cn(
        "w-80 border-r border-slate-200 flex flex-col bg-slate-50",
        selectedChat && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
            <Button size="sm" onClick={() => setCreateChatOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 hover-lift">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-slate-500 animate-fade-in">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-indigo-200 animate-float" />
              <p className="text-sm">No tienes chats</p>
              <p className="text-xs mt-1">Crea uno para empezar a chatear</p>
            </div>
          ) : (
            <div className="p-2 stagger-children">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-all duration-200 flex items-start gap-3 cursor-pointer group",
                    selectedChat?.id === chat.id
                      ? "bg-indigo-50 border border-indigo-200"
                      : "hover:bg-slate-100 hover:scale-[1.01]"
                  )}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 transition-transform duration-200 hover:scale-110",
                    isGlobalChat(chat) ? "bg-green-600" : "bg-indigo-600"
                  )}>
                    {isGlobalChat(chat) ? <Globe className="w-5 h-5" /> : getChatInitials(chat)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 truncate text-sm flex items-center gap-1">
                        {getChatName(chat)}
                        {isGlobalChat(chat) && (
                          <span className="text-xs text-green-600 font-normal">(Global)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1">
                        {chat.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center animate-pulse-glow">
                            {chat.unread_count}
                          </span>
                        )}
                        {canDeleteChat(chat) && (
                          <button
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Eliminar chat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {chat.last_message && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {chat.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Messages */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedChat && "hidden md:flex"
      )}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-200 bg-white">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-1 hover:bg-slate-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium",
                isGlobalChat(selectedChat) ? "bg-green-600" : "bg-indigo-600"
              )}>
                {isGlobalChat(selectedChat) ? <Globe className="w-5 h-5" /> : getChatInitials(selectedChat)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 text-sm flex items-center gap-1">
                  {getChatName(selectedChat)}
                  {isGlobalChat(selectedChat) && (
                    <span className="text-xs text-green-600 font-normal">(Global)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedChat.participants?.length || 0} participante{selectedChat.participants?.length !== 1 ? 's' : ''}
                </p>
              </div>
              {canDeleteChat(selectedChat) && (
                <button
                  onClick={(e) => handleDeleteChat(selectedChat.id, e)}
                  className="p-2 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-all duration-200"
                  title="Eliminar chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-slate-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No hay mensajes. Envia el primero.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => {
                    const isOwn = message.user_id === currentUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex animate-message-pop",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-md",
                            isOwn
                              ? "bg-indigo-600 text-white"
                              : "bg-white border border-slate-200 text-slate-900"
                          )}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium text-indigo-600 mb-1">
                              {message.username}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-indigo-200" : "text-slate-400"
                          )}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                />
                <Button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 hover-lift">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 animate-fade-in">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-indigo-200 animate-float" />
              <p>Selecciona un chat para empezar</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat Dialog */}
      <Dialog open={createChatOpen} onOpenChange={setCreateChatOpen}>
        <DialogContent className="sm:max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Crear Chat</DialogTitle>
            <DialogDescription className="text-slate-500">
              Selecciona los usuarios con los que quieres chatear
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-slate-200 focus:border-indigo-300"
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2 stagger-children">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-all duration-200"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium transition-transform duration-200 hover:scale-110">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateChatOpen(false); setSelectedUsers([]); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateChat} disabled={selectedUsers.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              Crear Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
