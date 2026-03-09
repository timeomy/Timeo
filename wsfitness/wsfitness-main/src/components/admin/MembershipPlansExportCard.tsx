import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, CreditCard } from 'lucide-react';

interface MembershipPlan {
  id: string;
  title: string;
  price: number;
  duration_months: number;
  duration_days: number;
  access_level: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
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

export function MembershipPlansExportCard() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No membership plans found');
        return;
      }

      // Transform data for export
      const exportData = data.map((plan: MembershipPlan) => ({
        plan_name: plan.title,
        price_rm: plan.price,
        duration_months: plan.duration_months,
        duration_days: plan.duration_days,
        total_days: (plan.duration_months * 30) + plan.duration_days,
        access_type: plan.access_level,
        description: plan.description?.replace(/\n/g, ' ') || '',
        is_active: plan.is_active ? 'Yes' : 'No',
        display_order: plan.display_order,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }));

      if (format === 'csv') {
        const csv = convertToCSV(exportData as Record<string, unknown>[]);
        downloadCSV('membership_plans_export', csv);
      } else {
        downloadJSON('membership_plans_export', {
          exported_at: new Date().toISOString(),
          total_plans: exportData.length,
          plans: exportData,
        });
      }

      toast.success(`Exported ${exportData.length} membership plans`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export membership plans');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Membership Plans
        </CardTitle>
        <CardDescription>
          Export all plan configurations (name, price, duration, access type)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            variant="outline"
            className="flex-1 gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            disabled={exporting}
            variant="default"
            className="flex-1 gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
