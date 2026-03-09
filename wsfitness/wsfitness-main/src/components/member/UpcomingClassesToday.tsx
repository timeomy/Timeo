import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, Dumbbell } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  start_time: string;
  instructor_name: string | null;
}

export function UpcomingClassesToday() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaysClasses = async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayDate = today.toISOString().split('T')[0];
      const currentTime = today.toTimeString().slice(0, 5);

      const { data, error } = await supabase
        .from('gym_classes')
        .select(`
          id,
          name,
          start_time,
          instructor_id,
          profiles:instructor_id (name)
        `)
        .or(`day_of_week.eq.${dayOfWeek},class_date.eq.${todayDate}`)
        .gte('start_time', currentTime)
        .order('start_time', { ascending: true })
        .limit(10);

      if (!error && data) {
        const formatted = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          start_time: c.start_time,
          instructor_name: c.profiles?.name || null,
        }));
        setClasses(formatted);
      }
      setLoading(false);
    };

    fetchTodaysClasses();
  }, []);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Upcoming Classes Today
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-40 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Upcoming Classes Today
        </h3>
        <Card className="p-6 bg-muted/30 border-border/50 text-center">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No more classes scheduled for today</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Upcoming Classes Today
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {classes.map((classItem) => (
          <Card
            key={classItem.id}
            className="flex-shrink-0 w-40 p-4 bg-gradient-to-br from-card to-muted/50 border-border/50 hover:border-primary/50 transition-colors"
          >
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-tight">
                {classItem.name}
              </h4>
              
              <div className="flex items-center gap-1.5 text-primary">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{formatTime(classItem.start_time)}</span>
              </div>
              
              {classItem.instructor_name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs truncate">{classItem.instructor_name}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
