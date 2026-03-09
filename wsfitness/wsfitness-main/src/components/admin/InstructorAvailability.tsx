import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Plus, Calendar, Clock, Trash2, User, Dumbbell, Pencil } from 'lucide-react';

interface Instructor {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AvailabilitySlot {
  id: string;
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  notes: string | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function InstructorAvailability() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    instructor_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both studio AND coach role users
      const { data: instructorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['studio', 'coach']);

      if (rolesError) throw rolesError;

      if (instructorRoles && instructorRoles.length > 0) {
        const instructorIds = instructorRoles.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', instructorIds);

        if (profilesError) throw profilesError;

        setInstructors(profiles || []);

        // Fetch availability for all instructors
        if (instructorIds.length > 0) {
          const { data: availabilityData, error: availError } = await supabase
            .from('instructor_availability')
            .select('*')
            .in('instructor_id', instructorIds)
            .order('day_of_week')
            .order('start_time');

          if (availError) throw availError;
          setAvailability(availabilityData || []);
        } else {
          setAvailability([]);
        }
      } else {
        setInstructors([]);
        setAvailability([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load instructor data');
      setInstructors([]);
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddDialog = () => {
    setEditingSlotId(null);
    setFormData({
      instructor_id: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (slot: AvailabilitySlot) => {
    setEditingSlotId(slot.id);
    setFormData({
      instructor_id: slot.instructor_id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time.slice(0, 5), // Remove seconds
      end_time: slot.end_time.slice(0, 5),
      notes: slot.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!formData.instructor_id) {
      toast.error('Please select an instructor');
      return;
    }

    // Validate end time is after start time
    if (formData.end_time <= formData.start_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        instructor_id: formData.instructor_id,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time.length === 5 ? formData.start_time + ':00' : formData.start_time,
        end_time: formData.end_time.length === 5 ? formData.end_time + ':00' : formData.end_time,
        notes: formData.notes || null,
        is_recurring: true,
      };

      if (editingSlotId) {
        // Update existing slot
        const { error } = await supabase
          .from('instructor_availability')
          .update(payload)
          .eq('id', editingSlotId);

        if (error) throw error;
        toast.success('Availability slot updated');
      } else {
        // Insert new slot
        const { error } = await supabase
          .from('instructor_availability')
          .insert(payload);

        if (error) throw error;
        toast.success('Availability slot added');
      }

      setDialogOpen(false);
      setEditingSlotId(null);
      setFormData({
        instructor_id: '',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save slot');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('instructor_availability')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      toast.success('Slot removed');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete slot');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getInstructorName = (id: string) => {
    return instructors.find(i => i.id === id)?.name || 'Unknown';
  };

  const filteredAvailability = selectedInstructor
    ? availability.filter(a => a.instructor_id === selectedInstructor)
    : availability;

  // Group by day
  const groupedByDay = DAYS.map((day, idx) => ({
    day,
    dayIndex: idx,
    slots: filteredAvailability.filter(a => a.day_of_week === idx),
  })).filter(g => g.slots.length > 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Calendar className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Studio Instructor Availability</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage when instructors are available to teach
                </p>
              </div>
            </div>
            <Button onClick={openAddDialog} disabled={instructors.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No studio instructors found</p>
              <p className="text-xs mt-1">Assign the 'Studio' role to users first</p>
            </div>
          ) : (
            <>
              {/* Instructor Filter */}
              <div className="flex items-center gap-3">
                <Label className="text-muted-foreground whitespace-nowrap">Filter by:</Label>
                <Select value={selectedInstructor || 'all'} onValueChange={(v) => setSelectedInstructor(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All instructors</SelectItem>
                    {instructors.filter(i => i.id && i.id !== '').map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name || 'Unknown'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Grid */}
              {groupedByDay.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No availability slots set</p>
                  <p className="text-xs mt-1">Click "Add Slot" to define teaching hours</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedByDay.map(({ day, dayIndex, slots }) => (
                    <div key={dayIndex} className="border border-border/50 rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {day}
                        <Badge variant="secondary" className="ml-auto">{slots.length} slot{slots.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="divide-y divide-border/50">
                        {slots.map(slot => (
                          <div key={slot.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-full bg-violet-500/10">
                                <User className="h-4 w-4 text-violet-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{getInstructorName(slot.instructor_id)}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                  {slot.notes && <span className="text-muted-foreground/60">• {slot.notes}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => openEditDialog(slot)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingSlotId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlotId ? 'Edit Availability Slot' : 'Add Availability Slot'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select
                value={formData.instructor_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, instructor_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.filter(i => i.id && i.id !== '').map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name || 'Unknown'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={formData.day_of_week.toString()}
                onValueChange={(v) => setFormData(prev => ({ ...prev, day_of_week: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    // Auto-update end time if it's before or equal to new start
                    const [sh, sm] = newStart.split(':').map(Number);
                    const [eh, em] = formData.end_time.split(':').map(Number);
                    const startMins = sh * 60 + sm;
                    const endMins = eh * 60 + em;
                    
                    if (endMins <= startMins) {
                      // Set end time to 1 hour after start
                      const newEndMins = Math.min(startMins + 60, 22 * 60); // Cap at 10 PM
                      const newEndH = Math.floor(newEndMins / 60);
                      const newEndM = newEndMins % 60;
                      setFormData(prev => ({
                        ...prev,
                        start_time: newStart,
                        end_time: `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, start_time: newStart }));
                    }
                  }}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  min={formData.start_time}
                  className="bg-background"
                />
                {formData.end_time <= formData.start_time && (
                  <p className="text-xs text-destructive">End time must be after start time</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g., Yoga classes only"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveSlot} 
              disabled={saving || formData.end_time <= formData.start_time}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSlotId ? 'Update Slot' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
