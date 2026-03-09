import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Users, Fingerprint } from 'lucide-react';
import { exportToCSV, flattenMemberData, flattenTurnstileData } from '@/lib/csvExport';

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function MemberExportCard() {
  const [exportingMembers, setExportingMembers] = useState(false);
  const [exportingTurnstile, setExportingTurnstile] = useState(false);

  const fetchMemberData = async () => {
    // Fetch all profiles first (includes all users - staff, members, etc.)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, member_id, name, email, phone_number, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch all memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('user_id, plan_type, status, expiry_date, valid_from');

    if (membershipsError) throw membershipsError;

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) throw rolesError;

    // Create lookup maps
    const membershipMap = new Map(memberships?.map(m => [m.user_id, m]) || []);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    // Combine all data - include ALL users
    return (profiles || []).map(profile => ({
      profiles: {
        member_id: profile.member_id,
        name: profile.name,
        email: profile.email,
        phone_number: profile.phone_number,
        avatar_url: profile.avatar_url,
      },
      user_id: profile.id,
      role: roleMap.get(profile.id) || 'member',
      plan_type: membershipMap.get(profile.id)?.plan_type || 'N/A',
      status: membershipMap.get(profile.id)?.status || 'N/A',
      expiry_date: membershipMap.get(profile.id)?.expiry_date || null,
      valid_from: membershipMap.get(profile.id)?.valid_from || null,
      created_at: profile.created_at,
    }));
  };

  const handleExportMembers = async (format: 'csv' | 'json') => {
    setExportingMembers(true);
    try {
      const data = await fetchMemberData();

      if (!data || data.length === 0) {
        toast.error('No members to export');
        return;
      }

      const flatData = flattenMemberData(data);

      if (format === 'csv') {
        exportToCSV(flatData, 'all_users_export', [
          { key: 'member_id', header: 'Member ID' },
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Phone' },
          { key: 'avatar_url', header: 'Profile Photo URL' },
          { key: 'role', header: 'Role' },
          { key: 'plan_type', header: 'Plan Type' },
          { key: 'status', header: 'Status' },
          { key: 'expiry_date', header: 'Expiry Date' },
          { key: 'created_at', header: 'Created At' },
        ]);
      } else {
        downloadJSON('all_users_export', {
          exported_at: new Date().toISOString(),
          total_users: flatData.length,
          users: flatData,
        });
      }

      toast.success(`Export Complete: ${flatData.length} users (including staff)`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export members');
    } finally {
      setExportingMembers(false);
    }
  };

  const handleExportTurnstile = async () => {
    setExportingTurnstile(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          status,
          profiles:user_id (
            member_id,
            name,
            phone_number,
            avatar_url
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No active members to export');
        return;
      }

      const flatData = flattenTurnstileData(data);
      exportToCSV(flatData, 'turnstile_biometrics_export', [
        { key: 'member_id', header: 'Member ID' },
        { key: 'full_name', header: 'Full Name' },
        { key: 'phone_number', header: 'Phone Number' },
        { key: 'biometric_status', header: 'Biometric Status' },
        { key: 'profile_photo_url', header: 'Profile Photo URL' },
      ]);

      toast.success(`Export Complete: ${flatData.length} active members for turnstile`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export turnstile data');
    } finally {
      setExportingTurnstile(false);
    }
  };

  return (
    <>
      <Card className="ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users
          </CardTitle>
          <CardDescription>
            Export all users including staff, with profile photos and roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportMembers('csv')}
              disabled={exportingMembers}
              variant="outline"
              className="flex-1 gap-2"
            >
              {exportingMembers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              CSV
            </Button>
            <Button
              onClick={() => handleExportMembers('json')}
              disabled={exportingMembers}
              variant="default"
              className="flex-1 gap-2"
            >
              {exportingMembers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Turnstile / Biometrics
          </CardTitle>
          <CardDescription>
            Export active member data for turnstile integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportTurnstile}
            disabled={exportingTurnstile}
            variant="outline"
            className="w-full gap-2"
          >
            {exportingTurnstile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export for Turnstile
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
