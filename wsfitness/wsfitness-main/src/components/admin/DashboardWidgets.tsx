import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Gift, AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: string;
}

interface BirthdayMember {
  id: string;
  name: string;
  avatar_url: string | null;
  birthday: string;
}

interface OverdueMember {
  id: string;
  name: string;
  expiry_date: string;
  amount: number;
}

// Card background color for Gymdesk-Dark theme
const CARD_BG = 'bg-[hsl(220,20%,11%)]';

export function ScheduleTodayWidget() {
  const [scheduleItems] = useState<ScheduleItem[]>([]);
  const currentTime = format(new Date(), 'h:mm a');

  return (
    <Card className={`${CARD_BG} border-border/30 h-full min-h-[400px] flex flex-col`}>
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">In Progress</p>
            <CardTitle className="text-foreground mt-1">Schedule Today</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-0">
            <Clock className="h-3 w-3 mr-1" />
            {currentTime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-4">
        {scheduleItems.length > 0 ? (
          <div className="space-y-3">
            {scheduleItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border border-border/20">
                <div className="w-1 h-12 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">{item.type}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm mb-2">
              This is a placeholder for Today's Schedule
            </p>
            <p className="text-xs text-muted-foreground/60">
              No classes scheduled for today
            </p>
          </div>
        )}
        <Link to="/admin/schedule" className="block mt-4">
          <Button variant="default" className="w-full rounded-md">
            Set Up Schedule
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function UpcomingBirthdaysWidget() {
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      // Placeholder - birthday field would need to be added to profiles
      setLoading(false);
    };
    fetchBirthdays();
  }, []);

  return (
    <Card className={`${CARD_BG} border-border/30`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <Gift className="h-5 w-5 text-secondary" />
          Upcoming Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdays.length > 0 ? (
          <div className="space-y-3">
            {birthdays.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary/20 text-secondary">
                    {member.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.birthday}</p>
                </div>
                <Gift className="h-4 w-4 text-secondary" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            <Gift className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">
              No birthdays in the next 7 days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationsWidget() {
  return (
    <Card className={`${CARD_BG} border-border/30`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <Bell className="h-5 w-5 text-muted-foreground" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 py-4">
          <Bell className="h-10 w-10 text-muted-foreground/20" />
          <p className="text-muted-foreground text-sm">
            There are no notifications at this time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverduePaymentsWidget() {
  const [overdueMembers, setOverdueMembers] = useState<OverdueMember[]>([]);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdue = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('memberships')
          .select('id, expiry_date, plan_type, profiles:user_id(name)')
          .lt('expiry_date', today)
          .eq('status', 'active')
          .limit(5);

        if (error) throw error;

        const overdue = (data || []).map((m: any) => ({
          id: m.id,
          name: m.profiles?.name || 'Unknown',
          expiry_date: m.expiry_date,
          amount: 100, // Placeholder amount
        }));

        setOverdueMembers(overdue);
        setTotalOverdue(overdue.length * 100);
      } catch (error) {
        console.error('Failed to fetch overdue:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverdue();
  }, []);

  return (
    <Card className={`${CARD_BG} border-border/30 ${totalOverdue > 0 ? 'border-l-4 border-l-destructive' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Overdue Payments
          </CardTitle>
          {totalOverdue > 0 && (
            <Badge variant="destructive" className="font-mono rounded-md">
              RM{totalOverdue.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {overdueMembers.length > 0 ? (
          <div className="space-y-2">
            {overdueMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <div>
                  <p className="font-medium text-foreground text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Expired: {format(parseISO(member.expiry_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive/30 rounded-md">
                  RM{member.amount}
                </Badge>
              </div>
            ))}
            <Link to="/admin/members" className="block">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">
              No overdue payments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}