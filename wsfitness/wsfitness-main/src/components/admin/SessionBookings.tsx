import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Filter, Calendar as CalendarIcon, Clock, User, Loader2, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Enrollment {
  id: string;
  member_id: string;
  class_id: string;
  status: string;
  enrolled_at: string;
  attended: boolean;
  class_name?: string;
  class_date?: string;
  start_time?: string;
  member_name?: string;
}

interface GymClass {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  capacity: number;
  class_date: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export function SessionBookings() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Book session form state
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [booking, setBooking] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    fetchEnrollments();
    fetchClasses();
    fetchMembers();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const { data: enrollmentsData, error } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          gym_classes (name, class_date, start_time, day_of_week)
        `)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Get member names
      const memberIds = [...new Set(enrollmentsData?.map(e => e.member_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const formatted = (enrollmentsData || []).map((e: any) => ({
        ...e,
        class_name: e.gym_classes?.name || 'Unknown Class',
        class_date: e.gym_classes?.class_date,
        start_time: e.gym_classes?.start_time,
        member_name: profileMap.get(e.member_id) || 'Unknown',
      }));

      setEnrollments(formatted);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('gym_classes')
        .select('*')
        .order('start_time');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      // Get all users with member role
      const { data: memberRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'member');

      if (memberRoles && memberRoles.length > 0) {
        const memberIds = memberRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', memberIds);

        setMembers(profiles || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    const [hours] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:00 ${period}`;
  };

  const handleBookSession = async () => {
    if (!selectedMember || !selectedClass) {
      toast.error('Please select a member and class');
      return;
    }

    setBooking(true);
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          member_id: selectedMember,
          class_id: selectedClass,
          status: 'enrolled',
        });

      if (error) throw error;

      toast.success('Session booked successfully');
      setSelectedMember('');
      setSelectedClass('');
      setSelectedDate(new Date());
      setSelectedTime('');
      await fetchEnrollments();
      setActiveTab('upcoming');
    } catch (error: any) {
      console.error('Failed to book session:', error);
      toast.error(error.message || 'Failed to book session');
    } finally {
      setBooking(false);
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = e.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'upcoming') {
      return matchesSearch && e.status === 'enrolled' && !e.attended;
    } else if (activeTab === 'previous') {
      return matchesSearch && (e.attended || e.status === 'cancelled');
    }
    return matchesSearch;
  });

  const getStatusBadge = (enrollment: Enrollment) => {
    if (enrollment.attended) {
      return <Badge className="bg-green-500">Attended</Badge>;
    }
    if (enrollment.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="secondary">Booked</Badge>;
  };

  const getClassesForDay = (date: Date | undefined) => {
    if (!date) return classes;
    const dayOfWeek = date.getDay();
    return classes.filter(c => c.day_of_week === dayOfWeek);
  };

  const availableClasses = getClassesForDay(selectedDate);

  return (
    <div className="space-y-4">
      <Card className="bg-primary border-0">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold text-primary-foreground">Session Bookings</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="bg-transparent border-0 gap-4">
              <TabsTrigger 
                value="upcoming" 
                className="text-primary-foreground/70 data-[state=active]:text-primary-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-foreground rounded-none pb-2"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="previous"
                className="text-primary-foreground/70 data-[state=active]:text-primary-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-foreground rounded-none pb-2"
              >
                Previous
              </TabsTrigger>
              <TabsTrigger 
                value="book"
                className="text-primary-foreground/70 data-[state=active]:text-primary-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-foreground rounded-none pb-2"
              >
                Book Session
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="text-primary-foreground/70 data-[state=active]:text-primary-foreground data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-foreground rounded-none pb-2"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {activeTab === 'book' ? (
        <Card className="bg-card border-border/30">
          <CardContent className="p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <CalendarCheck className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Book a Session</h3>
                <p className="text-muted-foreground text-sm">Select a member, date, and class to book a session</p>
              </div>

              <div className="space-y-4">
                {/* Member Selection */}
                <div className="space-y-2">
                  <Label>Select Member *</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="bg-background border-border/30">
                      <SelectValue placeholder="Search and select member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} {member.email && `(${member.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection with Calendar */}
                <div className="space-y-2">
                  <Label>Select Date *</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background border-border/30",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border/30" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedClass(''); // Reset class when date changes
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Class Selection */}
                <div className="space-y-2">
                  <Label>Select Class *</Label>
                  {availableClasses.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2">No classes available on this day</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableClasses.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => setSelectedClass(cls.id)}
                          className={cn(
                            "p-4 rounded-lg border cursor-pointer transition-colors",
                            selectedClass === cls.id
                              ? "bg-primary/10 border-primary"
                              : "bg-background border-border/30 hover:border-primary/50"
                          )}
                        >
                          <p className="font-medium">{cls.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {cls.capacity} spots available
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleBookSession} 
                  disabled={booking || !selectedMember || !selectedClass}
                  className="w-full"
                  size="lg"
                >
                  {booking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Book Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'settings' ? (
        <Card className="bg-card border-border/30">
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              Booking settings coming soon
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search first or last name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border/30"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No bookings found
            </div>
          ) : (
            <Card className="bg-card border-border/30">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead>Member</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.id} className="border-border/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {enrollment.member_name}
                          </div>
                        </TableCell>
                        <TableCell>{enrollment.class_name}</TableCell>
                        <TableCell>
                          {enrollment.class_date 
                            ? format(new Date(enrollment.class_date), 'dd/MM/yyyy')
                            : format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(enrollment.start_time || '')}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(enrollment)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
