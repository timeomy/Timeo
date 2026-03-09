import { useState, useEffect, useMemo } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  CreditCard, Receipt, RefreshCw, Settings, Search, Plus, 
  AlertTriangle, CheckCircle, Clock, FileText, Pencil, Trash2, Save, Loader2, Banknote
} from 'lucide-react';
import { PaymentVerification } from '@/components/admin/PaymentVerification';
import { MalaysianInvoiceGenerator } from '@/components/admin/MalaysianInvoiceGenerator';
import { Textarea } from '@/components/ui/textarea';

// Billing Settings Form Component
function BillingSettingsForm() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    registration_number: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    currency_symbol: 'RM',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
        setFormData({
          company_name: data.company_name || '',
          registration_number: data.registration_number || '',
          tax_id: data.tax_id || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          currency_symbol: 'RM',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from('company_settings')
          .update({
            company_name: formData.company_name,
            registration_number: formData.registration_number || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_name: formData.company_name,
            registration_number: formData.registration_number || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
          });

        if (error) throw error;
      }

      toast.success('Billing settings saved');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Company Details</h3>
        <p className="text-sm text-muted-foreground">
          These details will appear on your e-Invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name *</Label>
          <Input
            id="company_name"
            placeholder="My Gym Sdn Bhd"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">This will appear on e-Invoices</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="registration_number">Business Registration No. (BRN)</Label>
          <Input
            id="registration_number"
            placeholder="202001012345"
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_id">Tax Identification No. (TIN)</Label>
          <Input
            id="tax_id"
            placeholder="C12345678901"
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency Symbol</Label>
          <Input
            id="currency"
            value={formData.currency_symbol}
            onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="+60123456789"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="billing@mygym.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          placeholder="No. 123, Jalan Fitness, 50000 Kuala Lumpur"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Changes
      </Button>
    </div>
  );
}

interface Invoice {
  id: string;
  invoice_number: string;
  buyer_name: string;
  total_amount: number;
  status: string;
  issue_date: string;
}

interface CompanySettings {
  id: string;
  company_name: string;
  address: string | null;
  tax_id: string | null;
}

export default function Billing() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    buyer_name: '',
    total_amount: '',
    status: 'pending',
    invoice_number: '',
  });

  useEffect(() => {
    document.title = 'Billing | WSFitness';
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invoices from the invoices table
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, buyer_name, total_amount, status, issue_date')
        .order('issue_date', { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch company settings
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsData) {
        setCompanySettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const s = search.toLowerCase();
    return invoices.filter(i => 
      i.buyer_name.toLowerCase().includes(s) ||
      i.invoice_number?.toLowerCase().includes(s)
    );
  }, [invoices, search]);

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount), 0);
    const pending = invoices.filter(i => i.status === 'pending' || i.status === 'draft').reduce((s, i) => s + Number(i.total_amount), 0);
    return { paid, overdue, pending };
  }, [invoices]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'pending':
      case 'draft':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'issued':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><FileText className="h-3 w-3 mr-1" />Issued</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground border-muted-foreground/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      buyer_name: invoice.buyer_name,
      total_amount: invoice.total_amount.toString(),
      status: invoice.status,
      invoice_number: invoice.invoice_number,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Invoice deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          buyer_name: formData.buyer_name,
          total_amount: parseFloat(formData.total_amount),
          status: formData.status,
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;
      toast.success('Invoice updated');
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleCreate = async () => {
    if (!formData.buyer_name.trim() || !formData.total_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      
      // Get the first member as a placeholder (or you could make this selectable)
      const { data: firstMember } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      const { error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          buyer_name: formData.buyer_name,
          total_amount: parseFloat(formData.total_amount),
          subtotal: parseFloat(formData.total_amount),
          status: formData.status,
          member_id: firstMember?.id || '00000000-0000-0000-0000-000000000000',
        });

      if (error) throw error;
      toast.success('Invoice created');
      setCreateDialogOpen(false);
      setFormData({ buyer_name: '', total_amount: '', status: 'pending', invoice_number: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const openCreateDialog = () => {
    setFormData({ buyer_name: '', total_amount: '', status: 'pending', invoice_number: '' });
    setCreateDialogOpen(true);
  };

  return (
    <GymLayout title="Billing" subtitle="Manage invoices and payments">
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="ios-card bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Paid
              </div>
              <p className="text-2xl font-display text-emerald-400">RM {stats.paid.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="ios-card bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overdue
              </div>
              <p className="text-2xl font-display text-destructive">RM {stats.overdue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="ios-card bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending
              </div>
              <p className="text-2xl font-display text-amber-400">RM {stats.pending.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="ios-card bg-card border-border/50">
          <Tabs defaultValue="verification" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="bg-muted/30 w-full justify-start flex-wrap">
                <TabsTrigger value="verification" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Verify Payments
                </TabsTrigger>
                <TabsTrigger value="einvoice" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  e-Invoice
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="recurring" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Recurring
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="verification" className="mt-0">
                <PaymentVerification />
              </TabsContent>

              <TabsContent value="einvoice" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    {companySettings?.company_name || 'My Gym Sdn Bhd'} - e-Invoice Generator
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Generate LHDN-compliant e-Invoices for your members
                  </p>
                </div>
                <MalaysianInvoiceGenerator />
              </TabsContent>

              <TabsContent value="invoices" className="mt-0 space-y-4">
                {/* Action Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-muted/30"
                    />
                  </div>
                  <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No invoices found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                            <TableCell className="font-medium">{invoice.buyer_name}</TableCell>
                            <TableCell>RM {Number(invoice.total_amount).toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(invoice)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(invoice.id)}
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
                </div>
              </TabsContent>

              <TabsContent value="recurring" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Recurring billing settings coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <BillingSettingsForm />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (RM)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                placeholder="Enter customer name"
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (RM) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GymLayout>
  );
}