import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, CalendarIcon, Dumbbell } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExportRow {
  coach_name: string;
  client_name: string;
  client_member_id: string;
  workout_date: string;
  training_type: string;
  workout_notes: string;
}

export function CoachClientExportWithDates() {
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Step 1: Fetch all coaches
      const { data: coachRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach');

      if (rolesError) throw rolesError;

      const coachIds = coachRoles?.map(r => r.user_id) || [];
      
      if (coachIds.length === 0) {
        toast.error('No coaches found to export');
        setExporting(false);
        return;
      }

      // Step 2: Fetch coach profiles
      const { data: coachProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', coachIds);

      if (profilesError) throw profilesError;

      const coachMap = new Map(coachProfiles?.map(p => [p.id, p.name]) || []);

      // Step 3: Fetch all clients with assigned coaches
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, assigned_coach_id')
        .in('assigned_coach_id', coachIds);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        toast.error('No clients assigned to coaches');
        setExporting(false);
        return;
      }

      // Step 4: Fetch training logs with optional date filter
      const clientIds = clients.map(c => c.id);
      let logsQuery = supabase
        .from('training_logs')
        .select('client_id, date, training_type, notes')
        .in('client_id', clientIds)
        .order('date', { ascending: false });

      // Apply date filters if provided
      if (startDate) {
        logsQuery = logsQuery.gte('date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        logsQuery = logsQuery.lte('date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data: trainingLogs, error: logsError } = await logsQuery;

      if (logsError) throw logsError;

      // Build export data
      const exportData: ExportRow[] = [];

      for (const client of clients) {
        const coachName = coachMap.get(client.assigned_coach_id!) || 'Unknown Coach';
        const clientLogs = trainingLogs?.filter(log => log.client_id === client.id) || [];

        if (clientLogs.length === 0) {
          // Include inactive clients with empty workout data
          exportData.push({
            coach_name: coachName,
            client_name: client.name,
            client_member_id: client.id.substring(0, 8).toUpperCase(),
            workout_date: '',
            training_type: '',
            workout_notes: 'No workouts recorded',
          });
        } else {
          // Add a row for each workout
          for (const log of clientLogs) {
            exportData.push({
              coach_name: coachName,
              client_name: client.name,
              client_member_id: client.id.substring(0, 8).toUpperCase(),
              workout_date: log.date ? format(new Date(log.date), 'yyyy-MM-dd') : '',
              training_type: formatTrainingType(log.training_type),
              workout_notes: log.notes || '',
            });
          }
        }
      }

      // Sort by coach name, then client name, then date
      exportData.sort((a, b) => {
        if (a.coach_name !== b.coach_name) return a.coach_name.localeCompare(b.coach_name);
        if (a.client_name !== b.client_name) return a.client_name.localeCompare(b.client_name);
        return b.workout_date.localeCompare(a.workout_date);
      });

      // Build filename with date range
      const dateRangeStr = startDate && endDate 
        ? `_${format(startDate, 'yyyyMMdd')}_to_${format(endDate, 'yyyyMMdd')}`
        : startDate 
          ? `_from_${format(startDate, 'yyyyMMdd')}`
          : endDate 
            ? `_until_${format(endDate, 'yyyyMMdd')}`
            : '_all_time';

      // Export to CSV
      exportToCSV(exportData, `coach_client_history${dateRangeStr}`, [
        { key: 'coach_name', header: 'Coach Name' },
        { key: 'client_name', header: 'Client Name' },
        { key: 'client_member_id', header: 'Client Member ID' },
        { key: 'workout_date', header: 'Workout Date' },
        { key: 'training_type', header: 'Training Type' },
        { key: 'workout_notes', header: 'Workout Notes/Details' },
      ]);

      const periodStr = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}`
        : 'All Time';
      toast.success(`Export Complete: ${exportData.length} records (${periodStr})`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Coach & Client History
        </CardTitle>
        <CardDescription>
          Export full workout history for all coaches and their clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Pickers */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "All time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "All time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Clear dates button */}
        {(startDate || endDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
            className="text-muted-foreground"
          >
            Clear date filters
          </Button>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={exporting}
          className="w-full gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Coach/Client History
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatTrainingType(type: string): string {
  const labels: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    legs: 'Legs',
    shoulders: 'Shoulders',
    arms: 'Arms',
    core: 'Core',
    cardio: 'Cardio',
    full_body: 'Full Body',
    stretching: 'Stretching',
  };
  return labels[type] || type;
}
