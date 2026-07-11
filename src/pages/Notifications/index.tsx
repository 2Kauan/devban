import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification } from '@/types/database';
import { Bell, Check, Trash2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error('Erro ao buscar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      toast.error('Erro ao marcar como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar como lidas');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      toast.error('Erro ao excluir notificação');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar projects={[]} onProjectCreated={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
          <TopHeader title="Notificações" onOpenSidebar={() => setIsSidebarOpen(true)} />
          <div className="flex-1 p-8 bg-muted/10 h-full overflow-y-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={[]} onProjectCreated={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <TopHeader title="Notificações" onOpenSidebar={() => setIsSidebarOpen(true)} />
        <div className="flex-1 p-4 sm:p-8 bg-muted/10 h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notificações
            </h1>
            <p className="text-muted-foreground mt-1">
              Você tem {unreadCount} {unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Nenhuma notificação</h3>
              <p className="text-muted-foreground mt-1">Quando algo importante acontecer, avisaremos você aqui.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-card border ${notification.is_read ? 'border-border' : 'border-primary/50'} rounded-xl p-5 flex items-start gap-4 transition-all hover:shadow-md group`}
              >
                <div className={`mt-1 p-2 rounded-full ${notification.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                  <Bell className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h4 className={`font-semibold ${notification.is_read ? 'text-foreground/80' : 'text-foreground'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    {notification.link && (
                      <Link
                        to={notification.link}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Visualizar
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Marcar como lida"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </main>
  </div>
  );
}
