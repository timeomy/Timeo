import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Database, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ExportedUser {
  // Profile data
  user_id: string;
  member_id: string | null;
  name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  legacy_id: string | null;
  nfc_card_id: string | null;
  profile_created_at: string | null;
  profile_updated_at: string | null;
  
  // Membership data
  membership_id: string | null;
  plan_type: string | null;
  membership_status: string | null;
  valid_from: string | null;
  expiry_date: string | null;
  membership_created_at: string | null;
  membership_updated_at: string | null;
  
  // Role data
  role: string | null;
  
  // Waiver data
  waiver_signed_at: string | null;
  waiver_signature_name: string | null;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function FullUserMigrationExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFullExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    setProgress('Fetching profiles...');
    
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      setProgress(`Found ${profiles?.length || 0} profiles. Fetching memberships...`);
      
      // Fetch all memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('*');
      
      if (membershipsError) throw membershipsError;
      
      setProgress('Fetching user roles...');
      
      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      setProgress('Combining data...');
      
      // Create membership and role lookup maps
      const membershipMap = new Map(memberships?.map(m => [m.user_id, m]) || []);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      // Combine all data
      const exportedUsers: ExportedUser[] = (profiles || []).map(profile => {
        const membership = membershipMap.get(profile.id);
        const role = roleMap.get(profile.id);
        
        return {
          // Profile data
          user_id: profile.id,
          member_id: profile.member_id,
          name: profile.name,
          email: profile.email,
          phone_number: profile.phone_number,
          address: profile.address,
          avatar_url: profile.avatar_url,
          legacy_id: profile.legacy_id,
          nfc_card_id: profile.nfc_card_id,
          profile_created_at: profile.created_at,
          profile_updated_at: profile.updated_at,
          
          // Membership data
          membership_id: membership?.id || null,
          plan_type: membership?.plan_type || null,
          membership_status: membership?.status || null,
          valid_from: membership?.valid_from || null,
          expiry_date: membership?.expiry_date || null,
          membership_created_at: membership?.created_at || null,
          membership_updated_at: membership?.updated_at || null,
          
          // Role
          role: role || null,
          
          // Waiver
          waiver_signed_at: profile.waiver_signed_at,
          waiver_signature_name: profile.waiver_signature_name,
        };
      });
      
      setProgress(`Exporting ${exportedUsers.length} users...`);
      
      if (format === 'csv') {
        const csv = convertToCSV(exportedUsers as unknown as Record<string, unknown>[]);
        downloadCSV('full_user_migration_export', csv);
      } else {
        downloadJSON('full_user_migration_export', {
          exported_at: new Date().toISOString(),
          total_users: exportedUsers.length,
          users: exportedUsers,
        });
      }
      
      toast.success(`Exported ${exportedUsers.length} users successfully`);
      setProgress('');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export users');
      setProgress('');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border-2 border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Database className="h-5 w-5" />
          Full User Migration Export
        </CardTitle>
        <CardDescription>
          Export all user data for migration to Convex or another backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Password Security Notice</AlertTitle>
          <AlertDescription>
            Passwords are stored as secure one-way hashes and <strong>cannot be exported or decrypted</strong>. 
            Users will need to reset their passwords on your new system using "Forgot Password" or you'll need to send password reset emails.
          </AlertDescription>
        </Alert>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Included in export:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>User ID, Member ID, Name, Email, Phone, Address</li>
            <li>Profile Photo URLs (avatar_url)</li>
            <li>Plan Type, Membership Status, Valid From, Expiry Date</li>
            <li>User Roles (admin, coach, member, vendor, etc.)</li>
            <li>Legacy ID, NFC Card ID</li>
            <li>Waiver signature data</li>
            <li>All timestamps (created_at, updated_at)</li>
          </ul>
        </div>
        
        {progress && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            {progress}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={() => handleFullExport('json')}
            disabled={exporting}
            className="flex-1 gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export as JSON
              </>
            )}
          </Button>
          
          <Button
            onClick={() => handleFullExport('csv')}
            disabled={exporting}
            variant="outline"
            className="flex-1 gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export as CSV
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
