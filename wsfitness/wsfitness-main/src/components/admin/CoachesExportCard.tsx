import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, UserCheck, FileJson, FileSpreadsheet } from 'lucide-react';

export function CoachesExportCard() {
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    // Fetch all coach user IDs
    const { data: coachRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'coach');
    if (rolesError) throw rolesError;

    const coachIds = coachRoles?.map(r => r.user_id) || [];
    if (coachIds.length === 0) return [];

    // Fetch coach profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, member_id, avatar_url, created_at')
      .in('id', coachIds);
    if (profilesError) throw profilesError;

    // Fetch all clients to count per coach
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, assigned_coach_id, status, total_sessions_purchased, carry_over_sessions, package_type, expiry_date')
      .in('assigned_coach_id', coachIds);
    if (clientsError) throw clientsError;

    // Build coach map
    return (profiles || []).map(p => {
      const coachClients = (clients || []).filter(c => c.assigned_coach_id === p.id);
      return {
        coach_id: p.id,
        member_id: p.member_id || '',
        name: p.name,
        email: p.email || '',
        phone: p.phone_number || '',
        avatar_url: p.avatar_url || '',
        total_clients: coachClients.length,
        active_clients: coachClients.filter(c => c.status === 'active').length,
        expired_clients: coachClients.filter(c => c.status === 'expired').length,
        clients: coachClients.map(c => ({
          client_id: c.id,
          client_name: c.name,
          package_type: c.package_type,
          total_sessions: c.total_sessions_purchased + c.carry_over_sessions,
          status: c.status,
          expiry_date: c.expiry_date || '',
        })),
        joined_at: p.created_at || '',
      };
    });
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const data = await fetchData();
      if (data.length === 0) {
        toast.error('No coaches found');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const blob = new Blob([JSON.stringify({
          exported_at: new Date().toISOString(),
          total_coaches: data.length,
          coaches: data,
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coaches_export_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Flatten for CSV
        const rows = data.map(c => ({
          member_id: c.member_id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          total_clients: c.total_clients,
          active_clients: c.active_clients,
          expired_clients: c.expired_clients,
          joined_at: c.joined_at,
        }));
        const headers = ['Member ID', 'Name', 'Email', 'Phone', 'Total Clients', 'Active Clients', 'Expired Clients', 'Joined At'];
        const keys = ['member_id', 'name', 'email', 'phone', 'total_clients', 'active_clients', 'expired_clients', 'joined_at'];
        const csv = [
          headers.join(','),
          ...rows.map(r => keys.map(k => `"${String((r as any)[k] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coaches_export_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${data.length} coaches`);
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
          <UserCheck className="h-5 w-5 text-primary" />
          Coaches
        </CardTitle>
        <CardDescription>
          Export all coaches with client counts and assignment details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">Name & Contact</Badge>
          <Badge variant="secondary" className="text-xs">Client Count</Badge>
          <Badge variant="secondary" className="text-xs">Client Details</Badge>
          <Badge variant="secondary" className="text-xs">Status</Badge>
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
