import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Calendar, AlertTriangle } from 'lucide-react';

interface MemberClassHistoryProps {
  memberId: string;
}

interface ClassBooking {
  id: string;
  class_id: string;
  status: string;
  enrolled_at: string;
  attended: boolean;
  attended_at: string | null;
  cancelled_at: string | null;
  class_name: string;
  class_time: string;
}

export function MemberClassHistory({ memberId }: MemberClassHistoryProps) {
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, attended: 0, noShows: 0, cancelled: 0 });

  useEffect(() => {
    if (memberId) {
      fetchClassHistory();
    }
  }, [memberId]);

  const fetchClassHistory = async () => {
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          gym_classes (name, start_time)
        `)
        .eq('member_id', memberId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const formatted = (enrollments || []).map((e: any) => ({
        id: e.id,
        class_id: e.class_id,
        status: e.status,
        enrolled_at: e.enrolled_at,
        attended: e.attended,
        attended_at: e.attended_at,
        cancelled_at: e.cancelled_at,
        class_name: e.gym_classes?.name || 'Unknown Class',
        class_time: e.gym_classes?.start_time || '',
      }));

      setBookings(formatted);

      // Calculate stats
      const total = formatted.length;
      const attended = formatted.filter(b => b.status === 'attended').length;
      const noShows = formatted.filter(b => b.status === 'no_show').length;
      const cancelled = formatted.filter(b => b.status === 'cancelled').length;
      setStats({ total, attended, noShows, cancelled });
    } catch (error) {
      console.error('Failed to fetch class history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (booking: ClassBooking) => {
    switch (booking.status) {
      case 'attended':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attended</Badge>;
      case 'no_show':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">No Show</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Booked</Badge>;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-muted/30 rounded-lg">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <p className="text-lg font-bold text-emerald-400">{stats.attended}</p>
          <p className="text-xs text-muted-foreground">Attended</p>
        </div>
        <div className="p-2 bg-red-500/10 rounded-lg">
          <p className="text-lg font-bold text-red-400">{stats.noShows}</p>
          <p className="text-xs text-muted-foreground">No Shows</p>
        </div>
        <div className="p-2 bg-muted/30 rounded-lg">
          <p className="text-lg font-bold text-muted-foreground">{stats.cancelled}</p>
          <p className="text-xs text-muted-foreground">Cancelled</p>
        </div>
      </div>

      {/* Warning for repeat no-shows */}
      {stats.noShows >= 3 && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm">This member has {stats.noShows} no-shows. Consider reviewing their booking privileges.</p>
        </div>
      )}

      {/* Booking History */}
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No class bookings yet</p>
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Class</TableHead>
                <TableHead>Booked On</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} className="border-border/20">
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.class_name}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(booking.class_time)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{format(new Date(booking.enrolled_at), 'dd MMM yyyy')}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
