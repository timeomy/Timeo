import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Gift } from 'lucide-react';
import { exportToCSV, flattenVoucherData } from '@/lib/csvExport';

export function VoucherExportCard() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          id,
          code,
          title,
          description,
          value,
          status,
          current_redemptions,
          max_redemptions,
          valid_from,
          expires_at,
          created_at,
          vendors:vendor_id (
            business_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No vouchers to export');
        return;
      }

      const flatData = flattenVoucherData(data);
      exportToCSV(flatData, 'voucher_usage_export', [
        { key: 'code', header: 'Code' },
        { key: 'title', header: 'Title' },
        { key: 'description', header: 'Description' },
        { key: 'value', header: 'Value' },
        { key: 'vendor', header: 'Vendor' },
        { key: 'status', header: 'Status' },
        { key: 'current_redemptions', header: 'Current Redemptions' },
        { key: 'max_redemptions', header: 'Max Redemptions' },
        { key: 'valid_from', header: 'Valid From' },
        { key: 'expires_at', header: 'Expires At' },
        { key: 'created_at', header: 'Created At' },
      ]);

      toast.success(`Export Complete: ${flatData.length} vouchers`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export vouchers');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Voucher Usage
        </CardTitle>
        <CardDescription>
          Export all vouchers with redemption statistics
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
              Export Voucher Usage
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
