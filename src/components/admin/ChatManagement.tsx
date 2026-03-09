import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Search, ArrowLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatUser {
  id: string;
  full_name: string;
  unread_count: number;
  last_message: string;
  last_message_time: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const ChatManagement = () => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!adminId) return;
    fetchChatUsers();

    const channel = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.receiver_id === adminId || newMsg.sender_id === adminId) {
            if (selectedUser && (newMsg.sender_id === selectedUser.id || newMsg.receiver_id === selectedUser.id)) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              scrollToBottom();
            }
            fetchChatUsers();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminId, selectedUser]);

  useEffect(() => {
    const filtered = users.filter(u =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, userSearch]);

  const fetchChatUsers = async () => {
    if (!adminId) return;

    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, message, is_read, created_at')
        .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`)
        .order('created_at', { ascending: false });

      if (chatError) throw chatError;

      const userMap: Record<string, { unread: number; lastMsg: string; lastTime: string }> = {};

      chatData?.forEach(msg => {
        const otherId = msg.sender_id === adminId ? msg.receiver_id : msg.sender_id;
        if (!userMap[otherId]) {
          userMap[otherId] = { unread: 0, lastMsg: msg.message, lastTime: msg.created_at };
        }
        if (msg.sender_id !== adminId && !msg.is_read) {
          userMap[otherId].unread++;
        }
      });

      const userIds = Object.keys(userMap);
      if (userIds.length === 0) { setUsers([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const chatUsers: ChatUser[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        unread_count: userMap[p.id]?.unread || 0,
        last_message: userMap[p.id]?.lastMsg || '',
        last_message_time: userMap[p.id]?.lastTime || '',
      }));

      chatUsers.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      setUsers(chatUsers);
    } catch (error) {
      console.error('Error fetching chat users:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (user: ChatUser) => {
    setSelectedUser(user);
    await fetchMessages(user.id);
    if (adminId) {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', user.id)
        .eq('receiver_id', adminId);
      fetchChatUsers();
    }
  };

  const fetchMessages = async (userId: string) => {
    if (!adminId) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminId || !selectedUser) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: adminId,
          receiver_id: selectedUser.id,
          message: newMessage.trim(),
        });
      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 86400000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < oneDay * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const showUserList = !isMobile || !selectedUser;
  const showChat = !isMobile || !!selectedUser;

  return (
    <div className="flex h-[650px] rounded-xl border bg-card overflow-hidden">
      {/* User list */}
      {showUserList && (
        <div className={cn("flex flex-col border-r bg-card", isMobile ? "w-full" : "w-80 min-w-[280px]")}>
          <div className="p-4 border-b space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Conversations
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No conversations</p>
            ) : (
              <div className="py-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={cn(
                      "w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/50",
                      selectedUser?.id === user.id && "bg-muted"
                    )}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {user.last_message_time && formatTime(user.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">{user.last_message}</p>
                        {user.unread_count > 0 && (
                          <Badge className="h-5 min-w-[20px] flex items-center justify-center text-xs rounded-full flex-shrink-0">
                            {user.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      {showChat && (
        <div className="flex-1 flex flex-col min-w-0">
          {selectedUser ? (
            <>
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-card">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{selectedUser.full_name}</h3>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
                  )}
                  {messages.map((msg) => {
                    const isAdmin = msg.sender_id === adminId;
                    return (
                      <div key={msg.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[75%] px-4 py-2.5 rounded-2xl",
                            isAdmin
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isAdmin ? "justify-end" : "justify-start"
                          )}>
                            <span className="text-[10px] opacity-70">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isAdmin && msg.is_read && (
                              <span className="text-[10px] opacity-70">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-3 border-t flex gap-2 bg-card">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full"
                />
                <Button type="submit" size="icon" className="rounded-full h-10 w-10" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageCircle className="h-12 w-12 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
