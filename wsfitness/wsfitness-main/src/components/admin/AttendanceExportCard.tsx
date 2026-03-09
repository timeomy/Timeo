import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, ClipboardCheck } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { format } from 'date-fns';

interface AttendanceExportRow {
  member_id: string;
  member_name: string;
  check_in_date: string;
  check_in_time: string;
  location: string;
  notes: string;
}

export function AttendanceExportCard() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch check-ins with member profiles
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, checked_in_at, location, notes, member_id')
        .order('checked_in_at', { ascending: false })
        .limit(5000);

      if (checkInsError) throw checkInsError;

      if (!checkIns || checkIns.length === 0) {
        toast.error('No attendance records to export');
        setExporting(false);
        return;
      }

      // Fetch profiles for member names
      const memberIds = [...new Set(checkIns.map(c => c.member_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, member_id')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, { name: p.name, member_id: p.member_id }]) || []);

      // Build export data
      const exportData: AttendanceExportRow[] = checkIns.map(checkIn => {
        const profile = profileMap.get(checkIn.member_id);
        const checkInDate = new Date(checkIn.checked_in_at);
        
        return {
          member_id: profile?.member_id || checkIn.member_id.substring(0, 8).toUpperCase(),
          member_name: profile?.name || 'Unknown',
          check_in_date: format(checkInDate, 'yyyy-MM-dd'),
          check_in_time: format(checkInDate, 'HH:mm:ss'),
          location: checkIn.location || 'Main Entrance',
          notes: checkIn.notes || '',
        };
      });

      exportToCSV(exportData, 'attendance_logs_export', [
        { key: 'member_id', header: 'Member ID' },
        { key: 'member_name', header: 'Member Name' },
        { key: 'check_in_date', header: 'Check-In Date' },
        { key: 'check_in_time', header: 'Check-In Time' },
        { key: 'location', header: 'Location' },
        { key: 'notes', header: 'Notes' },
      ]);

      toast.success(`Export Complete: ${exportData.length} attendance records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export attendance');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Attendance Logs
        </CardTitle>
        <CardDescription>
          Export member check-in history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="w-full gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Attendance Logs
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
