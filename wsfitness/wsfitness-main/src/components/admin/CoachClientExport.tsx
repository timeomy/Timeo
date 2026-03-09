import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { format } from 'date-fns';

interface ExportRow {
  coach_name: string;
  client_name: string;
  client_member_id: string;
  workout_date: string;
  training_type: string;
  workout_notes: string;
}

export function CoachClientExport() {
  const [exporting, setExporting] = useState(false);

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

      // Step 4: Fetch member IDs from profiles (if clients have linked profiles)
      // For now, clients table doesn't have member_id, so we'll use client id or name
      
      // Step 5: Fetch all training logs for these clients
      const clientIds = clients.map(c => c.id);
      const { data: trainingLogs, error: logsError } = await supabase
        .from('training_logs')
        .select('client_id, date, training_type, notes')
        .in('client_id', clientIds)
        .order('date', { ascending: false });

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

      // Export to CSV
      exportToCSV(exportData, 'coach_client_history', [
        { key: 'coach_name', header: 'Coach Name' },
        { key: 'client_name', header: 'Client Name' },
        { key: 'client_member_id', header: 'Client Member ID' },
        { key: 'workout_date', header: 'Workout Date' },
        { key: 'training_type', header: 'Training Type' },
        { key: 'workout_notes', header: 'Workout Notes/Details' },
      ]);

      toast.success(`Export Complete: ${exportData.length} records exported`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      variant="outline"
      className="gap-2"
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating Report...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export Full Coach/Client History
        </>
      )}
    </Button>
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
