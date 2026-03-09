import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfToday } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavMember } from '@/components/member/MobileNavMember';
import { PhotoRequiredModal } from '@/components/member/PhotoRequiredModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, User, Users, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  room: string | null;
  instructor_name: string | null;
  enrolled_count: number;
  is_booked: boolean;
}

interface ProfileData {
  member_id: string | null;
  name: string;
  avatar_url: string | null;
}

interface MembershipData {
  status: 'active' | 'expired';
}

export default function MemberSchedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);

  // Fetch profile and membership for QR modal
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const [profileRes, membershipRes] = await Promise.all([
        supabase.from('profiles').select('member_id, name, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('memberships').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (membershipRes.data) setMembership(membershipRes.data as MembershipData);
    };
    fetchUserData();
  }, [user]);

  const handlePhotoUpdated = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  // Only show photo modal after profile has loaded AND user doesn't have a photo
  const requiresPhoto = !loading && profile !== null && !profile.avatar_url;

  // Fetch classes for selected date
  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Fetch classes for this day (recurring by day_of_week OR specific date)
      const { data: classData, error } = await supabase
        .from('gym_classes')
        .select(`
          id,
          name,
          description,
          start_time,
          end_time,
          capacity,
          room,
          instructor_id,
          day_of_week,
          class_date,
          profiles:instructor_id (name)
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching classes:', error);
        setLoading(false);
        return;
      }

      // Filter classes that match this day (recurring or specific date)
      const matchingClasses = (classData || []).filter((c: any) => {
        // If class has a specific date, match that
        if (c.class_date) {
          return c.class_date === dateStr;
        }
        // Otherwise match by day_of_week (recurring classes)
        return c.day_of_week === dayOfWeek;
      });

      // Get enrollment counts and user's bookings in parallel
      const classIds = matchingClasses.map((c: any) => c.id);
      
      let enrollmentCounts: Record<string, number> = {};
      let userBookings: Set<string> = new Set();

      if (classIds.length > 0) {
        const [enrollmentCountsRes, userEnrollmentsRes] = await Promise.all([
          // Use RPC function to get enrollment counts (bypasses RLS)
          supabase.rpc('get_class_enrollment_counts', { class_ids: classIds }),
          supabase
            .from('class_enrollments')
            .select('class_id')
            .in('class_id', classIds)
            .eq('member_id', user.id)
            .eq('status', 'enrolled'),
        ]);

        if (enrollmentCountsRes.data) {
          enrollmentCountsRes.data.forEach((e: any) => {
            enrollmentCounts[e.class_id] = Number(e.enrolled_count) || 0;
          });
        }

        if (userEnrollmentsRes.data) {
          userEnrollmentsRes.data.forEach((e: any) => userBookings.add(e.class_id));
        }
      }

      const formatted: ClassItem[] = matchingClasses.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        start_time: c.start_time,
        end_time: c.end_time,
        capacity: c.capacity,
        room: c.room,
        instructor_name: c.profiles?.name || null,
        enrolled_count: enrollmentCounts[c.id] || 0,
        is_booked: userBookings.has(c.id),
      }));

      setClasses(formatted);
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  // Initial fetch
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Realtime subscription for gym_classes and class_enrollments changes
  useEffect(() => {
    const channel = supabase
      .channel('schedule_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gym_classes',
        },
        () => {
          fetchClasses();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_enrollments',
        },
        () => {
          // Refetch to update enrollment counts
          fetchClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClasses]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleBook = async (classId: string) => {
    if (!user) return;
    setBookingId(classId);

    const { error } = await supabase.from('class_enrollments').insert({
      class_id: classId,
      member_id: user.id,
      status: 'enrolled',
    });

    if (error) {
      toast.error('Failed to book class');
      console.error(error);
    } else {
      toast.success('Class booked successfully!');
      // Update local state
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, is_booked: true, enrolled_count: c.enrolled_count + 1 }
            : c
        )
      );
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
      console.error(error);
    } else {
      toast.success('Booking cancelled');
      // Update local state
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, is_booked: false, enrolled_count: Math.max(0, c.enrolled_count - 1) }
            : c
        )
      );
    }
    setBookingId(null);
  };

  const getSlotsColor = (available: number) => {
    if (available === 0) return 'text-destructive';
    if (available < 5) return 'text-orange-500';
    return 'text-emerald-500';
  };

  const getSlotsText = (available: number, capacity: number) => {
    if (available === 0) return 'Class Full';
    return `${available}/${capacity} spots left`;
  };

  // Quick date buttons - show full week ahead
  const quickDates = [
    { label: 'Today', date: startOfToday() },
    { label: 'Tomorrow', date: addDays(startOfToday(), 1) },
    { label: format(addDays(startOfToday(), 2), 'EEE'), date: addDays(startOfToday(), 2) },
    { label: format(addDays(startOfToday(), 3), 'EEE'), date: addDays(startOfToday(), 3) },
    { label: format(addDays(startOfToday(), 4), 'EEE'), date: addDays(startOfToday(), 4) },
    { label: format(addDays(startOfToday(), 5), 'EEE'), date: addDays(startOfToday(), 5) },
    { label: format(addDays(startOfToday(), 6), 'EEE'), date: addDays(startOfToday(), 6) },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img
              src={wsfitnessLogo}
              alt="WSFitness"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-display text-xl tracking-wide text-gradient">CLASS SCHEDULE</h1>
              <p className="text-xs text-muted-foreground">Book your classes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Date Picker Section */}
        <div className="space-y-3">
          {/* Scrollable week view */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              {quickDates.map((qd) => {
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(qd.date, 'yyyy-MM-dd');
                return (
                  <Button
                    key={qd.label}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDate(qd.date)}
                    className={cn(
                      "flex-shrink-0 min-w-[60px] flex-col h-auto py-2",
                      isSelected && "ring-2 ring-primary/30"
                    )}
                  >
                    <span className="text-xs opacity-70">{format(qd.date, 'd')}</span>
                    <span className="text-sm font-medium">{qd.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Calendar popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Classes List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Available Classes
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <Card className="p-8 bg-muted/30 border-border/50 text-center">
              <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No classes scheduled for this day</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => {
                const availableSpots = classItem.capacity - classItem.enrolled_count;
                const isFull = availableSpots === 0;
                const isBooking = bookingId === classItem.id;

                return (
                  <Card
                    key={classItem.id}
                    className="p-4 bg-gradient-to-br from-card to-muted/50 border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">{classItem.name}</h4>
                        {classItem.room && (
                          <p className="text-xs text-muted-foreground">{classItem.room}</p>
                        )}
                      </div>
                      <div className={cn('text-sm font-medium', getSlotsColor(availableSpots))}>
                        <Users className="inline h-4 w-4 mr-1" />
                        {getSlotsText(availableSpots, classItem.capacity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>
                          {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                        </span>
                      </div>
                      {classItem.instructor_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          <span>{classItem.instructor_name}</span>
                        </div>
                      )}
                    </div>

                    {classItem.description && (
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                        {classItem.description}
                      </p>
                    )}

                    {/* Book/Cancel Button */}
                    {classItem.is_booked ? (
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 text-emerald-500 text-sm flex-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Booked</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(classItem.id)}
                          disabled={isBooking}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          {isBooking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Cancel Booking'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleBook(classItem.id)}
                        disabled={isFull || isBooking}
                        variant={isFull ? 'secondary' : 'default'}
                      >
                        {isBooking ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isFull ? 'Class Full' : 'Book Now'}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MobileNavMember />

      {/* Photo Required Modal */}
      {user && (
        <PhotoRequiredModal
          open={requiresPhoto}
          userId={user.id}
          currentAvatarUrl={profile?.avatar_url || null}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
}
