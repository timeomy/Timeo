import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, Users, Trash2, Loader2, List, LayoutGrid, Settings, CalendarCheck } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SessionBookings } from '@/components/admin/SessionBookings';
import { InstructorAvailability } from '@/components/admin/InstructorAvailability';
import { ClassRosterModal } from '@/components/admin/ClassRosterModal';

// Generate time slots with 30-minute increments
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const DAYS_FULL = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface GymClass {
  id: string;
  name: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  room: string | null;
}

interface Coach {
  id: string;
  name: string;
}

// Embedded Programs component for the tab
function ProgramsEmbed() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/30">
        <CardContent className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <CalendarCheck className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Training Programs</h3>
            <p className="text-muted-foreground">
              Create and manage training programs that can be linked to memberships.
            </p>
            <Button onClick={() => navigate('/admin/programs')} className="gap-2">
              <Plus className="h-4 w-4" />
              Manage Programs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GymSchedule() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [programCounts, setProgramCounts] = useState<Record<string, number>>({});
  const [trainingPrograms, setTrainingPrograms] = useState<{ id: string; name: string }[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [instructorAvailability, setInstructorAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  
  const [classForm, setClassForm] = useState({
    name: '',
    description: '',
    instructor_id: '',
    capacity: 20,
    room: 'Main Studio',
    duration: 60,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const today = new Date();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel for better performance
      const [classesRes, programsRes, studioRolesRes] = await Promise.all([
        supabase
          .from('gym_classes')
          .select(`*, profiles:instructor_id(name)`)
          .order('start_time'),
        supabase
          .from('training_programs')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'studio'), // Only show users with studio role as instructors
      ]);

      if (classesRes.error) throw classesRes.error;

      const classesData = classesRes.data || [];
      const formattedClasses = classesData.map((c: any) => ({
        ...c,
        instructor_name: c.profiles?.name || 'Unassigned',
      }));
      setClasses(formattedClasses);

      // Calculate program counts (only counting active classes)
      const counts: Record<string, number> = {};
      classesData.forEach((c: any) => {
        if (c.name) {
          counts[c.name] = (counts[c.name] || 0) + 1;
        }
      });
      setProgramCounts(counts);

      setTrainingPrograms(programsRes.data || []);

      // Fetch studio/coach profiles and availability in parallel
      const instructorIds = (studioRolesRes.data || []).map(r => r.user_id);
      
      if (instructorIds.length > 0) {
        const [profilesRes, availRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name')
            .in('id', instructorIds),
          supabase
            .from('instructor_availability')
            .select('*')
            .in('instructor_id', instructorIds),
        ]);

        setCoaches(profilesRes.data || []);
        setInstructorAvailability(availRes.data || []);
      } else {
        setCoaches([]);
        setInstructorAvailability([]);
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentWeek(startOfWeek(date));
      setCalendarOpen(false);
    }
  };

  // Check if instructor is available at the selected time slot (including class duration)
  const getInstructorAvailabilityStatus = (instructorId: string) => {
    if (!selectedSlot || typeof selectedSlot.time !== 'string') {
      return { available: true, message: '' };
    }
    
    const dayOfWeek = selectedSlot.day;
    const selectedTime = selectedSlot.time;
    
    // Calculate class end time based on duration
    const [startH, startM] = selectedTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = startMins + classForm.duration;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const classEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    
    // Find availability slots for this instructor on this day
    const slots = instructorAvailability.filter(
      a => a.instructor_id === instructorId && a.day_of_week === dayOfWeek
    );
    
    // If no availability is set, assume instructor is available anytime (no restrictions)
    if (slots.length === 0) {
      return { available: true, message: 'No schedule restrictions set' };
    }
    
    // Check if the ENTIRE class (start to end) falls within any availability slot
    const isAvailable = slots.some(slot => {
      const slotStart = slot.start_time.slice(0, 5);
      const slotEnd = slot.end_time.slice(0, 5);
      // Class must start at or after slot start, and end at or before slot end
      return selectedTime >= slotStart && classEndTime <= slotEnd;
    });
    
    if (isAvailable) {
      return { available: true, message: 'Available' };
    }
    
    // Find the available hours for display
    const availableHours = slots.map(s => {
      const start = s.start_time.slice(0, 5);
      const end = s.end_time.slice(0, 5);
      return `${start}-${end}`;
    }).join(', ');
    
    return { available: false, message: `Shift: ${availableHours}` };
  };

  // Filter classes by selected program
  const filteredClasses = selectedProgram === 'all' 
    ? classes 
    : classes.filter(c => c.name === selectedProgram);

  const handleClassClick = (cls: GymClass) => {
    setSelectedClass(cls);
    setRosterModalOpen(true);
  };

  // Combine existing class names with training programs for the filter dropdown
  const allProgramNames = [...new Set([
    ...Object.keys(programCounts),
    ...trainingPrograms.map(p => p.name)
  ])].sort();

  const handleAddClass = async () => {
    if (!selectedSlot || !classForm.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const [hours, minutes] = selectedSlot.time.split(':').map(Number);
      const endHours = hours + Math.floor(classForm.duration / 60);
      const endMinutes = minutes + (classForm.duration % 60);
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('gym_classes')
        .insert({
          name: classForm.name,
          description: classForm.description || null,
          instructor_id: classForm.instructor_id || null,
          day_of_week: selectedSlot.day,
          start_time: `${selectedSlot.time}:00`,
          end_time: endTime,
          capacity: classForm.capacity,
          room: classForm.room,
        });

      if (error) throw error;

      toast.success('Class scheduled successfully');
      setAddDialogOpen(false);
      setClassForm({ name: '', description: '', instructor_id: '', capacity: 20, room: 'Main Studio', duration: 60 });
      setSelectedSlot(null);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to add class:', error);
      toast.error(error.message || 'Failed to schedule class');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    
    try {
      const { error } = await supabase
        .from('gym_classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast.success('Class deleted');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class');
    }
  };

  const getClassesForDay = (dayIndex: number) => {
    return filteredClasses.filter(c => c.day_of_week === dayIndex);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
  };

  const [activeMainTab, setActiveMainTab] = useState('schedule');

  if (loading) {
    return (
      <GymLayout title="Gym Schedule" subtitle="Manage your class schedule">
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GymLayout>
    );
  }

  return (
    <GymLayout title="Gym Schedule" subtitle="Manage your class schedule">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-b border-border/30 pb-2">
          <button
            onClick={() => setActiveMainTab('schedule')}
            className={cn(
              "text-sm font-medium pb-2 -mb-2 transition-colors",
              activeMainTab === 'schedule' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveMainTab('bookings')}
            className={cn(
              "text-sm font-medium pb-2 -mb-2 transition-colors",
              activeMainTab === 'bookings' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveMainTab('availability')}
            className={cn(
              "text-sm font-medium pb-2 -mb-2 transition-colors",
              activeMainTab === 'availability' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Instructor Availability
          </button>
          <button
            onClick={() => setActiveMainTab('programs')}
            className={cn(
              "text-sm font-medium pb-2 -mb-2 transition-colors",
              activeMainTab === 'programs' 
              ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Programs
          </button>
        </div>

        {activeMainTab === 'bookings' ? (
          <SessionBookings />
        ) : activeMainTab === 'availability' ? (
          <InstructorAvailability />
        ) : activeMainTab === 'programs' ? (
          <ProgramsEmbed />
        ) : (
          <>
            {/* Header Card */}
            <Card className="bg-card border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Left - Title & Filters */}
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground">Gym Schedule</h2>
                    <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                      <SelectTrigger className="w-[180px] bg-background border-border/30">
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs ({classes.length})</SelectItem>
                        {allProgramNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name} ({programCounts[name] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select defaultValue="schedule">
                      <SelectTrigger className="w-[120px] bg-background border-border/30">
                        <SelectValue placeholder="Schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="schedule">Schedule</SelectItem>
                        <SelectItem value="calendar">Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Right - Settings */}
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

        {/* Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-medium text-foreground">
                  {format(currentWeek, 'dd/MM/yyyy')} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border/30" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Toggle & Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border/30 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
            </div>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/30">
                <DialogHeader>
                  <DialogTitle className="uppercase font-bold tracking-wide">Schedule New Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background border-border/30",
                              selectedSlot?.day === undefined && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {selectedSlot?.day !== undefined ? DAYS[selectedSlot.day] : 'Select day'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border/30" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedSlot?.day !== undefined ? addDays(currentWeek, selectedSlot.day) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedSlot(prev => ({ ...prev!, day: date.getDay() }));
                              }
                            }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={selectedSlot?.time || ''}
                        onChange={(e) => setSelectedSlot(prev => ({ ...prev!, time: e.target.value }))}
                        className="bg-background border-border/30"
                        step={300}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Class Name *</Label>
                    <Input 
                      placeholder="e.g., Morning Yoga"
                      value={classForm.name}
                      onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-background border-border/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Studio Instructor</Label>
                    <Select 
                      value={classForm.instructor_id} 
                      onValueChange={(v) => setClassForm(prev => ({ ...prev, instructor_id: v }))}
                    >
                      <SelectTrigger className="bg-background border-border/30">
                        <SelectValue placeholder={coaches.length === 0 ? "No instructors available" : "Select instructor"} />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {coaches.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Assign 'Studio' or 'Coach' role to users first
                          </div>
                        ) : (
                          coaches.map((coach) => {
                            const status = getInstructorAvailabilityStatus(coach.id);
                            return (
                              <SelectItem key={coach.id} value={coach.id}>
                                <div className="flex items-center gap-2">
                                  <span className={cn(!status.available && "text-muted-foreground")}>{coach.name}</span>
                                  {selectedSlot && (
                                    status.available ? (
                                      <span className="text-xs text-emerald-500">✓</span>
                                    ) : (
                                      <span className="text-xs text-amber-500">⚠</span>
                                    )
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {classForm.instructor_id && selectedSlot && (
                      (() => {
                        const status = getInstructorAvailabilityStatus(classForm.instructor_id);
                        if (!status.available) {
                          return (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {status.message}
                            </p>
                          );
                        }
                        return (
                          <p className="text-xs text-emerald-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Available at this time
                          </p>
                        );
                      })()
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Input 
                        type="number"
                        min={15}
                        max={240}
                        step={5}
                        value={classForm.duration}
                        onChange={(e) => setClassForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        className="bg-background border-border/30"
                        placeholder="e.g., 60"
                      />
                      <p className="text-xs text-muted-foreground">15–240 minutes</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input 
                        type="number"
                        value={classForm.capacity}
                        onChange={(e) => setClassForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))}
                        className="bg-background border-border/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input 
                      placeholder="Main Studio"
                      value={classForm.room}
                      onChange={(e) => setClassForm(prev => ({ ...prev, room: e.target.value }))}
                      className="bg-background border-border/30"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddClass} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Schedule Class
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <Card className="bg-card border-border/30">
            <CardContent className="p-0">
              {classes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No classes scheduled yet. Click "Add Class" to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead>Class Name</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((cls) => (
                      <TableRow 
                        key={cls.id} 
                        className="border-border/20 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleClassClick(cls)}
                      >
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.instructor_name}</TableCell>
                        <TableCell>{DAYS[cls.day_of_week]}</TableCell>
                        <TableCell>{formatTime(cls.start_time)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {cls.capacity}
                          </div>
                        </TableCell>
                        <TableCell>{cls.room || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClass(cls.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Grid/Calendar View */
          <Card className="bg-card border-border/30 overflow-hidden">
            <CardContent className="p-0">
              {/* Week Header */}
              <div className="grid grid-cols-7 border-b border-border/20">
                {weekDays.map((day, index) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "p-4 text-center border-r border-border/20 last:border-r-0",
                        isToday && "bg-primary/5"
                      )}
                    >
                      <p className={cn(
                        "text-2xl font-bold",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {format(day, 'd')}
                      </p>
                      <p className={cn(
                        "text-xs font-medium uppercase",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        {DAYS_FULL[index]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Classes Grid */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekDays.map((day, dayIndex) => {
                  const dayClasses = getClassesForDay(dayIndex);
                  const isToday = isSameDay(day, today);
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={cn(
                        "border-r border-border/20 last:border-r-0 p-2 space-y-2",
                        isToday && "bg-primary/5"
                      )}
                    >
                      {dayClasses.map((cls) => (
                        <div 
                          key={cls.id} 
                          className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm group relative hover:bg-primary/20 transition-colors cursor-pointer"
                          onClick={() => handleClassClick(cls)}
                        >
                          <p className="font-semibold text-foreground">{cls.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(cls.start_time)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cls.instructor_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            {cls.capacity} spots
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClass(cls.id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                      {dayClasses.length === 0 && (
                        <div 
                          className="h-full min-h-[100px] flex items-center justify-center text-muted-foreground/50 cursor-pointer hover:bg-muted/20 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedSlot({ day: dayIndex, time: '09:00' });
                            setAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </div>

      {/* Class Roster Modal */}
      <ClassRosterModal
        open={rosterModalOpen}
        onOpenChange={setRosterModalOpen}
        gymClass={selectedClass}
        onUpdate={fetchData}
      />
    </GymLayout>
  );
}