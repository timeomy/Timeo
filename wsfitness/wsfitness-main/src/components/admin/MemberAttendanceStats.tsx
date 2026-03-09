import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { CalendarCheck, TrendingUp, Award, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval, getDay } from 'date-fns';

interface CheckInData {
  checked_in_at: string;
  member_id: string;
}

interface DayCount {
  day: string;
  count: number;
}

interface TopMember {
  memberId: string;
  name: string;
  checkInCount: number;
}

export function MemberAttendanceStats() {
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // Fetch check-ins from last 30 days
      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .select('checked_in_at, member_id')
        .gte('checked_in_at', thirtyDaysAgo)
        .order('checked_in_at', { ascending: false });

      if (checkInError) {
        console.error('Failed to fetch check-ins:', checkInError);
        return;
      }

      setCheckIns(checkInData || []);

      // Get unique member IDs and fetch their names
      const uniqueMemberIds = [...new Set((checkInData || []).map(c => c.member_id))];
      if (uniqueMemberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', uniqueMemberIds);

        const profileMap = new Map<string, string>();
        profiles?.forEach(p => profileMap.set(p.id, p.name));
        setMemberProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Daily check-in counts for line chart
  const dailyData = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 29);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    const countByDay = new Map<string, number>();
    checkIns.forEach(ci => {
      const dayKey = format(new Date(ci.checked_in_at), 'yyyy-MM-dd');
      countByDay.set(dayKey, (countByDay.get(dayKey) || 0) + 1);
    });

    return days.map(day => ({
      date: format(day, 'MMM dd'),
      count: countByDay.get(format(day, 'yyyy-MM-dd')) || 0,
    }));
  }, [checkIns]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);

    checkIns.forEach(ci => {
      const dayIndex = getDay(new Date(ci.checked_in_at));
      counts[dayIndex]++;
    });

    return dayNames.map((day, idx) => ({
      day,
      count: counts[idx],
    }));
  }, [checkIns]);

  // Top members by check-in count
  const topMembers = useMemo(() => {
    const countByMember = new Map<string, number>();
    checkIns.forEach(ci => {
      countByMember.set(ci.member_id, (countByMember.get(ci.member_id) || 0) + 1);
    });

    const sorted = Array.from(countByMember.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted.map(([memberId, count]) => ({
      memberId,
      name: memberProfiles.get(memberId) || 'Unknown',
      checkInCount: count,
    }));
  }, [checkIns, memberProfiles]);

  // Find busiest day
  const busiestDay = useMemo(() => {
    const maxDay = dayOfWeekData.reduce((max, day) => 
      day.count > max.count ? day : max, 
      { day: 'N/A', count: 0 }
    );
    return maxDay.day;
  }, [dayOfWeekData]);

  if (loading) {
    return (
      <Card className="ios-card">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-primary" />
        Member Engagement
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total check-ins */}
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Check-ins (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-foreground">
              {checkIns.length}
            </div>
          </CardContent>
        </Card>

        {/* Busiest day */}
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Busiest Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-foreground">
              {busiestDay}
            </div>
          </CardContent>
        </Card>

        {/* Active members */}
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-foreground">
              {new Set(checkIns.map(c => c.member_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily trend */}
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Check-in Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Day of week */}
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-secondary" />
              Most Active Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--secondary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top committed members */}
      {topMembers.length > 0 && (
        <Card className="ios-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Committed Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topMembers.map((member, idx) => (
                <div 
                  key={member.memberId}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-white' : 
                      idx === 1 ? 'bg-slate-400 text-white' : 
                      idx === 2 ? 'bg-amber-700 text-white' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{member.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {member.checkInCount} check-in{member.checkInCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
