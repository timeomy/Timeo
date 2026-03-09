import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, Plus, Store, Gift, Trash2, Download, Search, 
  CalendarIcon, Eye, Edit, TrendingUp, Users, CheckCircle2, 
  XCircle, ToggleLeft, ToggleRight, Mail, Phone, BarChart3
} from 'lucide-react';
import { SortableTableHead, useSortableTable } from '@/components/ui/sortable-table-head';
import { exportToCSV, flattenVendorData, flattenVoucherData } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import { VendorAnalytics } from '@/components/admin/VendorAnalytics';
import { z } from 'zod';

const vendorSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(6, 'Min 6 characters').max(100),
  name: z.string().min(1, 'Required').max(100),
  phone_number: z.string().max(20).optional(),
  business_name: z.string().min(1, 'Required').max(100),
});

const voucherSchema = z.object({
  title: z.string().min(1, 'Required').max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(6, 'Min 6 chars').max(20).toUpperCase(),
  value: z.number().min(0),
  vendor_id: z.string().min(1, 'Required'),
  max_redemptions: z.number().optional(),
  valid_from: z.date().nullable().optional(),
  expires_at: z.date().nullable().optional(),
});

export default function VendorsAdmin() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tab and selection state
  const [activeTab, setActiveTab] = useState('vendors');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  
  // Dialog states
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addVoucherOpen, setAddVoucherOpen] = useState(false);
  const [vendorDetailOpen, setVendorDetailOpen] = useState(false);
  const [editVoucherOpen, setEditVoucherOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  
  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  
  // Forms
  const [vendorForm, setVendorForm] = useState({
    email: '', password: '', name: '', phone_number: '', business_name: '',
  });
  const [voucherForm, setVoucherForm] = useState({
    title: '', description: '', code: '', value: 0, vendor_id: '',
    max_redemptions: '', valid_from: null as Date | null, expires_at: null as Date | null, status: 'valid',
  });
  const [editVoucherForm, setEditVoucherForm] = useState({
    title: '', description: '', value: 0, vendor_id: '',
    max_redemptions: '', valid_from: null as Date | null, expires_at: null as Date | null,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, vouchersRes, redemptionsRes] = await Promise.all([
        supabase.from('vendors').select('*, profiles:user_id(name, email, phone_number)'),
        supabase.from('vouchers').select('*, vendors(business_name)').order('created_at', { ascending: false }),
        supabase.from('redemption_logs').select('*, vendors(business_name), vouchers(title, code)').order('redeemed_at', { ascending: false }),
      ]);
      
      if (vendorsRes.error) console.error('Vendors fetch error:', vendorsRes.error);
      if (vouchersRes.error) console.error('Vouchers fetch error:', vouchersRes.error);
      if (redemptionsRes.error) console.error('Redemptions fetch error:', redemptionsRes.error);

      setVendors(vendorsRes.data || []);
      setVouchers(vouchersRes.data || []);
      setRedemptions(redemptionsRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return vendors;
    const search = vendorSearch.toLowerCase();
    return vendors.filter(v => 
      v.business_name?.toLowerCase().includes(search) ||
      v.profiles?.name?.toLowerCase().includes(search) ||
      v.profiles?.email?.toLowerCase().includes(search)
    );
  }, [vendors, vendorSearch]);

  // Filtered vouchers
  const filteredVouchers = useMemo(() => {
    let result = vouchers;
    
    // Filter by vendor
    if (vendorFilter !== 'all') {
      result = result.filter(v => v.vendor_id === vendorFilter);
    }
    
    // Filter by status
    if (voucherStatusFilter !== 'all') {
      if (voucherStatusFilter === 'expired') {
        result = result.filter(v => v.expires_at && new Date(v.expires_at) < new Date());
      } else {
        result = result.filter(v => v.status === voucherStatusFilter);
      }
    }
    
    // Filter by search
    if (voucherSearch.trim()) {
      const search = voucherSearch.toLowerCase();
      result = result.filter(v => 
        v.code?.toLowerCase().includes(search) ||
        v.title?.toLowerCase().includes(search) ||
        v.vendors?.business_name?.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [vouchers, voucherSearch, voucherStatusFilter, vendorFilter]);

  // Sortable hooks
  const vendorSort = useSortableTable(filteredVendors, 'business_name', 'asc');
  const voucherSort = useSortableTable(filteredVouchers, 'created_at', 'desc');

  // Vendor stats
  const getVendorStats = (vendorId: string) => {
    const vendorVouchers = vouchers.filter(v => v.vendor_id === vendorId);
    const vendorRedemptions = redemptions.filter(r => r.vendor_id === vendorId);
    const activeVouchers = vendorVouchers.filter(v => v.status === 'valid').length;
    const totalValue = vendorVouchers.reduce((sum, v) => sum + (v.value || 0), 0);
    const totalRedemptions = vendorRedemptions.length;
    
    return { totalVouchers: vendorVouchers.length, activeVouchers, totalValue, totalRedemptions };
  };

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVoucherIds(filteredVouchers.map(v => v.id));
    } else {
      setSelectedVoucherIds([]);
    }
  };

  const handleSelectVoucher = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedVoucherIds(prev => [...prev, id]);
    } else {
      setSelectedVoucherIds(prev => prev.filter(vid => vid !== id));
    }
  };

  const handleBulkStatusChange = async (newStatus: 'valid' | 'inactive') => {
    if (selectedVoucherIds.length === 0) {
      toast.error('No vouchers selected');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({ status: newStatus })
        .in('id', selectedVoucherIds);

      if (error) throw error;

      toast.success(`${selectedVoucherIds.length} voucher(s) ${newStatus === 'valid' ? 'activated' : 'deactivated'}`);
      setSelectedVoucherIds([]);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update vouchers');
    } finally {
      setSaving(false);
    }
  };

  // Add vendor
  const handleAddVendor = async () => {
    const result = vendorSchema.safeParse(vendorForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: vendorForm.email,
          password: vendorForm.password,
          name: vendorForm.name,
          phone_number: vendorForm.phone_number,
          role: 'vendor',
          business_name: vendorForm.business_name,
        },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message);
      }

      toast.success('Vendor created successfully');
      setAddVendorOpen(false);
      setVendorForm({ email: '', password: '', name: '', phone_number: '', business_name: '' });
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create vendor');
    } finally {
      setSaving(false);
    }
  };

  // Add voucher
  const handleAddVoucher = async () => {
    const result = voucherSchema.safeParse({
      ...voucherForm,
      code: voucherForm.code.toUpperCase(),
      value: Number(voucherForm.value),
      max_redemptions: voucherForm.max_redemptions ? Number(voucherForm.max_redemptions) : undefined,
    });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('vouchers').insert({
        title: voucherForm.title,
        description: voucherForm.description || null,
        code: voucherForm.code.toUpperCase(),
        value: Number(voucherForm.value),
        vendor_id: voucherForm.vendor_id,
        status: voucherForm.status,
        max_redemptions: voucherForm.max_redemptions ? Number(voucherForm.max_redemptions) : null,
        current_redemptions: 0,
        valid_from: voucherForm.valid_from ? voucherForm.valid_from.toISOString() : null,
        expires_at: voucherForm.expires_at ? voucherForm.expires_at.toISOString() : null,
      });

      if (error) throw error;

      toast.success('Voucher created successfully');
      setAddVoucherOpen(false);
      setVoucherForm({ title: '', description: '', code: '', value: 0, vendor_id: '', max_redemptions: '', valid_from: null, expires_at: null, status: 'valid' });
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create voucher');
    } finally {
      setSaving(false);
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVoucherForm(prev => ({ ...prev, code }));
  };

  const openEditVoucher = (voucher: any) => {
    setSelectedVoucher(voucher);
    setEditVoucherForm({
      title: voucher.title || '',
      description: voucher.description || '',
      value: voucher.value || 0,
      vendor_id: voucher.vendor_id || '',
      max_redemptions: voucher.max_redemptions?.toString() || '',
      valid_from: voucher.valid_from ? new Date(voucher.valid_from) : null,
      expires_at: voucher.expires_at ? new Date(voucher.expires_at) : null,
    });
    setEditVoucherOpen(true);
  };

  const handleEditVoucher = async () => {
    if (!selectedVoucher) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({
          title: editVoucherForm.title,
          description: editVoucherForm.description || null,
          value: Number(editVoucherForm.value),
          vendor_id: editVoucherForm.vendor_id,
          max_redemptions: editVoucherForm.max_redemptions ? Number(editVoucherForm.max_redemptions) : null,
          valid_from: editVoucherForm.valid_from ? editVoucherForm.valid_from.toISOString() : null,
          expires_at: editVoucherForm.expires_at ? editVoucherForm.expires_at.toISOString() : null,
        })
        .eq('id', selectedVoucher.id);

      if (error) throw error;

      toast.success('Voucher updated successfully');
      setEditVoucherOpen(false);
      setSelectedVoucher(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Delete this voucher?')) return;
    
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Voucher deleted');
      fetchData();
    }
  };

  const handleToggleVoucherStatus = async (voucher: any, checked: boolean) => {
    const newStatus = checked ? 'valid' : 'inactive';
    const { error } = await supabase
      .from('vouchers')
      .update({ status: newStatus })
      .eq('id', voucher.id);
    if (error) {
      toast.error('Failed to update voucher status');
    } else {
      toast.success(`Voucher ${checked ? 'activated' : 'deactivated'}`);
      fetchData();
    }
  };

  // Delete vendor
  const handleDeleteVendor = async (vendor: any) => {
    setSaving(true);
    try {
      // Try to delete the vendor
      const { error } = await supabase.from('vendors').delete().eq('id', vendor.id);
      
      if (error) {
        // Check for foreign key constraint violation
        if (error.code === '23503') {
          toast.error('Cannot delete vendor with active history. Please archive instead.');
        } else {
          throw error;
        }
      } else {
        toast.success('Vendor removed successfully');
        await fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete vendor');
    } finally {
      setSaving(false);
    }
  };

  // Overall stats
  const overallStats = useMemo(() => {
    const activeVouchers = vouchers.filter(v => v.status === 'valid').length;
    const totalRedemptions = redemptions.length;
    const totalValue = vouchers.reduce((sum, v) => sum + (v.value || 0), 0);
    return { totalVendors: vendors.length, activeVouchers, totalRedemptions, totalValue };
  }, [vendors, vouchers, redemptions]);

  if (loading) {
    return (
      <GymLayout title="Vendors" subtitle="Manage vendors and vouchers">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GymLayout>
    );
  }

  return (
    <GymLayout title="Vendors" subtitle="Manage vendors and vouchers">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalVendors}</p>
                </div>
                <Store className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Vouchers</p>
                  <p className="text-2xl font-bold text-primary">{overallStats.activeVouchers}</p>
                </div>
                <Gift className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                  <p className="text-2xl font-bold text-amber-500">{overallStats.totalRedemptions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-emerald-500">RM{overallStats.totalValue.toLocaleString()}</p>
                </div>
                <Gift className="h-8 w-8 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border/50">
            <TabsTrigger value="vendors" className="gap-2">
              <Store className="h-4 w-4" />Vendors
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-2">
              <Gift className="h-4 w-4" />Vouchers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />Analytics
            </TabsTrigger>
          </TabsList>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-4">
            <VendorAnalytics vendors={vendors} vouchers={vouchers} redemptions={redemptions} />
          </TabsContent>

          {/* VENDORS TAB */}
          <TabsContent value="vendors" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="pl-9 bg-card border-border/50"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={addVendorOpen} onOpenChange={setAddVendorOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary text-primary-foreground">
                        <Plus className="h-4 w-4 mr-1" />Add Vendor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Business Name *</Label>
                          <Input
                            value={vendorForm.business_name}
                            onChange={(e) => setVendorForm(p => ({ ...p, business_name: e.target.value }))}
                            placeholder="Coffee House"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                              type="email"
                              value={vendorForm.email}
                              onChange={(e) => setVendorForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="vendor@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Password *</Label>
                            <Input
                              type="password"
                              value={vendorForm.password}
                              onChange={(e) => setVendorForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="Min 6 characters"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Name *</Label>
                            <Input
                              value={vendorForm.name}
                              onChange={(e) => setVendorForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              value={vendorForm.phone_number}
                              onChange={(e) => setVendorForm(p => ({ ...p, phone_number: e.target.value }))}
                              placeholder="+60 12-345 6789"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddVendorOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddVendor} disabled={saving} className="bg-primary">
                          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Create Vendor
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/50"
                    onClick={() => {
                      if (vendors.length === 0) {
                        toast.error('No vendors to export');
                        return;
                      }
                      exportToCSV(flattenVendorData(vendors), 'vendors', [
                        { key: 'business_name', header: 'Business Name' },
                        { key: 'contact_name', header: 'Contact Name' },
                        { key: 'email', header: 'Email' },
                        { key: 'phone', header: 'Phone' },
                        { key: 'total_redeemed', header: 'Total Redeemed' },
                      ]);
                      toast.success('Vendors exported to CSV');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendorSort.sortedData.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No vendors yet
                    </div>
                  ) : vendorSort.sortedData.map((vendor) => {
                    const stats = getVendorStats(vendor.id);
                    return (
                      <Card 
                        key={vendor.id} 
                        className="bg-muted/30 border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setVendorDetailOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-foreground">{vendor.business_name}</h3>
                              <p className="text-sm text-muted-foreground">{vendor.profiles?.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Remove Vendor"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Vendor?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <span className="font-semibold">{vendor.business_name}</span>? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteVendor(vendor)}
                                      disabled={saving}
                                    >
                                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{vendor.profiles?.email}</span>
                            </div>
                            {vendor.profiles?.phone_number && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{vendor.profiles.phone_number}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-semibold text-primary">{stats.totalVouchers}</p>
                              <p className="text-xs text-muted-foreground">Vouchers</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-amber-500">{stats.totalRedemptions}</p>
                              <p className="text-xs text-muted-foreground">Redeemed</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-emerald-500">RM{stats.totalValue}</p>
                              <p className="text-xs text-muted-foreground">Value</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VOUCHERS TAB */}
          <TabsContent value="vouchers" className="mt-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="font-display">VOUCHERS ({filteredVouchers.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/50"
                      onClick={() => {
                        if (vouchers.length === 0) {
                          toast.error('No vouchers to export');
                          return;
                        }
                        exportToCSV(flattenVoucherData(vouchers), 'vouchers', [
                          { key: 'title', header: 'Title' },
                          { key: 'code', header: 'Code' },
                          { key: 'value', header: 'Value' },
                          { key: 'vendor', header: 'Vendor' },
                          { key: 'status', header: 'Status' },
                          { key: 'expires_at', header: 'Expires' },
                        ]);
                        toast.success('Vouchers exported to CSV');
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />Export
                    </Button>
                    <Dialog open={addVoucherOpen} onOpenChange={setAddVoucherOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-primary text-primary-foreground">
                          <Plus className="h-4 w-4 mr-1" />Add Voucher
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Voucher</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                              value={voucherForm.title}
                              onChange={(e) => setVoucherForm(p => ({ ...p, title: e.target.value }))}
                              placeholder="10% Off Protein Shake"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={voucherForm.description}
                              onChange={(e) => setVoucherForm(p => ({ ...p, description: e.target.value }))}
                              placeholder="Valid for any protein shake..."
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Voucher Code *</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={voucherForm.code}
                                  onChange={(e) => setVoucherForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                  placeholder="WSFIT2024"
                                  className="font-mono"
                                />
                                <Button type="button" variant="outline" size="icon" onClick={generateVoucherCode}>
                                  🎲
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Value (RM) *</Label>
                              <Input
                                type="number"
                                value={voucherForm.value}
                                onChange={(e) => setVoucherForm(p => ({ ...p, value: Number(e.target.value) }))}
                                placeholder="10"
                                min={0}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Assign to Vendor *</Label>
                            <Select
                              value={voucherForm.vendor_id}
                              onValueChange={(v) => setVoucherForm(p => ({ ...p, vendor_id: v }))}
                            >
                              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                              <SelectContent>
                                {vendors.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Valid From</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !voucherForm.valid_from && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {voucherForm.valid_from ? format(voucherForm.valid_from, "PPP") : <span>Pick date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={voucherForm.valid_from || undefined}
                                    onSelect={(date) => setVoucherForm(p => ({ ...p, valid_from: date || null }))}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <Label>Expires At</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !voucherForm.expires_at && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {voucherForm.expires_at ? format(voucherForm.expires_at, "PPP") : <span>Pick date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={voucherForm.expires_at || undefined}
                                    onSelect={(date) => setVoucherForm(p => ({ ...p, expires_at: date || null }))}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddVoucherOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddVoucher} disabled={saving} className="bg-primary">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Create Voucher
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                {/* Search and Filter bar */}
                <div className="flex gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by code, title, or vendor..."
                      value={voucherSearch}
                      onChange={(e) => setVoucherSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={voucherStatusFilter} onValueChange={setVoucherStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="valid">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Bulk Actions */}
                {selectedVoucherIds.length > 0 && (
                  <div className="mt-4 flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm font-medium">{selectedVoucherIds.length} selected</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => handleBulkStatusChange('valid')}
                      disabled={saving}
                    >
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                      Activate All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => handleBulkStatusChange('inactive')}
                      disabled={saving}
                    >
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      Deactivate All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSelectedVoucherIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedVoucherIds.length === filteredVouchers.length && filteredVouchers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <SortableTableHead sortKey="title" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Title</SortableTableHead>
                      <SortableTableHead sortKey="code" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Code</SortableTableHead>
                      <SortableTableHead sortKey="value" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Value</SortableTableHead>
                      <SortableTableHead sortKey="vendors.business_name" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Vendor</SortableTableHead>
                      <SortableTableHead sortKey="expires_at" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Expires</SortableTableHead>
                      <SortableTableHead sortKey="status" currentSortKey={voucherSort.sortKey} currentSortDirection={voucherSort.sortDirection} onSort={voucherSort.handleSort}>Status</SortableTableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucherSort.sortedData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">
                        {voucherSearch || voucherStatusFilter !== 'all' || vendorFilter !== 'all' ? 'No matching vouchers' : 'No vouchers yet'}
                      </TableCell></TableRow>
                    ) : voucherSort.sortedData.map((v) => {
                      const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedVoucherIds.includes(v.id)}
                              onCheckedChange={(checked) => handleSelectVoucher(v.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{v.title}</TableCell>
                          <TableCell className="font-mono text-primary">{v.code}</TableCell>
                          <TableCell>RM{v.value}</TableCell>
                          <TableCell>{v.vendors?.business_name || '-'}</TableCell>
                          <TableCell className={isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {v.expires_at 
                              ? format(new Date(v.expires_at), 'd MMM yyyy')
                              : <span className="text-muted-foreground">-</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={v.status === 'valid'}
                              onCheckedChange={(checked) => handleToggleVoucherStatus(v, checked)}
                              className="data-[state=checked]:bg-primary"
                            />
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditVoucher(v)}>
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Vendor Detail Dialog */}
        <Dialog open={vendorDetailOpen} onOpenChange={setVendorDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                {selectedVendor?.business_name}
              </DialogTitle>
            </DialogHeader>
            {selectedVendor && (() => {
              const stats = getVendorStats(selectedVendor.id);
              const vendorVouchers = vouchers.filter(v => v.vendor_id === selectedVendor.id);
              const vendorRedemptions = redemptions.filter(r => r.vendor_id === selectedVendor.id);
              
              return (
                <div className="space-y-6 py-4">
                  {/* Contact Info */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="font-medium">{selectedVendor.profiles?.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />{selectedVendor.profiles?.email}
                      </span>
                      {selectedVendor.profiles?.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />{selectedVendor.profiles.phone_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats.totalVouchers}</p>
                      <p className="text-xs text-muted-foreground">Total Vouchers</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-500">{stats.activeVouchers}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-amber-500">{stats.totalRedemptions}</p>
                      <p className="text-xs text-muted-foreground">Redeemed</p>
                    </div>
                    <div className="text-center p-3 bg-cyan-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-cyan-500">RM{stats.totalValue}</p>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                    </div>
                  </div>

                  {/* Recent Vouchers */}
                  <div>
                    <h4 className="font-medium mb-2">Recent Vouchers</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {vendorVouchers.slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div>
                            <p className="text-sm font-medium">{v.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{v.code}</p>
                          </div>
                          <Badge variant={v.status === 'valid' ? 'default' : 'secondary'}>{v.status}</Badge>
                        </div>
                      ))}
                      {vendorVouchers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No vouchers yet</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Redemptions */}
                  <div>
                    <h4 className="font-medium mb-2">Recent Redemptions</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {vendorRedemptions.slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div>
                            <p className="text-sm font-medium">{r.vouchers?.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{r.vouchers?.code}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.redeemed_at), 'd MMM yyyy, HH:mm')}
                          </span>
                        </div>
                      ))}
                      {vendorRedemptions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No redemptions yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Edit Voucher Dialog */}
        <Dialog open={editVoucherOpen} onOpenChange={setEditVoucherOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Voucher</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editVoucherForm.title}
                  onChange={(e) => setEditVoucherForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editVoucherForm.description}
                  onChange={(e) => setEditVoucherForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (RM) *</Label>
                  <Input
                    type="number"
                    value={editVoucherForm.value}
                    onChange={(e) => setEditVoucherForm(p => ({ ...p, value: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity Limit</Label>
                  <Input
                    type="number"
                    value={editVoucherForm.max_redemptions}
                    onChange={(e) => setEditVoucherForm(p => ({ ...p, max_redemptions: e.target.value }))}
                    placeholder="Unlimited"
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign to Vendor *</Label>
                <Select
                  value={editVoucherForm.vendor_id}
                  onValueChange={(v) => setEditVoucherForm(p => ({ ...p, vendor_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editVoucherForm.valid_from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editVoucherForm.valid_from ? format(editVoucherForm.valid_from, "PPP") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editVoucherForm.valid_from || undefined}
                        onSelect={(date) => setEditVoucherForm(p => ({ ...p, valid_from: date || null }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editVoucherForm.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editVoucherForm.expires_at ? format(editVoucherForm.expires_at, "PPP") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editVoucherForm.expires_at || undefined}
                        onSelect={(date) => setEditVoucherForm(p => ({ ...p, expires_at: date || null }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditVoucherOpen(false)}>Cancel</Button>
              <Button onClick={handleEditVoucher} disabled={saving} className="bg-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </GymLayout>
  );
}
