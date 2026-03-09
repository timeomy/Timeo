import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, ScanLine, DollarSign, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  iconColor?: string;
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon: Icon, trend = 'neutral', iconColor, onClick }: StatCardProps) {
  const trendColor = trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const bgColor = iconColor === 'green' ? 'bg-emerald-500/10' : iconColor === 'red' ? 'bg-destructive/10' : 'bg-primary/10';
  const textColor = iconColor === 'green' ? 'text-emerald-500' : iconColor === 'red' ? 'text-destructive' : 'text-primary';

  return (
    <Card 
      className={`bg-card border-border/30 h-full ${onClick ? 'cursor-pointer hover:bg-card/80 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            <p className={`text-xs ${trendColor} truncate`}>{subtitle}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStatCards() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRegistered: 0,
    activeMembers: 0,
    expiredMembers: 0,
    newMembersThisMonth: 0,
    checkInsToday: 0,
    monthlyRevenue: 0,
    activeClasses: 0,
    classesToday: 0,
  });

  const fetchStats = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const today = now.toISOString().split('T')[0];
      const todayDayOfWeek = now.getDay();

      // Fetch all memberships with status and expiry_date
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, status, expiry_date, created_at');

      const totalRegistered = memberships?.length || 0;
      
      // Active = status is 'active' AND expiry_date is in the future or today
      const activeMembers = memberships?.filter(m => {
        if (m.status !== 'active') return false;
        if (!m.expiry_date) return true; // No expiry = still active
        return new Date(m.expiry_date) >= new Date(today);
      }).length || 0;

      // Expired = status is 'expired' OR expiry_date is in the past
      const expiredMembers = memberships?.filter(m => {
        if (m.status === 'expired' || m.status === 'inactive') return true;
        if (m.expiry_date && new Date(m.expiry_date) < new Date(today)) return true;
        return false;
      }).length || 0;

      // New members this month
      const newMembersThisMonth = memberships?.filter(m => {
        const createdAt = new Date(m.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length || 0;

      // Fetch check-ins today
      const { count: checkInsCount } = await supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .gte('checked_in_at', `${today}T00:00:00`)
        .lt('checked_in_at', `${today}T23:59:59`);

      // Fetch monthly revenue from paid invoices this month
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('issue_date', monthStart.toISOString().split('T')[0])
        .lte('issue_date', monthEnd.toISOString().split('T')[0]);

      const monthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      // Fetch active classes count
      const { count: classesCount } = await supabase
        .from('gym_classes')
        .select('id', { count: 'exact', head: true });

      // Fetch classes scheduled for today (by day of week)
      const { count: todayClassesCount } = await supabase
        .from('gym_classes')
        .select('id', { count: 'exact', head: true })
        .eq('day_of_week', todayDayOfWeek);

      setStats({
        totalRegistered,
        activeMembers,
        expiredMembers,
        newMembersThisMonth,
        checkInsToday: checkInsCount || 0,
        monthlyRevenue,
        activeClasses: classesCount || 0,
        classesToday: todayClassesCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to membership and invoice changes for real-time updates
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_classes' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Registered"
        value={stats.totalRegistered}
        subtitle={`+${stats.newMembersThisMonth} this month`}
        icon={Users}
        trend={stats.newMembersThisMonth > 0 ? 'up' : 'neutral'}
        onClick={() => navigate('/admin/members')}
      />
      <StatCard
        title="Active Members"
        value={stats.activeMembers}
        subtitle="Valid memberships"
        icon={UserCheck}
        iconColor="green"
        trend="up"
        onClick={() => navigate('/admin/members')}
      />
      <StatCard
        title="Expired/Inactive"
        value={stats.expiredMembers}
        subtitle="Need renewal"
        icon={UserX}
        iconColor="red"
        trend={stats.expiredMembers > 0 ? 'down' : 'neutral'}
        onClick={() => navigate('/admin/members')}
      />
      <StatCard
        title="Check-ins Today"
        value={stats.checkInsToday}
        subtitle="Today's gym visits"
        icon={ScanLine}
        trend={stats.checkInsToday > 0 ? 'up' : 'neutral'}
        onClick={() => navigate('/admin/check-ins')}
      />
      <StatCard
        title="Monthly Revenue"
        value={`RM ${stats.monthlyRevenue.toLocaleString()}`}
        subtitle="Paid invoices"
        icon={DollarSign}
        trend={stats.monthlyRevenue > 0 ? 'up' : 'neutral'}
        onClick={() => navigate('/admin/billing')}
      />
      <StatCard
        title="Active Classes"
        value={stats.activeClasses}
        subtitle={`${stats.classesToday} today`}
        icon={TrendingUp}
        trend="neutral"
        onClick={() => navigate('/admin/schedule')}
      />
    </div>
  );
}