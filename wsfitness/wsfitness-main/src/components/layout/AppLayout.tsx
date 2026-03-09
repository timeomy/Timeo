import { ReactNode, useEffect, useState } from 'react';
import { MobileNav } from './MobileNav';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, role  } = useAuth();
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.name) {
        setUserName(data.name);
      }
    };
    fetchUserName();
  }, [user]);

  const getRoleLabel = () => {
    if (role === 'it_admin') return 'IT Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'coach') return 'Coach';
    return '';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS-style Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-8 w-8 rounded" />
            <h1 className="text-lg font-semibold tracking-wide text-foreground">
              {title || 'WS FITNESS'}
            </h1>
          </div>
          {userName && (
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Hi, {userName.split(' ')[0]}!</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}