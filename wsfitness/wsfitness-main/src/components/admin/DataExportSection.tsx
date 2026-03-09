import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TableConfig = {
  name: string;
  label: string;
  table: string;
};

const TABLES: TableConfig[] = [
  { name: 'profiles', label: 'Members/Profiles', table: 'profiles' },
  { name: 'memberships', label: 'Memberships', table: 'memberships' },
  { name: 'check_ins', label: 'Check-ins', table: 'check_ins' },
  { name: 'user_roles', label: 'User Roles', table: 'user_roles' },
  { name: 'vendors', label: 'Vendors', table: 'vendors' },
  { name: 'vouchers', label: 'Vouchers', table: 'vouchers' },
  { name: 'member_vouchers', label: 'Member Vouchers', table: 'member_vouchers' },
  { name: 'redemption_logs', label: 'Redemption Logs', table: 'redemption_logs' },
  { name: 'clients', label: 'Clients (Coaching)', table: 'clients' },
  { name: 'training_logs', label: 'Training Logs', table: 'training_logs' },
  { name: 'exercises', label: 'Exercises', table: 'exercises' },
  { name: 'gym_classes', label: 'Gym Classes', table: 'gym_classes' },
  { name: 'class_enrollments', label: 'Class Enrollments', table: 'class_enrollments' },
  { name: 'invoices', label: 'Invoices', table: 'invoices' },
  { name: 'invoice_items', label: 'Invoice Items', table: 'invoice_items' },
  { name: 'payments', label: 'Payments', table: 'payments' },
  { name: 'payment_requests', label: 'Payment Requests', table: 'payment_requests' },
  { name: 'notifications', label: 'Notifications', table: 'notifications' },
  { name: 'audit_logs', label: 'Audit Logs', table: 'audit_logs' },
  { name: 'login_logs', label: 'Login Logs', table: 'login_logs' },
  { name: 'invite_codes', label: 'Invite Codes', table: 'invite_codes' },
  { name: 'document_templates', label: 'Document Templates', table: 'document_templates' },
  { name: 'member_document_signatures', label: 'Document Signatures', table: 'member_document_signatures' },
  { name: 'company_settings', label: 'Company Settings', table: 'company_settings' },
];

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
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function DataExportSection() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (config: TableConfig) => {
    setLoading(config.name);
    try {
      // Dynamic table query with type assertion
      const query = supabase.from(config.table as 'profiles').select('*').limit(10000);
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info(`No data found in ${config.label}`);
        return;
      }
      
      const csv = convertToCSV(data as Record<string, unknown>[]);
      downloadCSV(config.name, csv);
      toast.success(`Downloaded ${data.length} rows from ${config.label}`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export ${config.label}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Database className="h-5 w-5" />
          Data Export (Admin Only)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click a button to download all rows from that table as a CSV file.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {TABLES.map((config) => (
            <Button
              key={config.name}
              variant="outline"
              size="sm"
              onClick={() => handleExport(config)}
              disabled={loading !== null}
              className="justify-start text-xs"
            >
              {loading === config.name ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {config.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
