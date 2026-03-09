import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfToday, isToday } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavMember } from '@/components/member/MobileNavMember';
import { PullToRefreshIndicator } from '@/components/member/PullToRefreshIndicator';
import { ClassRosterModal } from '@/components/admin/ClassRosterModal';
import { useStaffStatus } from '@/hooks/useStaffStatus';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  CalendarDays, Clock, User, MapPin, Users, Loader2, 
  CheckCircle, X, ChevronDown, ChevronUp, Dumbbell 
} from 'lucide-react';
import { toast } from 'sonner';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface Booking {
  id: string;
  enrollmentId: string;
  type: 'class' | 'day_pass' | 'teaching';
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  instructor_name: string | null;
  room: string | null;
  status: 'upcoming' | 'past';
  enrolledCount?: number;
  capacity?: number;
  classId: string;
}

interface AvailableClass {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  room: string | null;
  capacity: number;
  instructor_name: string | null;
  day_of_week: number;
  enrolled_count: number;
  is_booked: boolean;
  next_date: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MemberAppointments() {
  const { user } = useAuth();
  const { isStaff, isStudio } = useStaffStatus();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    room: string | null;
    capacity: number;
  } | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const today = format(startOfToday(), 'yyyy-MM-dd');
    const todayDayOfWeek = startOfToday().getDay();

    try {
      // Fetch enrollments, available classes, and teaching classes in parallel
      const [enrollmentsRes, classesRes, teachingClassesRes] = await Promise.all([
        supabase
          .from('class_enrollments')
          .select(`
            id, enrolled_at, attended, status,
            gym_classes (
              id, name, start_time, end_time, room, day_of_week, class_date, capacity,
              profiles:instructor_id (name)
            )
          `)
          .eq('member_id', user.id)
          .eq('status', 'enrolled')
          .order('enrolled_at', { ascending: false }),
        supabase
          .from('gym_classes')
          .select(`
            id, name, start_time, end_time, capacity, room, day_of_week, class_date,
            profiles:instructor_id (name)
          `)
          .order('day_of_week')
          .order('start_time'),
        isStudio
          ? supabase
              .from('gym_classes')
              .select('id, name, start_time, end_time, room, day_of_week, class_date, capacity')
              .eq('instructor_id', user.id)
              .order('start_time', { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      // Get all class IDs for enrollment counts
      const allClassIds = (classesRes.data || []).map((c: any) => c.id);
      const enrolledClassIds = new Set(
        (enrollmentsRes.data || [])
          .filter((e: any) => e.gym_classes)
          .map((e: any) => e.gym_classes.id)
      );

      // Fetch enrollment counts
      let countMap = new Map<string, number>();
      if (allClassIds.length > 0) {
        const { data: countsData } = await supabase.rpc('get_class_enrollment_counts', { 
          class_ids: allClassIds 
        });
        (countsData || []).forEach((e: any) => {
          countMap.set(e.class_id, Number(e.enrolled_count) || 0);
        });
      }

      // Format booked classes
      const formattedBookings: Booking[] = [];
      (enrollmentsRes.data || []).forEach((enrollment: any) => {
        const gymClass = enrollment.gym_classes;
        if (!gymClass) return;

        let classDate: string;
        if (gymClass.class_date) {
          classDate = gymClass.class_date;
        } else {
          const daysUntil = (gymClass.day_of_week - todayDayOfWeek + 7) % 7;
          classDate = format(addDays(startOfToday(), daysUntil === 0 ? 0 : daysUntil), 'yyyy-MM-dd');
        }

        const isPastClass = classDate < today || (classDate === today && enrollment.attended);

        formattedBookings.push({
          id: gymClass.id,
          enrollmentId: enrollment.id,
          type: 'class',
          name: gymClass.name,
          date: classDate,
          start_time: gymClass.start_time,
          end_time: gymClass.end_time,
          instructor_name: gymClass.profiles?.name || null,
          room: gymClass.room,
          status: isPastClass ? 'past' : 'upcoming',
          capacity: gymClass.capacity,
          enrolledCount: countMap.get(gymClass.id) || 0,
          classId: gymClass.id,
        });
      });

      // Add teaching classes for studio instructors
      if (isStudio && teachingClassesRes.data) {
        const teachingClassIds = (teachingClassesRes.data as any[]).map((c: any) => c.id);
        let teachingCounts: Record<string, number> = {};
        
        if (teachingClassIds.length > 0) {
          const { data: teachingCountsData } = await supabase.rpc('get_class_enrollment_counts', { 
            class_ids: teachingClassIds 
          });
          (teachingCountsData || []).forEach((e: any) => {
            teachingCounts[e.class_id] = Number(e.enrolled_count) || 0;
          });
        }

        (teachingClassesRes.data as any[]).forEach((gymClass: any) => {
          let classDate: string;
          if (gymClass.class_date) {
            classDate = gymClass.class_date;
          } else {
            const daysUntil = (gymClass.day_of_week - todayDayOfWeek + 7) % 7;
            classDate = format(addDays(startOfToday(), daysUntil === 0 ? 0 : daysUntil), 'yyyy-MM-dd');
          }

          formattedBookings.push({
            id: `teaching-${gymClass.id}`,
            enrollmentId: '',
            type: 'teaching',
            name: gymClass.name,
            date: classDate,
            start_time: gymClass.start_time,
            end_time: gymClass.end_time,
            instructor_name: 'You',
            room: gymClass.room,
            status: classDate < today ? 'past' : 'upcoming',
            enrolledCount: teachingCounts[gymClass.id] || 0,
            capacity: gymClass.capacity,
            classId: gymClass.id,
          });
        });
      }

      // Format available classes (exclude already booked)
      const formattedAvailable: AvailableClass[] = (classesRes.data || [])
        .filter((c: any) => !enrolledClassIds.has(c.id))
        .map((c: any) => {
          let nextDate: string;
          if (c.class_date) {
            nextDate = c.class_date;
          } else {
            const daysUntil = (c.day_of_week - todayDayOfWeek + 7) % 7;
            nextDate = format(addDays(startOfToday(), daysUntil === 0 ? 0 : daysUntil), 'yyyy-MM-dd');
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
            enrolled_count: countMap.get(c.id) || 0,
            is_booked: false,
            next_date: nextDate,
          };
        });

      formattedBookings.sort((a, b) => a.date.localeCompare(b.date));
      formattedAvailable.sort((a, b) => a.next_date.localeCompare(b.next_date));

      setBookings(formattedBookings);
      setAvailableClasses(formattedAvailable);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isStudio]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('appointments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_enrollments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_classes' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleCancel = async (enrollmentId: string) => {
    if (!user) return;
    setCancellingId(enrollmentId);

    const { error } = await supabase
      .from('class_enrollments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    if (error) {
      toast.error('Failed to cancel booking');
    } else {
      toast.success('Booking cancelled');
      await fetchData();
    }
    setCancellingId(null);
  };

  const handleBook = async (classId: string) => {
    if (!user) return;
    setBookingId(classId);

    // Check if there's an existing cancelled enrollment to reactivate
    const { data: existingEnrollment } = await supabase
      .from('class_enrollments')
      .select('id, status')
      .eq('class_id', classId)
      .eq('member_id', user.id)
      .maybeSingle();

    let error;
    if (existingEnrollment) {
      // Reactivate the existing enrollment
      const result = await supabase
        .from('class_enrollments')
        .update({ status: 'enrolled', cancelled_at: null })
        .eq('id', existingEnrollment.id);
      error = result.error;
    } else {
      // Create new enrollment
      const result = await supabase.from('class_enrollments').insert({
        class_id: classId,
        member_id: user.id,
        status: 'enrolled',
      });
      error = result.error;
    }

    if (error) {
      toast.error('Failed to book class');
    } else {
      toast.success('Class booked!');
      await fetchData();
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
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(startOfToday(), 1), 'yyyy-MM-dd');
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    return `${DAYS[dayOfWeek]}, ${format(new Date(dateStr), 'MMM d')}`;
  };

  const handleViewRoster = (booking: Booking) => {
    if (booking.classId && booking.capacity !== undefined) {
      setSelectedClass({
        id: booking.classId,
        name: booking.name,
        start_time: booking.start_time,
        end_time: booking.end_time,
        room: booking.room,
        capacity: booking.capacity,
      });
      setRosterOpen(true);
    }
  };

  const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
  const pastBookings = bookings.filter(b => b.status === 'past');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={wsfitnessLogo} alt="WSFitness" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <h1 className="font-display text-lg tracking-wide text-gradient">APPOINTMENTS</h1>
              <p className="text-[11px] text-muted-foreground">Book & manage your classes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Pull to Refresh Container */}
      <div 
        ref={containerRef}
        className="relative h-[calc(100vh-64px-96px)] overflow-y-auto overscroll-contain"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

        <main className="px-4 py-5 max-w-md mx-auto space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* My Bookings Section */}
              {upcomingBookings.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    My Bookings ({upcomingBookings.length})
                  </h2>
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => {
                      const isTeaching = booking.type === 'teaching';
                      const isCancelling = cancellingId === booking.enrollmentId;

                      return (
                        <Card 
                          key={booking.id} 
                          className={cn(
                            "p-4 border-l-4",
                            isTeaching 
                              ? "border-l-violet-500 bg-violet-500/5" 
                              : "border-l-emerald-500 bg-emerald-500/5"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{booking.name}</h4>
                                <Badge className={cn(
                                  "text-[10px] px-1.5 py-0 border-0",
                                  isTeaching 
                                    ? "bg-violet-500/20 text-violet-400" 
                                    : "bg-emerald-500/20 text-emerald-400"
                                )}>
                                  {isTeaching ? 'Teaching' : 'Booked'}
                                </Badge>
                              </div>
                              <p className="text-xs text-primary font-medium mt-0.5">
                                {isToday(new Date(booking.date)) ? 'Today' : format(new Date(booking.date), 'EEE, MMM d')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </span>
                            {booking.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {booking.room}
                              </span>
                            )}
                            {isTeaching && booking.enrolledCount !== undefined && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Users className="h-3 w-3" />
                                {booking.enrolledCount}/{booking.capacity}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isTeaching ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                                onClick={() => handleViewRoster(booking)}
                              >
                                <Users className="h-3 w-3" />
                                View Roster
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => handleCancel(booking.enrollmentId)}
                                disabled={isCancelling}
                              >
                                {isCancelling ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <X className="h-3 w-3" />
                                    Cancel Booking
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Available Classes Section */}
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  Available Classes
                </h2>
                
                {availableClasses.length === 0 ? (
                  <Card className="p-8 text-center bg-muted/20 border-border/30">
                    <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">No classes available</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Check back later for new classes</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {availableClasses.map((cls) => {
                      const availableSpots = cls.capacity - cls.enrolled_count;
                      const isFull = availableSpots <= 0;
                      const isBooking = bookingId === cls.id;

                      return (
                        <Card key={cls.id} className="p-3 bg-card border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-foreground text-sm truncate">{cls.name}</h4>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                                  isFull 
                                    ? "bg-destructive/20 text-destructive" 
                                    : "bg-primary/20 text-primary"
                                )}>
                                  {isFull ? 'Full' : `${availableSpots} spots`}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="text-primary font-medium">
                                  {formatNextDate(cls.next_date, cls.day_of_week)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(cls.start_time)}
                                </span>
                                {cls.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {cls.room}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="h-8 text-xs ml-3 shrink-0"
                              onClick={() => handleBook(cls.id)}
                              disabled={isFull || isBooking}
                            >
                              {isBooking ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Book'
                              )}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Past Classes Section (Collapsible) */}
              {pastBookings.length > 0 && (
                <section>
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Past ({pastBookings.length})
                    </span>
                    {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  
                  {showPast && (
                    <div className="space-y-2">
                      {pastBookings.map((booking) => (
                        <Card key={booking.id} className="p-3 bg-muted/10 border-border/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-muted-foreground text-sm">{booking.name}</h4>
                              <p className="text-[11px] text-muted-foreground/60">
                                {format(new Date(booking.date), 'EEE, MMM d')} • {formatTime(booking.start_time)}
                              </p>
                            </div>
                            <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">
                              Completed
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <MobileNavMember />

      <ClassRosterModal
        open={rosterOpen}
        onOpenChange={setRosterOpen}
        gymClass={selectedClass}
        onUpdate={fetchData}
      />
    </div>
  );
}
