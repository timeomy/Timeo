import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, FileText, Printer, Download, Loader2, Trash2, 
  Building2, User, Receipt, CheckCircle, AlertTriangle
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  classification_code: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  member_id: string;
  buyer_name: string;
  buyer_tin: string | null;
  buyer_brn: string | null;
  buyer_address: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  items?: InvoiceItem[];
}

// Malaysian e-Invoice Classification Codes
const CLASSIFICATION_CODES = [
  { code: '001', label: 'Membership Fee' },
  { code: '002', label: 'Personal Training' },
  { code: '003', label: 'Group Class' },
  { code: '004', label: 'Merchandise' },
  { code: '005', label: 'Supplements' },
  { code: '006', label: 'Locker Rental' },
  { code: '007', label: 'Other Services' },
];

interface CompanySettings {
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  tax_id: string | null;
}

export function MalaysianInvoiceGenerator() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  
  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [buyerTin, setBuyerTin] = useState('');
  const [buyerBrn, setBuyerBrn] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total: 0, classification_code: '001' }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email, phone_number');

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch company settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('company_settings')
        .select('company_name, address, phone, email, registration_number, tax_id')
        .limit(1)
        .single();

      if (!settingsError && settingsData) {
        setCompanySettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedMember = useMemo(() => 
    members.find(m => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  const addItem = () => {
    setItems([...items, { 
      description: '', quantity: 1, unit_price: 0, 
      tax_rate: 0, tax_amount: 0, total: 0, classification_code: '001' 
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate totals
    const item = newItems[index];
    const subtotal = item.quantity * item.unit_price;
    item.tax_amount = subtotal * (item.tax_rate / 100);
    item.total = subtotal + item.tax_amount;
    
    setItems(newItems);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [items]);

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleCreateInvoice = async () => {
    if (!selectedMemberId || items.some(i => !i.description || i.unit_price <= 0)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const invoiceNumber = generateInvoiceNumber();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          member_id: selectedMemberId,
          buyer_name: selectedMember?.name || '',
          buyer_tin: buyerTin || null,
          buyer_brn: buyerBrn || null,
          buyer_address: buyerAddress || null,
          buyer_email: selectedMember?.email || null,
          buyer_phone: selectedMember?.phone_number || null,
          due_date: dueDate || null,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          notes: notes || null,
          status: 'issued',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total: item.total,
        classification_code: item.classification_code,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast.success(`Invoice ${invoiceNumber} created successfully`);
      setCreateDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedMemberId('');
    setBuyerTin('');
    setBuyerBrn('');
    setBuyerAddress('');
    setDueDate('');
    setNotes('');
    setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total: 0, classification_code: '001' }]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Paid</Badge>;
      case 'issued':
        return <Badge className="bg-blue-500/20 text-blue-400 border-0">Issued</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive/20 text-destructive border-0">Overdue</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground border-0">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    // Create print-friendly version using company settings
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use company settings or fallback to default values
    const companyName = companySettings?.company_name || 'Company Name Not Set';
    const companyAddress = companySettings?.address || 'Address Not Set';
    const companyPhone = companySettings?.phone || '';
    const companyEmail = companySettings?.email || '';
    const companyTin = companySettings?.tax_id || '';
    const companyBrn = companySettings?.registration_number || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00C2B2; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #00C2B2; }
          .invoice-title { font-size: 28px; margin: 10px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-box { padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .info-box h4 { margin: 0 0 10px 0; color: #333; font-size: 12px; text-transform: uppercase; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; }
          .total-row { font-size: 18px; font-weight: bold; color: #00C2B2; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          .einvoice-notice { background: #e8f5f3; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${companyName.toUpperCase()}</div>
          <p>${companyAddress}</p>
          <p>${companyPhone ? `Tel: ${companyPhone}` : ''}${companyPhone && companyEmail ? ' | ' : ''}${companyEmail ? `Email: ${companyEmail}` : ''}</p>
          <p>${companyTin ? `TIN: ${companyTin}` : ''}${companyTin && companyBrn ? ' | ' : ''}${companyBrn ? `BRN: ${companyBrn}` : ''}</p>
        </div>
        
        <h1 class="invoice-title">TAX INVOICE</h1>
        <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
        <p><strong>Date:</strong> ${format(new Date(invoice.issue_date), 'dd MMM yyyy')}</p>
        ${invoice.due_date ? `<p><strong>Due Date:</strong> ${format(new Date(invoice.due_date), 'dd MMM yyyy')}</p>` : ''}
        
        <div class="info-grid">
          <div class="info-box">
            <h4>Bill To</h4>
            <p><strong>${invoice.buyer_name}</strong></p>
            ${invoice.buyer_tin ? `<p>TIN: ${invoice.buyer_tin}</p>` : ''}
            ${invoice.buyer_brn ? `<p>BRN: ${invoice.buyer_brn}</p>` : ''}
            ${invoice.buyer_address ? `<p>${invoice.buyer_address}</p>` : ''}
            ${invoice.buyer_email ? `<p>${invoice.buyer_email}</p>` : ''}
            ${invoice.buyer_phone ? `<p>${invoice.buyer_phone}</p>` : ''}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price (RM)</th>
              <th>Tax</th>
              <th>Total (RM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="5" style="text-align: center; color: #666;">Invoice items loaded from database</td>
            </tr>
          </tbody>
        </table>
        
        <div class="totals">
          <p>Subtotal: RM ${invoice.subtotal.toFixed(2)}</p>
          <p>Tax: RM ${invoice.tax_amount.toFixed(2)}</p>
          <p class="total-row">Total: RM ${invoice.total_amount.toFixed(2)}</p>
        </div>
        
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        
        <div class="einvoice-notice">
          <strong>Malaysian e-Invoice Compliance Notice</strong><br>
          This invoice is prepared in accordance with the Inland Revenue Board of Malaysia (LHDN) e-Invoice requirements. 
          For validation, please visit MyInvois Portal at https://myinvois.hasil.gov.my
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${companyName}${companyBrn ? ` | SSM: ${companyBrn}` : ''}</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">Malaysian e-Invoice Generator</h3>
          <p className="text-sm text-muted-foreground">LHDN compliant invoices</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Create Malaysian e-Invoice
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Buyer Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Buyer Information
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Member *</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buyer TIN (Optional)</Label>
                    <Input 
                      placeholder="e.g., C12345678901"
                      value={buyerTin}
                      onChange={(e) => setBuyerTin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Buyer BRN (Optional)</Label>
                    <Input 
                      placeholder="e.g., 202001012345"
                      value={buyerBrn}
                      onChange={(e) => setBuyerBrn(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Buyer Address</Label>
                  <Textarea 
                    placeholder="Full address"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Items
                  </h4>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/20 rounded-lg">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Service/Product"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Classification</Label>
                      <Select 
                        value={item.classification_code} 
                        onValueChange={(v) => updateItem(index, 'classification_code', v)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATION_CODES.map((code) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit Price (RM)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Total (RM)</Label>
                      <Input
                        readOnly
                        value={item.total.toFixed(2)}
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="bg-card border border-border/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">RM {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">RM {totals.taxAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary text-lg">RM {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  placeholder="Additional notes or terms"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Compliance Notice */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">LHDN e-Invoice Compliant</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      This invoice includes all required fields for Malaysian e-Invoice submission including TIN, BRN, and classification codes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      </div>

      {/* Invoices Table */}
      <Card className="bg-card border-border/30">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invoices yet. Create your first invoice to get started.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.buyer_name}</TableCell>
                    <TableCell>{format(new Date(invoice.issue_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-semibold">RM {invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintInvoice(invoice)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this invoice?')) return;
                            try {
                              // Delete invoice items first
                              await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
                              // Then delete the invoice
                              const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
                              if (error) throw error;
                              toast.success('Invoice deleted');
                              fetchData();
                            } catch (error) {
                              console.error('Error deleting invoice:', error);
                              toast.error('Failed to delete invoice');
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
