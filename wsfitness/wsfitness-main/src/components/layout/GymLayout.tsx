import { ReactNode, useEffect, useState } from 'react';
import { GymSidebar } from './GymSidebar';
import { AdminBottomNav } from './AdminBottomNav';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Search, Bell, LogOut, User, Settings, Check, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

interface GymLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function GymLayout({ children, title, subtitle }: GymLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-refresh every 10 minutes if user is idle for 1 minute
  useAutoRefresh({ intervalMs: 10 * 60 * 1000, idleThresholdMs: 60 * 1000 });

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setUserName(data.name || '');
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchUser();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getRoleLabel = () => {
    if (role === 'it_admin') return 'IT Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'coach') return 'Coach';
    return 'User';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Hidden on mobile */}
      {!isMobile && (
        <GymSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ${isMobile ? 'ml-0 pb-20' : sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo (mobile) or Title (desktop) */}
            {isMobile ? (
              <div className="flex items-center gap-3">
                <img 
                  src={wsfitnessLogo} 
                  alt="WS Fitness" 
                  className="h-9 w-9 rounded-xl object-cover"
                />
                <div>
                  <h1 className="text-lg font-display font-bold tracking-wide text-foreground">
                    {title || 'Dashboard'}
                  </h1>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-display font-bold tracking-wide text-foreground">
                  {title || 'Dashboard'}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}


            {/* Right - Notifications & Profile */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-card border-border/30">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs text-primary"
                        onClick={markAllAsRead}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                            !notification.is_read ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              navigate(notification.link);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm text-foreground flex-1">
                              {notification.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                            {notification.message}
                          </p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8 md:h-10 md:w-10">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                        {userName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{userName || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
                      </div>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border/30">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-foreground">{userName || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem 
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile only */}
      {isMobile && <AdminBottomNav />}
    </div>
  );
}
