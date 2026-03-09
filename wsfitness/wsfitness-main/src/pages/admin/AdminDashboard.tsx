import { useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAdminRealtimeSync } from '@/hooks/useRealtimeSubscription';

// Gymdesk-style components
import { DashboardStatCards } from '@/components/admin/DashboardStatCards';
import { MembershipGrowthChart } from '@/components/admin/MembershipGrowthChart';
import { RecentActivityFeed } from '@/components/admin/RecentActivityFeed';
import { TodaysClassesWidget } from '@/components/admin/TodaysClassesWidget';
import { ScheduledDayPasses } from '@/components/admin/ScheduledDayPasses';


export default function AdminDashboard() {
  const { role } = useAuth();
  const isAdminOrIT = role === 'admin' || role === 'it_admin';

  // Real-time subscription for automatic dashboard updates
  useAdminRealtimeSync();

  useEffect(() => {
    document.title = 'Dashboard | GymFlow';
  }, []);

  // Admin-only Gymdesk-style dashboard
  if (isAdminOrIT) {
    return (
      <GymLayout 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening today."
      >
        <div className="space-y-6">
          {/* Stat Cards Row */}
          <DashboardStatCards />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Membership Growth Chart - Takes 2 columns */}
            <div className="lg:col-span-2">
              <MembershipGrowthChart />
            </div>

            {/* Recent Activity Feed - Takes 1 column */}
            <div className="lg:col-span-1">
              <RecentActivityFeed />
            </div>
          </div>

          {/* Today's Classes & Scheduled Day Passes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TodaysClassesWidget />
            <ScheduledDayPasses />
          </div>
        </div>
      </GymLayout>
    );
  }

  // Non-admin view (Coach/Staff) - PRESERVED EXACTLY
  return (
    <AppLayout title="DASHBOARD">
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Your account role is not set yet — showing safe default view.
          </p>
        </header>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
          <div className="grid gap-3">
            <Link to="/coach/dashboard" className="block">
              <Card className="bg-card hover:bg-muted/40 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-secondary" />
                    Coaching Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">View coaching stats and recent activity</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
