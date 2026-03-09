import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Flame } from 'lucide-react';

export function MonthlyStats() {
  const { user } = useAuth();
  const [visitsThisMonth, setVisitsThisMonth] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('member_id', user.id)
        .order('checked_in_at', { ascending: false });

      if (data) {
        // Calculate visits this month
        const now = new Date();
        const monthlyVisits = data.filter((c) => {
          const checkInDate = new Date(c.checked_in_at);
          return (
            checkInDate.getMonth() === now.getMonth() &&
            checkInDate.getFullYear() === now.getFullYear()
          );
        }).length;
        setVisitsThisMonth(monthlyVisits);

        // Calculate current streak (consecutive days)
        const streak = calculateStreak(data.map(c => new Date(c.checked_in_at)));
        setCurrentStreak(streak);
      }
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const calculateStreak = (dates: Date[]): number => {
    if (dates.length === 0) return 0;

    // Get unique days (normalized to midnight)
    const uniqueDays = new Set<string>();
    dates.forEach(d => {
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      uniqueDays.add(dayKey);
    });

    const sortedDays = Array.from(uniqueDays).sort().reverse();
    
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    // Streak must include today or yesterday to be "current"
    if (sortedDays[0] !== todayKey && sortedDays[0] !== yesterdayKey) {
      return 0;
    }

    let streak = 1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const [y1, m1, d1] = sortedDays[i].split('-').map(Number);
      const [y2, m2, d2] = sortedDays[i + 1].split('-').map(Number);
      
      const date1 = new Date(y1, m1, d1);
      const date2 = new Date(y2, m2, d2);
      
      const diffDays = Math.round((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card className="ios-card animate-pulse h-24" />
        <Card className="ios-card animate-pulse h-24" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Visits This Month */}
      <Card className="ios-card">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Visits This Month</span>
          </div>
          <p className="text-4xl font-display text-primary">{visitsThisMonth}</p>
        </CardContent>
      </Card>

      {/* Current Streak */}
      <Card className="ios-card">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Current Streak</span>
          </div>
          <p className="text-4xl font-display text-foreground">
            {currentStreak} <span className="text-lg">Days</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
