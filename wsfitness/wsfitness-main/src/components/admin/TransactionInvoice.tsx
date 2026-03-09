import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Download, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeForPdf } from '@/lib/pdfSanitize';

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

interface CompanySettings {
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  tax_id: string | null;
}

interface TransactionInvoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentRequest | null;
}

export function TransactionInvoice({ open, onOpenChange, transaction }: TransactionInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
    }
  }, [open]);

  const fetchCompanySettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, address, phone, email, registration_number, tax_id')
        .limit(1)
        .single();

      if (!error && data) {
        setCompanySettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  // Use company settings or fallback to defaults
  const companyName = companySettings?.company_name || 'Company Name';
  const companyAddress = companySettings?.address || 'Address not set';
  const companyPhone = companySettings?.phone || '';
  const companyEmail = companySettings?.email || '';
  const companyBrn = companySettings?.registration_number || '';


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
    doc.text(companyName.toUpperCase(), 20, 25);

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
    doc.text(transaction.member_name || 'Customer', leftMargin, yPos + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (transaction.member_email) {
      doc.text(transaction.member_email, leftMargin, yPos + 15);
    }

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
    doc.text(`Membership: ${sanitizeForPdf(transaction.plan_type)}`, leftMargin + 5, yPos);
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
    doc.text(companyName, pageWidth / 2, footerY, { align: 'center' });
    doc.text(companyAddress, pageWidth / 2, footerY + 6, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 14, { align: 'center' });

    doc.save(`${companyName.replace(/\s+/g, '-')}-Invoice-${invoiceNumber}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Invoice Preview */}
            <div ref={invoiceRef} className="bg-white text-black p-8 rounded-lg print:p-0">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-6 rounded-t-lg -mx-8 -mt-8 mb-6 print:rounded-none">
                <h1 className="text-2xl font-bold">{companyName.toUpperCase()}</h1>
                <p className="text-sm opacity-90">Your Fitness Partner</p>
              </div>

              {/* Invoice Info */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Billed To</p>
                  <p className="font-semibold text-lg">{transaction.member_name || 'Customer'}</p>
                  <p className="text-sm text-gray-600">{transaction.member_email || ''}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">INVOICE</h2>
                  <p className="text-sm text-gray-600">Invoice #: <span className="font-mono">{invoiceNumber}</span></p>
                  <p className="text-sm text-gray-600">Date: {invoiceDate}</p>
                  <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    PAID
                  </Badge>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 text-xs uppercase text-gray-600 font-semibold">Description</th>
                      <th className="text-right p-3 text-xs uppercase text-gray-600 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">
                        <p className="font-medium">Membership: {transaction.plan_type}</p>
                        <p className="text-sm text-gray-500">Order ID: {transaction.order_id}</p>
                      </td>
                      <td className="p-3 text-right font-medium">RM {transaction.amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="flex justify-end mb-8">
                <div className="bg-gray-100 p-4 rounded-lg min-w-[200px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="text-xl font-bold text-primary">RM {transaction.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-4 text-center text-sm text-gray-500">
                <p className="font-semibold text-gray-700">{companyName}</p>
                <p>{companyAddress}</p>
                <p className="mt-2 italic">Thank you for your business!</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={generatePDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
