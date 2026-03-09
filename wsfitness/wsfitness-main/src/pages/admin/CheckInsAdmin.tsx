import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, MapPin, Search, Users, Calendar, CheckCircle, XCircle, ShieldAlert, CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface CheckInWithProfile {
  id: string;
  checked_in_at: string;
  location: string | null;
  notes: string | null;
  member_id: string;
  profiles: { name: string; email: string } | null;
}

// Determine status from notes field
function getCheckInStatus(notes: string | null): { status: 'success' | 'rejected'; reason?: string } {
  if (!notes) return { status: 'success' };
  
  const notesLower = notes.toLowerCase();
  if (notesLower.includes('rejected')) {
    // Extract reason from notes
    if (notesLower.includes('expired')) {
      return { status: 'rejected', reason: 'Expired Membership' };
    }
    if (notesLower.includes('status')) {
      return { status: 'rejected', reason: 'Inactive Status' };
    }
    return { status: 'rejected', reason: 'Access Denied' };
  }
  
  return { status: 'success' };
}

type StatusFilter = 'all' | 'success' | 'rejected' | 'unique';

export default function CheckInsAdmin() {
  const [checkIns, setCheckIns] = useState<CheckInWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchCheckIns();
  }, [selectedDate]);

  const fetchCheckIns = async () => {
    setLoading(true);
    const dateStart = startOfDay(new Date(selectedDate)).toISOString();
    const dateEnd = endOfDay(new Date(selectedDate)).toISOString();

    // Get check-ins with notes field
    const { data: checkInsData, error } = await supabase
      .from('check_ins')
      .select('id, checked_in_at, location, notes, member_id')
      .gte('checked_in_at', dateStart)
      .lte('checked_in_at', dateEnd)
      .order('checked_in_at', { ascending: false });

    if (checkInsData && checkInsData.length > 0) {
      // Get unique member IDs
      const memberIds = [...new Set(checkInsData.map(c => c.member_id))];
      
      // Fetch profiles for these members
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', memberIds);
      
      // Map profiles to check-ins
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const enrichedCheckIns = checkInsData.map(c => ({
        ...c,
        profiles: profilesMap.get(c.member_id) || null,
      }));
      
      setCheckIns(enrichedCheckIns as CheckInWithProfile[]);
    } else {
      setCheckIns([]);
    }
    setLoading(false);
  };

  // Get unique successful member IDs for "unique" filter
  const uniqueSuccessMemberIds = new Set(
    checkIns.filter(c => getCheckInStatus(c.notes).status === 'success').map(c => c.member_id)
  );

  // Apply both search and status filters
  const filteredCheckIns = checkIns.filter((c) => {
    const name = (c.profiles as any)?.name?.toLowerCase() || '';
    const email = (c.profiles as any)?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query);
    
    // Status filter
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'unique') {
      // Show only unique successful members (first occurrence)
      const { status } = getCheckInStatus(c.notes);
      if (status !== 'success') return false;
      return matchesSearch && uniqueSuccessMemberIds.has(c.member_id);
    }
    const { status } = getCheckInStatus(c.notes);
    return matchesSearch && status === statusFilter;
  });
  
  // For unique filter, deduplicate by member_id (keep first check-in)
  const displayedCheckIns = statusFilter === 'unique'
    ? filteredCheckIns.filter((c, index, self) => 
        self.findIndex(x => x.member_id === c.member_id) === index
      )
    : filteredCheckIns;

  // Stats
  const totalCount = checkIns.length;
  const successCount = checkIns.filter(c => getCheckInStatus(c.notes).status === 'success').length;
  const rejectedCount = checkIns.filter(c => getCheckInStatus(c.notes).status === 'rejected').length;
  const uniqueMembers = new Set(checkIns.filter(c => getCheckInStatus(c.notes).status === 'success').map((c) => c.member_id)).size;

  return (
    <GymLayout title="Check-In" subtitle="View member check-in activity">
      <div className="p-4 space-y-6">
        {/* Stats Cards - Clickable Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer transition-all hover:scale-[1.02] ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display text-primary">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Scans</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 cursor-pointer transition-all hover:scale-[1.02] ${statusFilter === 'success' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setStatusFilter('success')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-display text-emerald-500">{successCount}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-gradient-to-br from-red-500/10 to-red-500/5 cursor-pointer transition-all hover:scale-[1.02] ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter('rejected')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-display text-red-500">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-gradient-to-br from-secondary/10 to-secondary/5 cursor-pointer transition-all hover:scale-[1.02] ${statusFilter === 'unique' ? 'ring-2 ring-secondary' : ''}`}
            onClick={() => setStatusFilter('unique')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display">{uniqueMembers}</p>
                <p className="text-sm text-muted-foreground">Unique Members</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Check-In Log
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  Filtering: {statusFilter === 'success' ? 'Successful' : statusFilter === 'rejected' ? 'Rejected' : 'Unique Members'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(new Date(selectedDate), 'dd/MM/yyyy') : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate ? new Date(selectedDate) : undefined}
                    onSelect={(date) => date && setSelectedDate(format(date, 'yyyy-MM-dd'))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCheckIns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No check-ins found for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedCheckIns.map((checkIn) => {
                      const { status, reason } = getCheckInStatus(checkIn.notes);
                      return (
                        <TableRow key={checkIn.id} className={status === 'rejected' ? 'bg-red-500/5' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{(checkIn.profiles as any)?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {(checkIn.profiles as any)?.email || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {status === 'success' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Granted
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30 w-fit">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </Badge>
                                {reason && (
                                  <span className="text-xs text-red-400">{reason}</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{checkIn.location || 'Main Entrance'}</TableCell>
                          <TableCell>{format(new Date(checkIn.checked_in_at), 'h:mm a')}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </GymLayout>
  );
}
