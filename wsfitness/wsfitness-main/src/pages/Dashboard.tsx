import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Users, ClipboardList, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalClients: number;
  activeClients: number;
  todayLogs: number;
  thisWeekLogs: number;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeClients: 0,
    todayLogs: 0,
    thisWeekLogs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentLogs();
  }, [user, role]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const isAdminOrIT = role === 'admin' || role === 'it_admin';
      
      // Fetch clients
      const clientsQuery = isAdminOrIT
        ? supabase.from('clients').select('status', { count: 'exact' })
        : supabase.from('clients').select('status', { count: 'exact' }).eq('assigned_coach_id', user.id);

      const { data: clients, count: totalClients } = await clientsQuery;
      const activeClients = clients?.filter(c => c.status === 'active').length || 0;

      // Fetch today's logs
      const today = format(new Date(), 'yyyy-MM-dd');
      const logsQuery = isAdminOrIT
        ? supabase.from('training_logs').select('*', { count: 'exact' }).eq('date', today)
        : supabase.from('training_logs').select('*', { count: 'exact' }).eq('coach_id', user.id).eq('date', today);

      const { count: todayLogs } = await logsQuery;

      // Fetch this week's logs
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekQuery = isAdminOrIT
        ? supabase.from('training_logs').select('*', { count: 'exact' }).gte('date', format(weekStart, 'yyyy-MM-dd'))
        : supabase.from('training_logs').select('*', { count: 'exact' }).eq('coach_id', user.id).gte('date', format(weekStart, 'yyyy-MM-dd'));

      const { count: thisWeekLogs } = await weekQuery;

      setStats({
        totalClients: totalClients || 0,
        activeClients,
        todayLogs: todayLogs || 0,
        thisWeekLogs: thisWeekLogs || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentLogs = async () => {
    if (!user) return;

    try {
      const isAdminOrIT = role === 'admin' || role === 'it_admin';
      
      // First get the training logs with clients
      const query = isAdminOrIT
        ? supabase.from('training_logs').select(`
            *,
            clients(name)
          `).order('created_at', { ascending: false }).limit(5)
        : supabase.from('training_logs').select(`
            *,
            clients(name)
          `).eq('coach_id', user.id).order('created_at', { ascending: false }).limit(5);

      const { data, error } = await query;
      
      if (error) throw error;
      
      // For admins, fetch coach names separately
      if (isAdminOrIT && data && data.length > 0) {
        const coachIds = [...new Set(data.map(log => log.coach_id).filter(Boolean))];
        if (coachIds.length > 0) {
          const { data: coaches } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', coachIds);
          
          const coachMap = new Map(coaches?.map(c => [c.id, c.name]) || []);
          const logsWithCoaches = data.map(log => ({
            ...log,
            coach_name: coachMap.get(log.coach_id) || 'Unknown'
          }));
          setRecentLogs(logsWithCoaches);
          return;
        }
      }
      
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-primary' },
    { title: 'Active', value: stats.activeClients, icon: TrendingUp, color: 'text-primary' },
    { title: "Today's Sessions", value: stats.todayLogs, icon: ClipboardList, color: 'text-secondary' },
    { title: 'This Week', value: stats.thisWeekLogs, icon: Clock, color: 'text-secondary' },
  ];

  const trainingTypeLabels: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    legs: 'Legs',
    shoulders: 'Shoulders',
    arms: 'Arms',
    core: 'Core',
    cardio: 'Cardio',
    full_body: 'Full Body',
    stretching: 'Stretching',
    strength: 'Strength',
    flexibility: 'Flexibility',
    hiit: 'HIIT',
  };

  return (
    <AppLayout title="DASHBOARD">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-sm">
            {role === 'admin' || role === 'it_admin' ? 'Admin Overview' : 'Coach Overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => (
            <Card key={stat.title} className="ios-card animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <p className={`text-3xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-xl bg-muted`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="ios-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              recentLogs.map((log) => {
                // Get training types display
                const types = log.training_types && log.training_types.length > 0
                  ? log.training_types.map((t: string) => trainingTypeLabels[t] || t).join(', ')
                  : trainingTypeLabels[log.training_type] || log.training_type;
                
                return (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{log.clients?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {types}
                      </p>
                      {(role === 'admin' || role === 'it_admin') && log.coach_name && (
                        <p className="text-xs text-muted-foreground/70">
                          Coach: {log.coach_name}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.date), 'MMM d')}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
