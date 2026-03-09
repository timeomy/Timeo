import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ExternalLink, CheckCircle, XCircle, Clock, Download, FileText, Receipt, StickyNote, Image as ImageIcon } from 'lucide-react';
import { TransactionInvoice } from './TransactionInvoice';
import { useState } from 'react';

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
  member_name?: string;
  member_email?: string;
}

interface TransactionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentRequest | null;
  onApprove?: (request: PaymentRequest) => void;
  onReject?: (request: PaymentRequest) => void;
  isProcessing?: boolean;
  showActions?: boolean;
}

export function TransactionDetailsModal({
  open,
  onOpenChange,
  transaction,
  onApprove,
  onReject,
  isProcessing = false,
  showActions = true,
}: TransactionDetailsModalProps) {
  const [showInvoice, setShowInvoice] = useState(false);

  if (!transaction) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
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

  const isPending = transaction.status === 'pending_verification' || transaction.status === 'pending_cash' || transaction.status === 'pending_card';
  const isApproved = transaction.status === 'approved';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              Order ID: {transaction.order_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {getStatusBadge(transaction.status)}
            </div>

            {/* Member Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Member Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{transaction.member_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{transaction.member_email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payer Name</p>
                  <p className="font-medium">{transaction.payer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transaction Date</p>
                  <p className="font-medium">{format(new Date(transaction.created_at), 'd MMM yyyy, h:mm a')}</p>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plan Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan Name</p>
                  <p className="font-medium">{transaction.plan_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg text-primary">RM {transaction.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Customer Notes/Remarks */}
            {transaction.notes && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Customer Notes / Remarks
                </h4>
                <p className="text-sm whitespace-pre-wrap">{transaction.notes}</p>
              </div>
            )}

            {/* Payment Proof */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Payment Proof
              </h4>
              {transaction.receipt_url ? (
                <div className="space-y-3">
                  <div className="flex justify-center p-4 bg-background rounded-lg border border-border/50">
                    <img 
                      src={transaction.receipt_url} 
                      alt="Payment Receipt" 
                      className="max-h-[300px] object-contain rounded-md"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(transaction.receipt_url!, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Full Size
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No payment proof uploaded</p>
              )}
            </div>

            {/* Invoice Button (only for approved) */}
            {isApproved && (
              <Button 
                variant="outline" 
                className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setShowInvoice(true)}
              >
                <FileText className="h-4 w-4" />
                View / Download Invoice
              </Button>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {showActions && isPending && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => onReject?.(transaction)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onApprove?.(transaction)}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <TransactionInvoice
        open={showInvoice}
        onOpenChange={setShowInvoice}
        transaction={transaction}
      />
    </>
  );
}
