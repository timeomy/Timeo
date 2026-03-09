import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberClassBooking } from '@/components/member/MemberClassBooking';
import { Calendar, Clock, BookOpen } from 'lucide-react';

export default function MemberClasses() {
  useEffect(() => {
    document.title = 'Classes | WS Fitness';
  }, []);

  return (
    <AppLayout title="Classes">
      <div className="space-y-4">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border/30">
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="gap-2">
              <BookOpen className="h-4 w-4" />
              My Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <MemberClassBooking />
          </TabsContent>

          <TabsContent value="my-bookings" className="mt-4">
            <MemberBookingsHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Sub-component for booking history
import { useState, useEffect as useEffectBookings } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Loader2, MapPin } from 'lucide-react';
import { format } from 'date-fns';

function MemberBookingsHistory() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffectBookings(() => {
    const fetchBookings = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('class_enrollments')
          .select(`
            *,
            gym_classes(
              name,
              start_time,
              end_time,
              room,
              day_of_week,
              profiles:instructor_id(name)
            )
          `)
          .eq('member_id', user.id)
          .order('enrolled_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge className="bg-primary/20 text-primary border-0">Enrolled</Badge>;
      case 'attended':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Attended</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground border-0">Cancelled</Badge>;
      case 'no_show':
        return <Badge className="bg-destructive/20 text-destructive border-0">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="bg-card border-border/30">
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No bookings yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Browse the schedule to book your first class
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <Card key={booking.id} className="bg-card border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">
                  {booking.gym_classes?.name || 'Unknown Class'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {booking.gym_classes?.profiles?.name || 'TBA'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {DAYS[booking.gym_classes?.day_of_week]} {booking.gym_classes?.start_time?.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {booking.gym_classes?.room || 'Main Studio'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(booking.status)}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(booking.enrolled_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
