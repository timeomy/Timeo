import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Receipt, FileJson, FileSpreadsheet, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

interface PaymentExportData {
  order_id: string;
  amount: number;
  plan_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  receipt_url: string | null;
  payer_name: string | null;
  notes: string | null;
  booking_date: string | null;
  payment_date: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  member_id: string | null;
}

export function BillingExportCard() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchPaymentData = async (): Promise<PaymentExportData[]> => {
    let query = supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply date filters if set
    if (startDate) {
      query = query.gte('created_at', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      query = query.lte('created_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) throw paymentsError;
    if (!payments || payments.length === 0) return [];

    // Get unique user IDs
    const userIds = [...new Set(payments.map(p => p.user_id))];

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, member_id')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Create lookup map
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Combine data
    return payments.map(payment => {
      const profile = profileMap.get(payment.user_id);
      return {
        order_id: payment.order_id,
        amount: payment.amount,
        plan_type: payment.plan_type,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        receipt_url: payment.receipt_url,
        payer_name: payment.payer_name,
        notes: payment.notes,
        booking_date: payment.booking_date,
        payment_date: payment.payment_date,
        user_id: payment.user_id,
        user_name: profile?.name || null,
        user_email: profile?.email || null,
        member_id: profile?.member_id || null,
      };
    });
  };

  const handleExport = async (exportFormat: 'json' | 'csv') => {
    setLoading(true);
    try {
      const data = await fetchPaymentData();

      if (data.length === 0) {
        toast.error('No payment records found for the selected date range');
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      const dateRangeStr = startDate || endDate 
        ? `_${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'end'}`
        : '';

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `billing-export${dateRangeStr}_${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const headers = [
          'Order ID',
          'Amount (RM)',
          'Plan Type',
          'Status',
          'Payer Name',
          'User Name',
          'User Email',
          'Member ID',
          'Receipt URL',
          'Notes',
          'Booking Date',
          'Payment Date',
          'Created At',
          'Updated At',
        ];

        const rows = data.map(row => [
          row.order_id,
          row.amount.toFixed(2),
          row.plan_type,
          row.status,
          row.payer_name || '',
          row.user_name || '',
          row.user_email || '',
          row.member_id || '',
          row.receipt_url || '',
          row.notes || '',
          row.booking_date || '',
          row.payment_date || '',
          row.created_at,
          row.updated_at,
        ]);

        content = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        filename = `billing-export${dateRangeStr}_${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
        mimeType = 'text/csv';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} payment records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export billing data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-5 w-5 text-primary" />
          Billing & Payment History
        </CardTitle>
        <CardDescription>
          Export all payment requests with receipts, order IDs, amounts, and payer info
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd MMM yyyy') : 'All time'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
                {startDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setStartDate(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd MMM yyyy') : 'Present'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
                {endDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setEndDate(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Data Included */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">Order ID</Badge>
          <Badge variant="secondary" className="text-xs">Amount</Badge>
          <Badge variant="secondary" className="text-xs">Plan Type</Badge>
          <Badge variant="secondary" className="text-xs">Status</Badge>
          <Badge variant="secondary" className="text-xs">Payer Name</Badge>
          <Badge variant="secondary" className="text-xs">User Info</Badge>
          <Badge variant="secondary" className="text-xs">Receipt URL</Badge>
          <Badge variant="secondary" className="text-xs">Notes</Badge>
          <Badge variant="secondary" className="text-xs">Dates</Badge>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => handleExport('json')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileJson className="h-4 w-4 mr-2" />
            )}
            Export JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
