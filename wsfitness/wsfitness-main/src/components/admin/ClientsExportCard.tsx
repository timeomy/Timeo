import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, FileJson, FileSpreadsheet } from 'lucide-react';

export function ClientsExportCard() {
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    // Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, phone, package_type, total_sessions_purchased, carry_over_sessions, expiry_date, status, assigned_coach_id, member_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) return [];

    // Fetch training logs to compute sessions used
    const clientIds = clients.map(c => c.id);
    const { data: logs, error: logsError } = await supabase
      .from('training_logs')
      .select('client_id, sessions_used')
      .in('client_id', clientIds);
    if (logsError) throw logsError;

    // Fetch coach profiles
    const coachIds = [...new Set(clients.map(c => c.assigned_coach_id).filter(Boolean))] as string[];
    let coachMap = new Map<string, string>();
    if (coachIds.length > 0) {
      const { data: coaches } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', coachIds);
      coachMap = new Map((coaches || []).map(c => [c.id, c.name]));
    }

    // Fetch linked member profiles
    const memberIds = [...new Set(clients.map(c => c.member_id).filter(Boolean))] as string[];
    let memberMap = new Map<string, { email: string | null; member_id: string | null }>();
    if (memberIds.length > 0) {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email, member_id')
        .in('id', memberIds);
      memberMap = new Map((members || []).map(m => [m.id, { email: m.email, member_id: m.member_id }]));
    }

    // Compute sessions used per client
    const sessionsUsedMap = new Map<string, number>();
    for (const log of logs || []) {
      sessionsUsedMap.set(log.client_id, (sessionsUsedMap.get(log.client_id) || 0) + log.sessions_used);
    }

    return clients.map(c => {
      const totalSessions = c.total_sessions_purchased + c.carry_over_sessions;
      const sessionsUsed = sessionsUsedMap.get(c.id) || 0;
      const linked = c.member_id ? memberMap.get(c.member_id) : null;
      return {
        client_id: c.id,
        name: c.name,
        phone: c.phone || '',
        package_type: c.package_type,
        total_sessions: totalSessions,
        sessions_purchased: c.total_sessions_purchased,
        carry_over_sessions: c.carry_over_sessions,
        sessions_used: sessionsUsed,
        sessions_remaining: Math.max(0, totalSessions - sessionsUsed),
        expiry_date: c.expiry_date || '',
        status: c.status,
        assigned_coach: c.assigned_coach_id ? (coachMap.get(c.assigned_coach_id) || 'Unknown') : 'Unassigned',
        linked_member_id: linked?.member_id || '',
        linked_email: linked?.email || '',
        created_at: c.created_at || '',
        updated_at: c.updated_at || '',
      };
    });
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (data.length === 0) {
        toast.error('No clients found');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const blob = new Blob([JSON.stringify({
          exported_at: new Date().toISOString(),
          total_clients: data.length,
          clients: data,
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const keys = ['name', 'phone', 'package_type', 'total_sessions', 'sessions_used', 'sessions_remaining', 'expiry_date', 'status', 'assigned_coach', 'linked_member_id', 'linked_email', 'created_at'];
        const headers = ['Name', 'Phone', 'Package Type', 'Total Sessions', 'Sessions Used', 'Remaining', 'Expiry Date', 'Status', 'Coach', 'Member ID', 'Email', 'Created At'];
        const csv = [
          headers.join(','),
          ...data.map(r => keys.map(k => `"${String((r as any)[k] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${data.length} clients`);
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
          <Users className="h-5 w-5 text-primary" />
          PT Clients
        </CardTitle>
        <CardDescription>
          Export all coaching clients with session balances and coach assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">Sessions Used/Remaining</Badge>
          <Badge variant="secondary" className="text-xs">Coach Assigned</Badge>
          <Badge variant="secondary" className="text-xs">Package Type</Badge>
          <Badge variant="secondary" className="text-xs">Expiry</Badge>
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
