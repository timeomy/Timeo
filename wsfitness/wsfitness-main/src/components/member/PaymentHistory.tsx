import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Receipt, Download, Loader2, RotateCcw, CheckCircle, XCircle, Clock, Lock, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { MemberTransactionModal } from './MemberTransactionModal';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  invoice_url: string | null;
}

interface PaymentRequest {
  id: string;
  order_id: string;
  amount: number;
  plan_type: string;
  status: string;
  created_at: string;
  receipt_url: string | null;
  payer_name: string | null;
  notes?: string | null;
}

interface PaymentHistoryProps {
  userName?: string;
  onBuyAgain?: () => void;
}

export function PaymentHistory({ userName = 'Member', onBuyAgain }: PaymentHistoryProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Transaction details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentRequest | null>(null);
  
  // Re-upload modal state
  const [reuploadDialogOpen, setReuploadDialogOpen] = useState(false);
  const [reuploadingRequest, setReuploadingRequest] = useState<PaymentRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchPayments = async () => {
    if (!user) return;

    // Fetch both payments and payment requests
    const [paymentsRes, requestsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_requests')
        .select('id, order_id, amount, plan_type, status, created_at, receipt_url, payer_name, notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ]);

    if (paymentsRes.data) {
      setPayments(paymentsRes.data);
    }
    if (requestsRes.data) {
      setPaymentRequests(requestsRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
    }
  };

  const openReuploadDialog = (request: PaymentRequest) => {
    setReuploadingRequest(request);
    setReceiptFile(null);
    setReuploadDialogOpen(true);
  };

  const handleReupload = async () => {
    if (!reuploadingRequest || !receiptFile || !user) return;

    setIsUploading(true);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${user.id}/${reuploadingRequest.order_id}-reupload.${fileExt}`;

      // Upload new receipt to storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Update payment request: new receipt URL and reset status to pending
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          receipt_url: urlData.publicUrl,
          status: 'pending_verification',
        })
        .eq('id', reuploadingRequest.id);

      if (updateError) throw updateError;

      toast.success('Receipt uploaded successfully! Awaiting verification.');
      setReuploadDialogOpen(false);
      setReuploadingRequest(null);
      setReceiptFile(null);
      fetchPayments();
    } catch (error: any) {
      console.error('Re-upload error:', error);
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const generateInvoicePdf = (payment: Payment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with logo placeholder
    doc.setFillColor(0, 90, 187);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('WS FITNESS', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Fitness Partner', 20, 32);

    // Invoice title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 20, 60, { align: 'right' });

    // Invoice details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const leftMargin = 20;
    const rightColumn = pageWidth - 80;
    let yPos = 70;

    doc.text('BILLED TO:', leftMargin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(userName, leftMargin, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('WS Fitness Member', leftMargin, yPos + 12);

    doc.text('Invoice No:', rightColumn, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(payment.id.slice(0, 8).toUpperCase(), rightColumn + 40, yPos);

    doc.setTextColor(100, 100, 100);
    doc.text('Date:', rightColumn, yPos + 8);
    doc.setTextColor(0, 0, 0);
    doc.text(format(new Date(payment.created_at), 'd MMM yyyy'), rightColumn + 40, yPos + 8);

    doc.setTextColor(100, 100, 100);
    doc.text('Status:', rightColumn, yPos + 16);
    doc.setTextColor(payment.status === 'succeeded' ? 0 : 255, payment.status === 'succeeded' ? 128 : 165, 0);
    doc.text(payment.status.toUpperCase(), rightColumn + 40, yPos + 16);

    // Divider
    yPos = 110;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, yPos, pageWidth - 20, yPos);

    // Table header
    yPos = 125;
    doc.setFillColor(245, 245, 245);
    doc.rect(leftMargin, yPos - 5, pageWidth - 40, 12, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', leftMargin + 5, yPos + 3);
    doc.text('AMOUNT', pageWidth - 25, yPos + 3, { align: 'right' });

    // Table content
    yPos = 145;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Membership Renewal - Standard Plan', leftMargin + 5, yPos);
    doc.text(`${payment.currency} ${payment.amount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });

    // Divider
    yPos = 165;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, yPos, pageWidth - 20, yPos);

    // Total
    yPos = 180;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', pageWidth - 80, yPos);
    doc.setTextColor(0, 90, 187);
    doc.text(`${payment.currency} ${payment.amount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });

    // Payment method
    yPos = 200;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Payment Method: ${payment.provider.toUpperCase()}`, leftMargin, yPos);
    doc.text(`Transaction ID: ${payment.id}`, leftMargin, yPos + 6);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, footerY - 10, pageWidth - 20, footerY - 10);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('WS Fitness Sdn Bhd', pageWidth / 2, footerY, { align: 'center' });
    doc.text('No. 123, Jalan Fitness, 50000 Kuala Lumpur, Malaysia', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 12, { align: 'center' });

    doc.save(`WS-Fitness-Invoice-${payment.id.slice(0, 8).toUpperCase()}.pdf`);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Succeeded</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1">
            <Lock className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'pending_verification':
        return (
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-muted text-muted-foreground border-muted gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyHistory = payments.length > 0 || paymentRequests.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyHistory ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payment history yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Payment Requests Section */}
              {paymentRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">DuitNow Orders</h4>
                  {paymentRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        request.status === 'approved' 
                          ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' 
                          : request.status === 'cancelled'
                          ? 'bg-muted/30 border-muted hover:bg-muted/50'
                          : request.status === 'rejected'
                          ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                          : 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10'
                      }`}
                      onClick={() => {
                        setSelectedTransaction(request);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {request.order_id}
                            </p>
                            {request.status === 'approved' && (
                              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(request.created_at), 'd MMM yyyy, h:mm a')} • {request.plan_type}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              RM {request.amount.toFixed(2)}
                            </p>
                            {getRequestStatusBadge(request.status)}
                          </div>
                        </div>
                      </div>

                      {/* Actions based on status */}
                      {request.status === 'cancelled' && onBuyAgain && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onBuyAgain}
                            className="w-full gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Start New Order
                          </Button>
                        </div>
                      )}

                      {request.status === 'rejected' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex items-center gap-2 text-red-500 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Your payment was rejected. Please re-upload a valid receipt.
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openReuploadDialog(request)}
                            className="w-full gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
                          >
                            <Upload className="h-4 w-4" />
                            Re-upload Receipt
                          </Button>
                        </div>
                      )}

                      {request.status === 'approved' && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Payment verified and membership activated
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Processed Payments Section */}
              {payments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Card/FPX Payments</h4>
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {format(new Date(payment.created_at), 'd MMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.provider.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            RM {payment.amount.toFixed(2)}
                          </p>
                          {getPaymentStatusBadge(payment.status)}
                        </div>

                        {payment.status === 'succeeded' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => generateInvoicePdf(payment)}
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Re-upload Receipt Modal */}
      <Dialog open={reuploadDialogOpen} onOpenChange={setReuploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Re-upload Receipt
            </DialogTitle>
            <DialogDescription>
              Order: {reuploadingRequest?.order_id} | RM {reuploadingRequest?.amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reupload-receipt">New Receipt Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  id="reupload-receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label 
                  htmlFor="reupload-receipt" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {receiptFile ? (
                    <>
                      <CheckCircle className="h-10 w-10 text-primary" />
                      <span className="text-sm font-medium">{receiptFile.name}</span>
                      <span className="text-xs text-muted-foreground">Click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload new receipt
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Max 5MB, Image files only
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReuploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReupload}
              disabled={!receiptFile || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Submit for Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Modal */}
      <MemberTransactionModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        transaction={selectedTransaction}
        userName={userName}
      />
    </>
  );
}