import { Menu, Bell } from 'lucide-react';
import { UserProfileButton } from '@/components/ui/UserProfileButton';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase, createUniqueChannel } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TopHeaderProps {
  title: string;
  onOpenSidebar: () => void;
}

export function TopHeader({ title, onOpenSidebar }: TopHeaderProps) {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadNotifications(count || 0);
    };

    fetchUnreadCount();

    const channel = createUniqueChannel(`topheader_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 sm:px-6 bg-background/50 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-4">
        <button 
          className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors" 
          onClick={onOpenSidebar}
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{title}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Link 
          to="/notifications" 
          className="relative p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </Link>
        <UserProfileButton />
      </div>
    </header>
  );
}
