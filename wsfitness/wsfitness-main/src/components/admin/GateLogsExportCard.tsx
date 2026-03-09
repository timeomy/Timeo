import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, DoorOpen, FileJson, FileSpreadsheet, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export function GateLogsExportCard() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const fetchData = async () => {
    let query = supabase
      .from('check_ins')
      .select('id, member_id, checked_in_at, location, notes')
      .order('checked_in_at', { ascending: false })
      .limit(10000);

    if (startDate) query = query.gte('checked_in_at', format(startDate, 'yyyy-MM-dd'));
    if (endDate) query = query.lte('checked_in_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');

    const { data: checkIns, error } = await query;
    if (error) throw error;
    if (!checkIns || checkIns.length === 0) return [];

    // Fetch member profiles
    const memberIds = [...new Set(checkIns.map(c => c.member_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, member_id')
      .in('id', memberIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return checkIns.map(c => {
      const profile = profileMap.get(c.member_id);
      return {
        check_in_id: c.id,
        member_id: profile?.member_id || '',
        member_name: profile?.name || 'Unknown',
        member_email: profile?.email || '',
        checked_in_at: c.checked_in_at,
        location: c.location || 'Main Gate',
        notes: c.notes || '',
      };
    });
  };

  const handleExport = async (fmt: 'json' | 'csv') => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (data.length === 0) {
        toast.error('No gate check-in records found');
        return;
      }

      const dateRangeStr = startDate || endDate
        ? `_${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'end'}`
        : '';
      const dateStr = new Date().toISOString().split('T')[0];

      if (fmt === 'json') {
        const blob = new Blob([JSON.stringify({
          exported_at: new Date().toISOString(),
          date_range: {
            from: startDate ? format(startDate, 'yyyy-MM-dd') : 'all time',
            to: endDate ? format(endDate, 'yyyy-MM-dd') : 'present',
          },
          total_entries: data.length,
          check_ins: data,
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gate_logs${dateRangeStr}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const keys = ['member_id', 'member_name', 'member_email', 'checked_in_at', 'location', 'notes'];
        const headers = ['Member ID', 'Name', 'Email', 'Checked In At', 'Location', 'Notes'];
        const csv = [
          headers.join(','),
          ...data.map(r => keys.map(k => `"${String((r as any)[k] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gate_logs${dateRangeStr}_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${data.length} gate check-in records`);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          Gate / Check-in Logs
        </CardTitle>
        <CardDescription>
          Export all ZahGate check-in records with member details and timestamps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd MMM yyyy') : 'All time'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                {startDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setStartDate(undefined)}>Clear</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd MMM yyyy') : 'Present'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                {endDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setEndDate(undefined)}>Clear</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">Member ID</Badge>
          <Badge variant="secondary" className="text-xs">Timestamp</Badge>
          <Badge variant="secondary" className="text-xs">Location</Badge>
          <Badge variant="secondary" className="text-xs">Notes</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} disabled={loading} variant="outline" className="flex-1 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            CSV
          </Button>
          <Button onClick={() => handleExport('json')} disabled={loading} variant="default" className="flex-1 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
