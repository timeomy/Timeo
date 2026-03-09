import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CheckIn {
  id: string;
  checked_in_at: string;
  location: string | null;
}

interface CheckInHistoryProps {
  refreshKey?: number;
  limit?: number;
}

export function CheckInHistory({ refreshKey = 0, limit = 10 }: CheckInHistoryProps) {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('check_ins')
        .select('id, checked_in_at, location')
        .eq('member_id', user.id)
        .order('checked_in_at', { ascending: false })
        .limit(limit);

      if (data) {
        setCheckIns(data);
      }
      setLoading(false);
    };

    fetchCheckIns();
  }, [user, refreshKey, limit]);

  const thisMonthCount = checkIns.filter((c) => {
    const checkInDate = new Date(c.checked_in_at);
    const now = new Date();
    return (
      checkInDate.getMonth() === now.getMonth() &&
      checkInDate.getFullYear() === now.getFullYear()
    );
  }).length;

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Check-In History
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-display text-primary">{thisMonthCount}</p>
            <p className="text-xs text-muted-foreground">this month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
        ) : checkIns.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No check-ins yet. Visit the gym to get started!
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{checkIn.location || 'Main Entrance'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(checkIn.checked_in_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(checkIn.checked_in_at), 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
