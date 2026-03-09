import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell, Loader2 } from 'lucide-react';
import { getPortalRouteForRoles } from '@/lib/portalRouting';

const Landing = lazy(() => import('./Landing'));

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const redirectBasedOnRole = async () => {
      if (loading) return;

      // If not logged in, stay on page — Landing will render
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roleList = roles?.map((r) => r.role) || [];
      const target = getPortalRouteForRoles(roleList, { fallbackToAdmin: true });
      navigate(target, { replace: true });
    };

    redirectBasedOnRole();
  }, [user, loading, navigate]);

  // Show landing page for visitors
  if (!loading && !user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <Landing />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-opacity duration-300 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="p-4 rounded-2xl bg-gradient-neon glow-lg">
          <Dumbbell className="h-12 w-12 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-display text-gradient">WS FITNESS</h1>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}