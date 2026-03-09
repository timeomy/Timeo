import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Calendar, Clock, Users, MapPin, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface GymClass {
  id: string;
  name: string;
  description: string | null;
  instructor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  room: string | null;
  enrolled_count: number;
  is_enrolled: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MemberClassBooking() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const fetchClasses = async () => {
    if (!user) return;
    
    try {
      // Fetch all classes with instructor info
      const { data: classesData, error: classesError } = await supabase
        .from('gym_classes')
        .select(`
          *,
          profiles:instructor_id(name)
        `)
        .order('day_of_week')
        .order('start_time');

      if (classesError) throw classesError;

      const classIds = (classesData || []).map((c: any) => c.id);

      // Fetch enrollment counts using RPC and user enrollments in parallel
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

      const enrolledClassIds = new Set((userEnrollmentsRes.data || []).map(e => e.class_id));
      const countMap = new Map<string, number>();
      (enrollmentCountsRes.data || []).forEach((e: any) => {
        countMap.set(e.class_id, Number(e.enrolled_count) || 0);
      });

      const formattedClasses = (classesData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        instructor_name: c.profiles?.name || 'TBA',
        day_of_week: c.day_of_week,
        start_time: c.start_time,
        end_time: c.end_time,
        capacity: c.capacity,
        room: c.room,
        enrolled_count: countMap.get(c.id) || 0,
        is_enrolled: enrolledClassIds.has(c.id),
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleEnroll = async (classId: string) => {
    if (!user) return;
    
    setEnrollingId(classId);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: classId,
          member_id: user.id,
          status: 'enrolled',
        });

      if (error) throw error;

      toast.success('Successfully enrolled in class!');
      await fetchClasses();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You are already enrolled in this class');
      } else {
        toast.error(error.message || 'Failed to enroll');
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const handleCancel = async (classId: string) => {
    if (!user) return;
    
    setEnrollingId(classId);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('class_id', classId)
        .eq('member_id', user.id);

      if (error) throw error;

      toast.success('Enrollment cancelled');
      await fetchClasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    } finally {
      setEnrollingId(null);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Group classes by day
  const classesByDay = DAYS.map((day, index) => ({
    day,
    classes: classes.filter(c => c.day_of_week === index),
  })).filter(d => d.classes.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Class Schedule</h2>
          <p className="text-muted-foreground text-sm">Book your spot in upcoming classes</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          <Calendar className="h-3 w-3 mr-1" />
          {classes.filter(c => c.is_enrolled).length} enrolled
        </Badge>
      </div>

      {classesByDay.length === 0 ? (
        <Card className="bg-card border-border/30">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No classes scheduled yet</p>
          </CardContent>
        </Card>
      ) : (
        classesByDay.map(({ day, classes: dayClasses }) => (
          <div key={day} className="space-y-3">
            <h3 className="text-lg font-display font-semibold text-foreground">{day}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {dayClasses.map((cls) => {
                const isFull = cls.enrolled_count >= cls.capacity;
                const spotsLeft = cls.capacity - cls.enrolled_count;

                return (
                  <Card key={cls.id} className="bg-card border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">{cls.name}</h4>
                          <p className="text-sm text-muted-foreground">{cls.instructor_name}</p>
                        </div>
                        {cls.is_enrolled && (
                          <Badge className="bg-primary/20 text-primary border-0">
                            <Check className="h-3 w-3 mr-1" />
                            Enrolled
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {cls.room || 'Main Studio'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className={isFull ? 'text-destructive' : 'text-muted-foreground'}>
                            {spotsLeft} spots left
                          </span>
                        </div>
                      </div>

                      {cls.is_enrolled ? (
                        <Button
                          variant="outline"
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancel(cls.id)}
                          disabled={enrollingId === cls.id}
                        >
                          {enrollingId === cls.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Cancel Booking
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleEnroll(cls.id)}
                          disabled={isFull || enrollingId === cls.id}
                        >
                          {enrollingId === cls.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isFull ? (
                            'Class Full'
                          ) : (
                            'Book Now'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
