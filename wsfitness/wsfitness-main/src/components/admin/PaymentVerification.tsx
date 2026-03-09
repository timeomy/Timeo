import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval, subDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Eye, CheckCircle, XCircle, Loader2, Clock, ExternalLink, RefreshCw, AlertTriangle, Calendar as CalendarIcon, Filter, X, ChevronLeft, ChevronRight, Search, Download, Ban, Trash2, MoreHorizontal } from 'lucide-react';
import { sanitizeForPdf } from '@/lib/pdfSanitize';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';

interface PaymentRequest {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  plan_type: string;
  receipt_url: string | null;
  status: string;
  payment_date: string | null;
  payer_name: string | null;
  created_at: string;
  notes?: string | null;
  booking_date?: string | null; // Day Pass: selected visit date
  member_name?: string;
  member_email?: string;
}

export function PaymentVerification() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  
  // Transaction Details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentRequest | null>(null);
  
  // Rejection modal state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Day Pass date selection
  const [dayPassDialogOpen, setDayPassDialogOpen] = useState(false);
  const [dayPassRequest, setDayPassRequest] = useState<PaymentRequest | null>(null);
  const [selectedDayPassDate, setSelectedDayPassDate] = useState<Date>(new Date());
  
  // Date filter for payment history
  const [historyDateFrom, setHistoryDateFrom] = useState<Date | undefined>(undefined);
  const [historyDateTo, setHistoryDateTo] = useState<Date | undefined>(undefined);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  
  // Search for payment history
  const [historySearch, setHistorySearch] = useState('');
  
  // Pagination for payment history
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 15;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('id, user_id, order_id, amount, plan_type, receipt_url, status, payment_date, payer_name, created_at, notes, booking_date')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member details
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { name: p.name, email: p.email }]) || []);

        const requestsWithNames = (data || []).map(r => ({
          ...r,
          member_name: profileMap.get(r.user_id)?.name || 'Unknown',
          member_email: profileMap.get(r.user_id)?.email || '',
        }));

        setRequests(requestsWithNames);
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationEmail = async (
    type: 'payment_approved' | 'payment_rejected',
    email: string,
    name: string,
    planType: string,
    orderId: string,
    reason?: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-member-notification', {
        body: {
          type,
          email,
          name,
          orderId,
          planType,
          reason,
        },
      });
      
      if (error) {
        console.error('Failed to send notification email:', error);
      } else {
        console.log('Notification email sent successfully');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const checkIfDayPass = async (request: PaymentRequest): Promise<boolean> => {
    const { data: planData } = await supabase
      .from('membership_plans')
      .select('access_level')
      .eq('title', request.plan_type)
      .maybeSingle();
    return planData?.access_level === 'day_pass';
  };

  const handleApproveClick = async (request: PaymentRequest) => {
    // Check if Day Pass without booking_date
    const isDayPass = await checkIfDayPass(request);
    
    if (isDayPass && !request.booking_date) {
      // Show date picker dialog
      setDayPassRequest(request);
      setSelectedDayPassDate(new Date());
      setDayPassDialogOpen(true);
    } else {
      // Proceed with normal approval
      handleApprove(request, request.booking_date ? new Date(request.booking_date) : undefined);
    }
  };

  const handleApprove = async (request: PaymentRequest, overrideDate?: Date) => {
    setProcessing(request.id);
    
    try {
      // Update payment request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Fetch plan details from membership_plans table using plan_type (title match)
      const { data: planData } = await supabase
        .from('membership_plans')
        .select('duration_months, duration_days, title, access_level')
        .eq('title', request.plan_type)
        .maybeSingle();

      // Check if this is a Day Pass
      const isDayPass = planData?.access_level === 'day_pass';
      
      // Get plan duration: (months * 30) + days
      const durationMonths = planData?.duration_months || 0;
      const durationDays = planData?.duration_days || 0;
      const totalDurationDays = (durationMonths * 30) + durationDays;
      
      let validFrom: string;
      let expiryDate: Date;

      if (isDayPass && (request.booking_date || overrideDate)) {
        // Day Pass with booking date: Use the booking_date or overrideDate as start
        const bookingDateObj = overrideDate || new Date(request.booking_date!);
        validFrom = format(bookingDateObj, 'yyyy-MM-dd');
        // Day Pass respects plan's duration_days (e.g., 3 Day Pass = 3 days from booking)
        expiryDate = addDays(bookingDateObj, Math.max(totalDurationDays, 1) - 1); // -1 because booking day counts as day 1
        expiryDate.setHours(23, 59, 59, 999);
      } else if (isDayPass) {
        // Day Pass without booking_date: default to today
        const today = new Date();
        validFrom = today.toISOString().split('T')[0];
        expiryDate = addDays(today, Math.max(totalDurationDays, 1) - 1);
        expiryDate.setHours(23, 59, 59, 999);
      } else {
        // Standard plan: Calculate based on duration with Sequential Stacking
        
        // Fetch user's current membership to check existing expiry
        const { data: currentMembership } = await supabase
          .from('memberships')
          .select('expiry_date')
          .eq('user_id', request.user_id)
          .maybeSingle();

        // Sequential Stacking: MAX(current_expiry, NOW()) + plan_duration
        const now = new Date();
        let baseDate = now;
        
        if (currentMembership?.expiry_date) {
          const currentExpiry = new Date(currentMembership.expiry_date);
          if (currentExpiry > now) {
            baseDate = currentExpiry; // Extend from current expiry if not yet expired
          }
        }

        // Add total duration (months * 30 + days) to the base date
        expiryDate = addDays(baseDate, totalDurationDays);
        validFrom = now.toISOString().split('T')[0];
      }

      // Update or create membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({
          status: 'active',
          plan_type: request.plan_type,
          valid_from: validFrom,
          expiry_date: isDayPass ? expiryDate.toISOString() : expiryDate.toISOString().split('T')[0],
        })
        .eq('user_id', request.user_id);

      if (membershipError) {
        // If no membership exists, create one
        const { error: createError } = await supabase
          .from('memberships')
          .insert({
            user_id: request.user_id,
            status: 'active',
            plan_type: request.plan_type,
            valid_from: validFrom,
            expiry_date: isDayPass ? expiryDate.toISOString() : expiryDate.toISOString().split('T')[0],
          });

        if (createError) throw createError;
      }

      // Send approval email
      if (request.member_email) {
        await sendNotificationEmail(
          'payment_approved',
          request.member_email,
          request.member_name || 'Member',
          request.plan_type,
          request.order_id
        );
      }

      toast.success(`Payment approved! Membership active until ${expiryDate.toLocaleDateString('en-MY')}`);
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error(error.message || 'Failed to approve payment');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (request: PaymentRequest) => {
    setRejectingRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(rejectingRequest.id);
    
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'rejected' })
        .eq('id', rejectingRequest.id);

      if (error) throw error;

      // Send rejection email with reason
      if (rejectingRequest.member_email) {
        await sendNotificationEmail(
          'payment_rejected',
          rejectingRequest.member_email,
          rejectingRequest.member_name || 'Member',
          rejectingRequest.plan_type,
          rejectingRequest.order_id,
          rejectionReason
        );
      }

      toast.success('Payment rejected. Member has been notified.');
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      setViewReceipt(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(error.message || 'Failed to reject payment');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'voided':
        return <Badge className="bg-muted text-muted-foreground border-muted-foreground/30"><Ban className="h-3 w-3 mr-1" />Voided</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground border-muted"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'pending_cash':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Clock className="h-3 w-3 mr-1" />Cash - Pending</Badge>;
      case 'pending_card':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Card - Pending</Badge>;
      case 'pending_verification':
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending_verification' || r.status === 'pending_cash' || r.status === 'pending_card');
  
  // Filter processed requests by date range and search term
  const processedRequests = requests
    .filter(r => r.status !== 'pending_verification' && r.status !== 'pending_cash' && r.status !== 'pending_card')
    .filter(r => {
      if (!historyDateFrom && !historyDateTo) return true;
      
      const requestDate = new Date(r.created_at);
      const from = historyDateFrom ? startOfDay(historyDateFrom) : new Date(0);
      const to = historyDateTo ? endOfDay(historyDateTo) : new Date();
      
      return isWithinInterval(requestDate, { start: from, end: to });
    })
    .filter(r => {
      if (!historySearch.trim()) return true;
      const search = historySearch.toLowerCase();
      return (
        r.member_name?.toLowerCase().includes(search) ||
        r.member_email?.toLowerCase().includes(search) ||
        r.order_id?.toLowerCase().includes(search) ||
        r.payer_name?.toLowerCase().includes(search)
      );
    });
  
  const clearDateFilter = () => {
    setHistoryDateFrom(undefined);
    setHistoryDateTo(undefined);
  };
  
  const hasDateFilter = historyDateFrom || historyDateTo;

  const generateTransactionReceipt = async (request: PaymentRequest) => {
    // Fetch company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, address, phone, email')
      .limit(1)
      .single();

    const companyName = settings?.company_name || 'My Gym';


    const receiptWidth = 80;
    const doc = new jsPDF({ unit: 'mm', format: [receiptWidth, 200] });
    const margin = 6;
    const contentWidth = receiptWidth - margin * 2;
    let y = 8;

    const dash = (yPos: number) => {
      doc.setDrawColor(0);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, yPos, receiptWidth - margin, yPos);
      doc.setLineDashPattern([], 0);
    };

    const center = (text: string, yPos: number, size: number, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.text(text, receiptWidth / 2, yPos, { align: 'center' });
    };

    doc.setTextColor(0, 0, 0);
    dash(y); y += 2; dash(y); y += 6;

    center(companyName.toUpperCase(), y, 12, 'bold'); y += 5;
    if (settings?.address) { center(settings.address, y, 6); y += 3; }
    if (settings?.phone) { center(`Tel: ${settings.phone}`, y, 6); y += 3; }
    y += 2;

    center('RECEIPT', y, 14, 'bold'); y += 6;
    dash(y); y += 2; dash(y); y += 5;

    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${request.order_id}`, margin, y); y += 4;
    doc.text(`Date: ${format(new Date(request.created_at), 'd MMMM yyyy, h:mm a')}`, margin, y); y += 4;
    doc.text(`Member: ${request.member_name || 'Unknown'}`, margin, y); y += 4;
    if (request.payer_name) {
      doc.text(`Payer: ${request.payer_name}`, margin, y); y += 4;
    }
    y += 1;
    dash(y); y += 5;

    // Line item
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const itemText = `1x ${sanitizeForPdf(request.plan_type)}`;
    const priceText = `RM ${request.amount?.toFixed(2)}`;
    const itemLines = doc.splitTextToSize(itemText, contentWidth - 25);
    itemLines.forEach((line: string, i: number) => {
      doc.text(line, margin, y);
      if (i === 0) doc.text(priceText, receiptWidth - margin, y, { align: 'right' });
      y += 4;
    });
    y += 2; dash(y); y += 6;

    // Total
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT', margin, y);
    doc.text(`RM ${request.amount?.toFixed(2)}`, receiptWidth - margin, y, { align: 'right' });
    y += 5; dash(y); y += 6;

    // Payment method
    const method = request.status === 'approved' && request.notes?.includes('Cash') ? 'CASH' :
                   request.status === 'approved' && request.notes?.includes('Card') ? 'CREDIT CARD' :
                   request.status === 'approved' ? 'PAID' : request.status.toUpperCase();
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(method, margin, y);
    doc.text(`RM ${request.amount?.toFixed(2)}`, receiptWidth - margin, y, { align: 'right' });
    y += 6; dash(y); y += 8;

    // Status
    if (request.status === 'voided') {
      center('*** VOIDED ***', y, 12, 'bold'); y += 6;
    }

    center('THANK YOU', y, 14, 'bold'); y += 8;
    dash(y); y += 6;
    center(request.order_id, y, 7);

    doc.save(`Receipt-${request.order_id}.pdf`);
    toast.success('Receipt downloaded');
  };

  const handleVoidTransaction = async (request: PaymentRequest) => {
    if (!confirm(`Void transaction ${request.order_id}? This will mark it as voided but keep the record.`)) return;

    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'voided', notes: `${request.notes || ''} [VOIDED by admin on ${format(new Date(), 'dd/MM/yyyy HH:mm')}]` })
        .eq('id', request.id);

      if (error) throw error;
      toast.success(`Transaction ${request.order_id} voided`);
      fetchRequests();
    } catch (error) {
      console.error('Error voiding transaction:', error);
      toast.error('Failed to void transaction');
    }
  };

  const handleDeleteTransaction = async (request: PaymentRequest) => {
    if (!confirm(`Permanently delete transaction ${request.order_id}? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('payment_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;
      toast.success(`Transaction ${request.order_id} deleted`);
      fetchRequests();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Verification */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Pending Verification</h3>
            <p className="text-sm text-muted-foreground">
              {pendingRequests.length} payment{pendingRequests.length !== 1 ? 's' : ''} awaiting verification
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {pendingRequests.length === 0 ? (
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              No pending payments to verify
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow 
                    key={request.id} 
                    className="hover:bg-muted/10 cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(request);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <TableCell className="text-sm">
                      {format(new Date(request.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.member_name}</p>
                        <p className="text-xs text-muted-foreground">{request.member_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{request.order_id}</TableCell>
                    <TableCell>{request.plan_type}</TableCell>
                    <TableCell className="font-medium">RM {request.amount?.toFixed(2)}</TableCell>
                    <TableCell>{request.payer_name || '-'}</TableCell>
                    <TableCell>
                      {request.receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setViewReceipt(request.receipt_url);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => handleApproveClick(request)}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => openRejectDialog(request)}
                          disabled={processing === request.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Processed Payments */}
      <div>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Payment History</h3>
              <p className="text-sm text-muted-foreground">
                {processedRequests.length} transaction{processedRequests.length !== 1 ? 's' : ''}
                {(hasDateFilter || historySearch) && ' (filtered)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasDateFilter && (
                <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Date
                </Button>
              )}
              <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(hasDateFilter && "border-primary text-primary")}>
                    <Filter className="h-4 w-4 mr-2" />
                    {hasDateFilter 
                      ? `${historyDateFrom ? format(historyDateFrom, 'dd/MM') : 'Start'} - ${historyDateTo ? format(historyDateTo, 'dd/MM') : 'End'}`
                      : 'Filter by Date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">From Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !historyDateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {historyDateFrom ? format(historyDateFrom, 'dd/MM/yyyy') : 'Select start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={historyDateFrom}
                            onSelect={setHistoryDateFrom}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">To Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !historyDateTo && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {historyDateTo ? format(historyDateTo, 'dd/MM/yyyy') : 'Select end date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={historyDateTo}
                            onSelect={setHistoryDateTo}
                            disabled={(date) => historyDateFrom ? date < historyDateFrom : false}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setHistoryDateFrom(subDays(new Date(), 7));
                          setHistoryDateTo(new Date());
                        }}
                      >
                        Last 7 Days
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setHistoryDateFrom(subDays(new Date(), 30));
                          setHistoryDateTo(new Date());
                        }}
                      >
                        Last 30 Days
                      </Button>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => setDateFilterOpen(false)}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or order ID..."
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setHistoryPage(1); // Reset to first page on search
              }}
              className="pl-10"
            />
          </div>
        </div>

        {processedRequests.length === 0 ? (
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              {(hasDateFilter || historySearch) ? 'No transactions found matching your filters' : 'No payment history yet'}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests
                    .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                    .map((request) => (
                    <TableRow 
                      key={request.id} 
                      className="hover:bg-muted/10 cursor-pointer"
                      onClick={() => {
                        setSelectedTransaction(request);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(request.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{request.member_name}</TableCell>
                      <TableCell className="font-mono text-sm">{request.order_id}</TableCell>
                      <TableCell>RM {request.amount?.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateTransactionReceipt(request)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download Receipt
                            </DropdownMenuItem>
                            {request.status !== 'voided' && (
                              <DropdownMenuItem onClick={() => handleVoidTransaction(request)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Void Transaction
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteTransaction(request)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {Math.ceil(processedRequests.length / historyPageSize) > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((historyPage - 1) * historyPageSize) + 1} - {Math.min(historyPage * historyPageSize, processedRequests.length)} of {processedRequests.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm px-2">
                    Page {historyPage} of {Math.ceil(processedRequests.length / historyPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage(p => Math.min(Math.ceil(processedRequests.length / historyPageSize), p + 1))}
                    disabled={historyPage >= Math.ceil(processedRequests.length / historyPageSize)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt Preview Modal */}
      <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Order: {selectedRequest?.order_id} | Payer: {selectedRequest?.payer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
            {viewReceipt && (
              <img 
                src={viewReceipt} 
                alt="Payment Receipt" 
                className="max-h-[60vh] object-contain rounded-md"
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => window.open(viewReceipt!, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Size
            </Button>
            {selectedRequest && (selectedRequest.status === 'pending_verification' || selectedRequest.status === 'pending_cash' || selectedRequest.status === 'pending_card') && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    openRejectDialog(selectedRequest);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    handleApprove(selectedRequest);
                    setViewReceipt(null);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Order: {rejectingRequest?.order_id} | Member: {rejectingRequest?.member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Receipt is blurry, amount doesn't match, duplicate submission..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be sent to the member via email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing === rejectingRequest?.id}
            >
              {processing === rejectingRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open);
          if (!open) setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onApprove={(request) => {
          handleApproveClick(request);
          setDetailsModalOpen(false);
        }}
        onReject={(request) => {
          setDetailsModalOpen(false);
          openRejectDialog(request);
        }}
        isProcessing={processing === selectedTransaction?.id}
        showActions={selectedTransaction?.status === 'pending_verification' || selectedTransaction?.status === 'pending_cash' || selectedTransaction?.status === 'pending_card'}
      />

      {/* Day Pass Date Selection Dialog */}
      <Dialog open={dayPassDialogOpen} onOpenChange={setDayPassDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Select Day Pass Date
            </DialogTitle>
            <DialogDescription>
              Choose the visit date for {dayPassRequest?.member_name}'s Day Pass
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDayPassDate}
                onSelect={(date) => date && setSelectedDayPassDate(date)}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border border-border bg-background pointer-events-auto"
              />
            </div>
            {selectedDayPassDate && (
              <p className="text-center mt-4 text-sm">
                Visit date: <span className="font-medium text-primary">{format(selectedDayPassDate, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayPassDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dayPassRequest) {
                  handleApprove(dayPassRequest, selectedDayPassDate);
                  setDayPassDialogOpen(false);
                }
              }}
              disabled={!selectedDayPassDate || processing === dayPassRequest?.id}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing === dayPassRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve Day Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}