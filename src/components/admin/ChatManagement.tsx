import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatUser {
  id: string;
  full_name: string;
  unread_count: number;
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
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!adminId) return;
    fetchChatUsers();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, selectedUser]);

  const fetchChatUsers = async () => {
    if (!adminId) return;

    try {
      // Get all unique users who have chatted with admin
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, is_read')
        .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`);

      if (chatError) throw chatError;

      // Get unique user IDs (excluding admin)
      const userIds = new Set<string>();
      const unreadCounts: Record<string, number> = {};

      chatData?.forEach(msg => {
        const otherId = msg.sender_id === adminId ? msg.receiver_id : msg.sender_id;
        userIds.add(otherId);
        
        if (msg.sender_id !== adminId && !msg.is_read) {
          unreadCounts[otherId] = (unreadCounts[otherId] || 0) + 1;
        }
      });

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      const chatUsers = profiles?.map(p => ({
        id: p.id,
        full_name: p.full_name,
        unread_count: unreadCounts[p.id] || 0,
      })) || [];

      setUsers(chatUsers.sort((a, b) => b.unread_count - a.unread_count));
    } catch (error) {
      console.error('Error fetching chat users:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (user: ChatUser) => {
    setSelectedUser(user);
    await fetchMessages(user.id);
    
    // Mark messages as read
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

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Users list */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversations yet</p>
            ) : (
              <div className="space-y-1 p-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left flex items-center justify-between hover:bg-muted transition-colors",
                      selectedUser?.id === user.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-8 w-8 p-1.5 bg-primary/10 rounded-full" />
                      <span className="font-medium">{user.full_name}</span>
                    </div>
                    {user.unread_count > 0 && (
                      <Badge variant="destructive">{user.unread_count}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="md:col-span-2 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">
            {selectedUser ? `Chat with ${selectedUser.full_name}` : 'Select a conversation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {selectedUser ? (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[80%] p-3 rounded-lg",
                        msg.sender_id === adminId
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a user to start chatting
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
