import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfToday } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, User, MapPin, Users, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface AvailableClass {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  room: string | null;
  capacity: number;
  instructor_name: string | null;
  day_of_week: number;
  class_date: string | null;
  enrolled_count: number;
  is_booked: boolean;
  next_date: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailableClassesList({ onBookingChange }: { onBookingChange?: () => void }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user) return;

    try {
      const today = startOfToday();
      const todayDayOfWeek = today.getDay();

      // Fetch all classes
      const { data: classData, error } = await supabase
        .from('gym_classes')
        .select(`
          id,
          name,
          start_time,
          end_time,
          capacity,
          room,
          day_of_week,
          class_date,
          profiles:instructor_id (name)
        `)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      const classIds = (classData || []).map((c: any) => c.id);

      // Fetch enrollment counts using RPC and user's bookings
      const [enrollmentCountsRes, userEnrollmentsRes] = await Promise.all([
        classIds.length > 0
          ? supabase.rpc('get_class_enrollment_counts', { class_ids: classIds })
          : Promise.resolve({ data: [] }),
        classIds.length > 0
          ? supabase
              .from('class_enrollments')
              .select('class_id')
              .in('class_id', classIds)
              .eq('member_id', user.id)
              .eq('status', 'enrolled')
          : Promise.resolve({ data: [] }),
      ]);

      const enrolledClassIds = new Set((userEnrollmentsRes.data || []).map((e: any) => e.class_id));
      const countMap = new Map<string, number>();
      (enrollmentCountsRes.data || []).forEach((e: any) => {
        countMap.set(e.class_id, Number(e.enrolled_count) || 0);
      });

      const formatted: AvailableClass[] = (classData || []).map((c: any) => {
        // Calculate next occurrence date
        let nextDate: string;
        if (c.class_date) {
          nextDate = c.class_date;
        } else {
          const daysUntil = (c.day_of_week - todayDayOfWeek + 7) % 7;
          nextDate = format(addDays(today, daysUntil === 0 ? 0 : daysUntil), 'yyyy-MM-dd');
        }

        return {
          id: c.id,
          name: c.name,
          start_time: c.start_time,
          end_time: c.end_time,
          room: c.room,
          capacity: c.capacity,
          instructor_name: c.profiles?.name || null,
          day_of_week: c.day_of_week,
          class_date: c.class_date,
          enrolled_count: countMap.get(c.id) || 0,
          is_booked: enrolledClassIds.has(c.id),
          next_date: nextDate,
        };
      });

      // Sort by next occurrence date
      formatted.sort((a, b) => a.next_date.localeCompare(b.next_date));

      setClasses(formatted);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('available_classes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_classes' }, fetchClasses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_enrollments' }, fetchClasses)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClasses]);

  const handleBook = async (classId: string) => {
    if (!user) return;
    setBookingId(classId);

    const { error } = await supabase.from('class_enrollments').insert({
      class_id: classId,
      member_id: user.id,
      status: 'enrolled',
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('You are already enrolled in this class');
      } else {
        toast.error('Failed to book class');
      }
    } else {
      toast.success('Class booked successfully!');
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, is_booked: true, enrolled_count: c.enrolled_count + 1 }
            : c
        )
      );
      onBookingChange?.();
    }
    setBookingId(null);
  };

  const handleCancel = async (classId: string) => {
    if (!user) return;
    setBookingId(classId);

    const { error } = await supabase
      .from('class_enrollments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('class_id', classId)
      .eq('member_id', user.id)
      .eq('status', 'enrolled');

    if (error) {
      toast.error('Failed to cancel booking');
    } else {
      toast.success('Booking cancelled');
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, is_booked: false, enrolled_count: Math.max(0, c.enrolled_count - 1) }
            : c
        )
      );
      onBookingChange?.();
    }
    setBookingId(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatNextDate = (dateStr: string, dayOfWeek: number) => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(startOfToday(), 1), 'yyyy-MM-dd');
    
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return `${DAYS[dayOfWeek]}, ${format(new Date(dateStr), 'MMM d')}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">No classes available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {classes.map((classItem) => {
        const availableSpots = classItem.capacity - classItem.enrolled_count;
        const isFull = availableSpots <= 0;
        const isBooking = bookingId === classItem.id;

        return (
          <Card
            key={classItem.id}
            className={cn(
              "p-4 transition-all",
              classItem.is_booked
                ? "bg-card border-l-4 border-l-emerald-500 border-border/50"
                : "bg-card border-border/50"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">{classItem.name}</h4>
                  {classItem.is_booked && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                      <CheckCircle className="h-3 w-3 mr-0.5" />
                      Booked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-primary font-medium">
                  {formatNextDate(classItem.next_date, classItem.day_of_week)}
                </p>
              </div>
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                isFull 
                  ? "bg-destructive/20 text-destructive" 
                  : availableSpots < 5 
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-emerald-500/20 text-emerald-400"
              )}>
                {isFull ? 'Full' : `${availableSpots} spots`}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
              </span>
              {classItem.instructor_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {classItem.instructor_name}
                </span>
              )}
              {classItem.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {classItem.room}
                </span>
              )}
            </div>

            {classItem.is_booked ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => handleCancel(classItem.id)}
                disabled={isBooking}
              >
                {isBooking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel Booking'}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleBook(classItem.id)}
                disabled={isFull || isBooking}
              >
                {isBooking ? <Loader2 className="h-3 w-3 animate-spin" /> : isFull ? 'Class Full' : 'Book Now'}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
