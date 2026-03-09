import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Users, Clock, MapPin, UserCheck, UserX, CheckCircle, XCircle, Pencil, X } from 'lucide-react';

interface ClassRosterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymClass: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    room: string | null;
    capacity: number;
    instructor_name?: string;
  } | null;
  onUpdate?: () => void;
}

interface Attendee {
  id: string;
  member_id: string;
  status: string;
  enrolled_at: string;
  attended: boolean;
  attended_at: string | null;
  member_name: string;
  member_email: string | null;
}

const STATUS_OPTIONS = [
  { value: 'enrolled', label: 'Booked' },
  { value: 'attended', label: 'Attended' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ClassRosterModal({ open, onOpenChange, gymClass, onUpdate }: ClassRosterModalProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && gymClass) {
      fetchAttendees();
    }
  }, [open, gymClass?.id]);

  const fetchAttendees = async () => {
    if (!gymClass) return;
    
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', gymClass.id)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Fetch member profiles
      const memberIds = [...new Set((enrollments || []).map(e => e.member_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formatted = (enrollments || []).map(e => ({
        ...e,
        member_name: profileMap.get(e.member_id)?.name || 'Unknown',
        member_email: profileMap.get(e.member_id)?.email || null,
      }));

      setAttendees(formatted);
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
      toast.error('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (enrollmentId: string) => {
    setUpdating(enrollmentId);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ 
          status: 'attended',
          attended: true,
          attended_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast.success('Member checked in');
      await fetchAttendees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in');
    } finally {
      setUpdating(null);
    }
  };

  const handleNoShow = async (enrollmentId: string) => {
    setUpdating(enrollmentId);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ 
          status: 'no_show',
          attended: false
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast.success('Marked as no-show');
      await fetchAttendees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark no-show');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
    setUpdating(enrollmentId);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'attended') {
        updateData.attended = true;
        updateData.attended_at = new Date().toISOString();
      } else if (newStatus === 'no_show') {
        updateData.attended = false;
        updateData.attended_at = null;
      } else if (newStatus === 'enrolled') {
        updateData.attended = false;
        updateData.attended_at = null;
      } else if (newStatus === 'cancelled') {
        updateData.attended = false;
        updateData.attended_at = null;
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('class_enrollments')
        .update(updateData)
        .eq('id', enrollmentId);

      if (error) throw error;

      toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
      setEditingId(null);
      await fetchAttendees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (attendee: Attendee) => {
    switch (attendee.status) {
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

  const bookedCount = attendees.filter(a => a.status === 'enrolled').length;
  const attendedCount = attendees.filter(a => a.status === 'attended').length;
  const noShowCount = attendees.filter(a => a.status === 'no_show').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/30 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{gymClass?.name || 'Class Details'}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {gymClass ? `${formatTime(gymClass.start_time)} - ${formatTime(gymClass.end_time)}` : '-'}
            </span>
            {gymClass?.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {gymClass.room}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {attendees.length} / {gymClass?.capacity || 0}
            </span>
          </div>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 py-3 border-b border-border/30">
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <p className="text-2xl font-bold text-blue-400">{bookedCount}</p>
            <p className="text-xs text-muted-foreground">Booked</p>
          </div>
          <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
            <p className="text-2xl font-bold text-emerald-400">{attendedCount}</p>
            <p className="text-xs text-muted-foreground">Attended</p>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg">
            <p className="text-2xl font-bold text-red-400">{noShowCount}</p>
            <p className="text-xs text-muted-foreground">No Shows</p>
          </div>
        </div>

        {/* Attendees Table */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bookings for this class yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead>Member</TableHead>
                  <TableHead>Booked At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id} className="border-border/20">
                    <TableCell>
                      <div>
                        <p className="font-medium">{attendee.member_name}</p>
                        {attendee.member_email && (
                          <p className="text-xs text-muted-foreground">{attendee.member_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(attendee.enrolled_at), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(attendee.enrolled_at), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(attendee)}</TableCell>
                    <TableCell className="text-right">
                      {editingId === attendee.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={attendee.status}
                            onValueChange={(value) => handleStatusChange(attendee.id, value)}
                            disabled={updating === attendee.id}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingId(null)}
                            disabled={updating === attendee.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {updating === attendee.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      ) : attendee.status === 'enrolled' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleCheckIn(attendee.id)}
                            disabled={updating === attendee.id}
                          >
                            {updating === attendee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Check In
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleNoShow(attendee.id)}
                            disabled={updating === attendee.id}
                          >
                            {updating === attendee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                No Show
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {attendee.status === 'attended' && attendee.attended_at && (
                            <span className="text-xs text-muted-foreground mr-2">
                              {format(new Date(attendee.attended_at), 'h:mm a')}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingId(attendee.id)}
                            title="Edit status"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
