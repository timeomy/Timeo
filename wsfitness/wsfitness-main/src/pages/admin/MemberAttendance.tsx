import { useState, useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { MemberTabNav } from '@/components/admin/MemberTabNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Users, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttendanceRecord {
  member_id: string;
  member_name: string;
  total_checkins: number;
  last_checkin: string | null;
}

export default function MemberAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    try {
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // Get all check-ins for the month
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('member_id, checked_in_at')
        .gte('checked_in_at', startDate.toISOString())
        .lte('checked_in_at', endDate.toISOString());

      if (checkInsError) throw checkInsError;

      // Get member profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) throw profilesError;

      // Aggregate check-ins by member
      const attendanceMap = new Map<string, { count: number; lastCheckin: string | null }>();
      
      checkIns?.forEach((checkin) => {
        const existing = attendanceMap.get(checkin.member_id);
        if (existing) {
          existing.count++;
          if (!existing.lastCheckin || checkin.checked_in_at > existing.lastCheckin) {
            existing.lastCheckin = checkin.checked_in_at;
          }
        } else {
          attendanceMap.set(checkin.member_id, {
            count: 1,
            lastCheckin: checkin.checked_in_at,
          });
        }
      });

      // Build records with member names
      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      const attendanceRecords: AttendanceRecord[] = [];

      attendanceMap.forEach((value, memberId) => {
        attendanceRecords.push({
          member_id: memberId,
          member_name: profileMap.get(memberId) || 'Unknown Member',
          total_checkins: value.count,
          last_checkin: value.lastCheckin,
        });
      });

      // Sort by total check-ins descending
      attendanceRecords.sort((a, b) => b.total_checkins - a.total_checkins);

      setRecords(attendanceRecords);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) =>
    record.member_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCheckins = records.reduce((sum, r) => sum + r.total_checkins, 0);

  return (
    <GymLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground text-sm">WS Fitness</p>
          </div>
        </div>

        <MemberTabNav />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCheckins}</div>
              <p className="text-muted-foreground text-sm">Total Check-ins This Month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{records.length}</div>
              <p className="text-muted-foreground text-sm">Active Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {records.length > 0 ? (totalCheckins / records.length).toFixed(1) : 0}
              </div>
              <p className="text-muted-foreground text-sm">Avg. Visits per Member</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Attendance Records</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                  className="w-40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found for this period.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Total Check-ins</TableHead>
                    <TableHead>Last Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.member_id}>
                      <TableCell className="font-medium">{record.member_name}</TableCell>
                      <TableCell>{record.total_checkins}</TableCell>
                      <TableCell>
                        {record.last_checkin
                          ? format(new Date(record.last_checkin), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </GymLayout>
  );
}
