import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Download, FileText, Receipt, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useState } from 'react';

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

interface MemberTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentRequest | null;
  userName?: string;
}

export function MemberTransactionModal({
  open,
  onOpenChange,
  transaction,
  userName = 'Member',
}: MemberTransactionModalProps) {
  const [showInvoice, setShowInvoice] = useState(false);

  if (!transaction) return null;

  const getStatusBadge = (status: string) => {
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

  const invoiceNumber = `INV-${transaction.order_id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const invoiceDate = format(new Date(transaction.created_at), 'd MMMM yyyy');

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with blue background
    doc.setFillColor(0, 90, 187);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo/Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('WS FITNESS', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Fitness Partner', 20, 33);

    // Invoice title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 20, 65, { align: 'right' });

    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const rightCol = pageWidth - 20;
    doc.text(`Invoice #: ${invoiceNumber}`, rightCol, 75, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, rightCol, 82, { align: 'right' });

    // PAID stamp
    doc.setTextColor(0, 150, 0);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', rightCol, 100, { align: 'right' });

    // Billed To Section
    const leftMargin = 20;
    let yPos = 75;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO:', leftMargin, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(userName, leftMargin, yPos + 8);

    // Divider
    yPos = 120;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, yPos, pageWidth - 20, yPos);

    // Table header
    yPos = 135;
    doc.setFillColor(245, 245, 245);
    doc.rect(leftMargin, yPos - 5, pageWidth - 40, 12, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', leftMargin + 5, yPos + 3);
    doc.text('AMOUNT', pageWidth - 25, yPos + 3, { align: 'right' });

    // Table content
    yPos = 155;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Membership: ${transaction.plan_type}`, leftMargin + 5, yPos);
    doc.text(`RM ${transaction.amount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });

    // Divider
    yPos = 175;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, yPos, pageWidth - 20, yPos);

    // Total
    yPos = 195;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL', leftMargin + 5, yPos);
    doc.setTextColor(0, 90, 187);
    doc.text(`RM ${transaction.amount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });

    // Payment info
    yPos = 220;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Payment Method: DuitNow / Bank Transfer`, leftMargin, yPos);
    doc.text(`Order ID: ${transaction.order_id}`, leftMargin, yPos + 7);
    if (transaction.payer_name) {
      doc.text(`Payer: ${transaction.payer_name}`, leftMargin, yPos + 14);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 35;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, footerY - 10, pageWidth - 20, footerY - 10);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('WS Fitness Sdn Bhd', pageWidth / 2, footerY, { align: 'center' });
    doc.text('No. 123, Jalan Fitness, 50000 Kuala Lumpur, Malaysia', pageWidth / 2, footerY + 6, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 14, { align: 'center' });

    doc.save(`WS-Fitness-Invoice-${invoiceNumber}.pdf`);
  };

  const isApproved = transaction.status === 'approved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Transaction Details
          </DialogTitle>
          <DialogDescription>
            Order ID: {transaction.order_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge(transaction.status)}
          </div>

          {/* Plan Details */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-medium">{transaction.plan_type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-bold text-lg text-primary">RM {transaction.amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm">{format(new Date(transaction.created_at), 'd MMM yyyy, h:mm a')}</p>
            </div>
            {transaction.payer_name && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Payer Name</p>
                <p className="text-sm">{transaction.payer_name}</p>
              </div>
            )}
          </div>

          {/* Invoice Download for Approved */}
          {isApproved && (
            <Button 
              variant="outline" 
              className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
              onClick={generatePDF}
            >
              <Download className="h-4 w-4" />
              Download Invoice (PDF)
            </Button>
          )}

          {/* Status Messages */}
          {transaction.status === 'pending_verification' && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm text-orange-400">
              <Clock className="h-4 w-4 inline mr-2" />
              Your payment is being verified. This usually takes a few hours.
            </div>
          )}

          {transaction.status === 'rejected' && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              <XCircle className="h-4 w-4 inline mr-2" />
              Your payment was rejected. Please re-upload a valid receipt.
            </div>
          )}

          {isApproved && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Payment verified! Your membership is active.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
