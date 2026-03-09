import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, CreditCard, Calendar, ScanLine } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'check_in' | 'new_member' | 'payment' | 'class';
  title: string;
  subtitle: string;
  timestamp: Date;
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'check_in':
      return ScanLine;
    case 'new_member':
      return UserPlus;
    case 'payment':
      return CreditCard;
    case 'class':
      return Calendar;
    default:
      return Users;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'check_in':
      return 'bg-primary/20 text-primary';
    case 'new_member':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'payment':
      return 'bg-amber-500/20 text-amber-400';
    case 'class':
      return 'bg-blue-500/20 text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function RecentActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const fetchActivity = async () => {
    try {
      // Fetch recent check-ins with profile data
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select(`
          id,
          checked_in_at,
          profiles:member_id(name, avatar_url)
        `)
        .order('checked_in_at', { ascending: false })
        .limit(5);

      const checkInActivities: ActivityItem[] = (checkIns || []).map((c: any) => ({
        id: c.id,
        type: 'check_in' as const,
        title: `${c.profiles?.name || 'Member'} checked in`,
        subtitle: formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true }),
        timestamp: new Date(c.checked_in_at),
      }));

      // Fetch recent new memberships
      const { data: newMembers } = await supabase
        .from('memberships')
        .select(`
          id,
          created_at,
          profiles:user_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      const newMemberActivities: ActivityItem[] = (newMembers || []).map((m: any) => ({
        id: `member-${m.id}`,
        type: 'new_member' as const,
        title: `New member: ${m.profiles?.name || 'Unknown'}`,
        subtitle: formatDistanceToNow(new Date(m.created_at), { addSuffix: true }),
        timestamp: new Date(m.created_at),
      }));

      // Merge and sort by timestamp
      const allActivities = [...checkInActivities, ...newMemberActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);

      setActivities(allActivities);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  useEffect(() => {
    fetchActivity();

    // Subscribe to real-time check-in updates
    const channel = supabase
      .channel('realtime-check-ins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
        },
        async (payload) => {
          // Fetch the profile for the new check-in
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.member_id)
            .maybeSingle();

          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: 'check_in',
            title: `${profile?.name || 'Member'} checked in`,
            subtitle: 'Just now',
            timestamp: new Date(payload.new.checked_in_at),
          };

          setActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="bg-card border-border/30 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          Recent Activity
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.subtitle}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
