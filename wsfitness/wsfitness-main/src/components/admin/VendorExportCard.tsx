import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Store } from 'lucide-react';
import { exportToCSV, flattenVendorData } from '@/lib/csvExport';

export function VendorExportCard() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          total_redeemed_count,
          created_at,
          profiles:user_id (
            name,
            email,
            phone_number
          )
        `)
        .order('total_redeemed_count', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No vendors to export');
        return;
      }

      const flatData = flattenVendorData(data);
      exportToCSV(flatData, 'vendor_sales_export', [
        { key: 'business_name', header: 'Business Name' },
        { key: 'contact_name', header: 'Contact Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'total_redeemed', header: 'Total Redeemed' },
        { key: 'created_at', header: 'Created At' },
      ]);

      toast.success(`Export Complete: ${flatData.length} vendors`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export vendors');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Vendor Sales
        </CardTitle>
        <CardDescription>
          Export vendor performance and redemption data
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
              Export Vendor Sales
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
