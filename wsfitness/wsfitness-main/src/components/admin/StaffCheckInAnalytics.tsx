import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Clock, TrendingUp, Users, Shield, Sun, Sunrise } from 'lucide-react';
import { useGymHours } from '@/hooks/useGymHours';
import { format, subDays, startOfDay } from 'date-fns';

interface StaffCheckIn {
  id: string;
  member_id: string;
  checked_in_at: string;
  notes: string | null;
  profile_name: string;
  is_early: boolean;
}

interface StaffAnalytics {
  totalCheckIns: number;
  earlyCheckIns: number;
  regularCheckIns: number;
  uniqueStaff: number;
  topEarlyUsers: { name: string; count: number }[];
}

export function StaffCheckInAnalytics() {
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<StaffCheckIn[]>([]);
  const [staffUserIds, setStaffUserIds] = useState<Set<string>>(new Set());
  const { session1_start, staff_early_minutes, loading: hoursLoading } = useGymHours();

  useEffect(() => {
    const fetchData = async () => {
      // Get all staff user IDs
      const { data: staffRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');

      const staffIds = new Set(staffRoles?.map(r => r.user_id) || []);
      setStaffUserIds(staffIds);

      if (staffIds.size === 0) {
        setLoading(false);
        return;
      }

      // Get check-ins from the last 30 days for staff members
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data: checkInsData, error } = await supabase
        .from('check_ins')
        .select('id, member_id, checked_in_at, notes')
        .in('member_id', Array.from(staffIds))
        .gte('checked_in_at', thirtyDaysAgo.toISOString())
        .order('checked_in_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff check-ins:', error);
        setLoading(false);
        return;
      }

      // Get profile names for staff
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(staffIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      // Process check-ins and determine if they were early
      const [openHour, openMin] = session1_start.split(':').map(Number);
      const openingTotalMinutes = openHour * 60 + openMin;
      const earlyThreshold = openingTotalMinutes - staff_early_minutes;

      const processedCheckIns: StaffCheckIn[] = (checkInsData || []).map(ci => {
        const checkInDate = new Date(ci.checked_in_at);
        const checkInHour = checkInDate.getHours();
        const checkInMinutes = checkInDate.getMinutes();
        const checkInTotalMinutes = checkInHour * 60 + checkInMinutes;
        
        // It's early if before opening hour
        const isEarly = checkInTotalMinutes < openingTotalMinutes && checkInTotalMinutes >= earlyThreshold;

        return {
          ...ci,
          profile_name: profileMap.get(ci.member_id) || 'Unknown',
          is_early: isEarly,
        };
      });

      setCheckIns(processedCheckIns);
      setLoading(false);
    };

    if (!hoursLoading) {
      fetchData();
    }
  }, [session1_start, staff_early_minutes, hoursLoading]);

  const analytics: StaffAnalytics = useMemo(() => {
    const earlyCheckIns = checkIns.filter(ci => ci.is_early);
    const regularCheckIns = checkIns.filter(ci => !ci.is_early);
    const uniqueStaff = new Set(checkIns.map(ci => ci.member_id)).size;

    // Count early check-ins per user
    const earlyCountMap = new Map<string, { name: string; count: number }>();
    earlyCheckIns.forEach(ci => {
      const existing = earlyCountMap.get(ci.member_id);
      if (existing) {
        existing.count++;
      } else {
        earlyCountMap.set(ci.member_id, { name: ci.profile_name, count: 1 });
      }
    });

    const topEarlyUsers = Array.from(earlyCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCheckIns: checkIns.length,
      earlyCheckIns: earlyCheckIns.length,
      regularCheckIns: regularCheckIns.length,
      uniqueStaff,
      topEarlyUsers,
    };
  }, [checkIns]);

  const earlyPercentage = analytics.totalCheckIns > 0 
    ? Math.round((analytics.earlyCheckIns / analytics.totalCheckIns) * 100) 
    : 0;

  if (loading || hoursLoading) {
    return (
      <Card className="ios-card border-border/50">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (staffUserIds.size === 0) {
    return (
      <Card className="ios-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Staff Check-In Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No staff members configured yet</p>
            <p className="text-sm mt-1">Add staff roles in the Staff Management tab</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ios-card border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Staff Check-In Analytics</CardTitle>
        </div>
        <CardDescription>
          Last 30 days • Early access vs regular hours usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{analytics.uniqueStaff}</p>
            <p className="text-xs text-muted-foreground">Active Staff</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{analytics.totalCheckIns}</p>
            <p className="text-xs text-muted-foreground">Total Check-ins</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
            <Sunrise className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{analytics.earlyCheckIns}</p>
            <p className="text-xs text-muted-foreground">Early Access</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
            <Sun className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{analytics.regularCheckIns}</p>
            <p className="text-xs text-muted-foreground">Regular Hours</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Early Access Usage</span>
            <span className="font-medium">{earlyPercentage}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${earlyPercentage}%` }}
            />
          </div>
        </div>

        {/* Top Early Users */}
        {analytics.topEarlyUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-primary" />
              Top Early Access Users
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Early Check-ins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topEarlyUsers.map((user, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          {user.count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {checkIns.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Staff Check-ins</h4>
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Staff</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkIns.slice(0, 10).map((ci) => (
                    <TableRow key={ci.id}>
                      <TableCell className="font-medium">{ci.profile_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ci.checked_in_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        {ci.is_early ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            <Sunrise className="h-3 w-3 mr-1" />
                            Early
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Regular
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
