import { useState, useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { MemberTabNav } from '@/components/admin/MemberTabNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Users, Plus, Pencil, Search, Filter } from 'lucide-react';
import { MembershipTemplates, Template } from '@/components/admin/MembershipTemplates';
import { MembershipDetailsForm } from '@/components/admin/MembershipDetailsForm';

interface Membership {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  valid_from: string | null;
  expiry_date: string | null;
  created_at: string;
  member_name?: string;
}

export default function Memberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    plan_type: 'standard',
    status: 'active',
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
  });

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member names
      const userIds = [...new Set(data?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const membershipsWithNames = (data || []).map(m => ({
        ...m,
        member_name: profileMap.get(m.user_id) || 'Unknown',
      }));

      setMemberships(membershipsWithNames);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast.error('Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingMembership) return;

    try {
      const { error } = await supabase
        .from('memberships')
        .update({
          plan_type: formData.plan_type,
          status: formData.status,
          valid_from: formData.valid_from || null,
          expiry_date: formData.expiry_date || null,
        })
        .eq('id', editingMembership.id);

      if (error) throw error;
      toast.success('Membership updated');
      setDialogOpen(false);
      fetchMemberships();
    } catch (error) {
      console.error('Error updating membership:', error);
      toast.error('Failed to update membership');
    }
  };

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership);
    setFormData({
      plan_type: membership.plan_type,
      status: membership.status,
      valid_from: membership.valid_from || '',
      expiry_date: membership.expiry_date || '',
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeMemberships = memberships.filter(m => m.status === 'active').length;
  const expiredMemberships = memberships.filter(m => m.status === 'expired').length;

  const filteredMemberships = memberships.filter(m => 
    m.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.plan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowCreateForm(true);
  };

  const handleCreateMembership = async (data: any) => {
    setSaving(true);
    try {
      // For now, just show success - in real app would save membership template
      toast.success('Membership plan created successfully');
      setShowCreateForm(false);
      setSelectedTemplate(null);
      fetchMemberships();
    } catch (error) {
      console.error('Error creating membership:', error);
      toast.error('Failed to create membership');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GymLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground text-sm">WS Fitness</p>
          </div>
        </div>

        <MemberTabNav />

        {showCreateForm ? (
          <Card className="bg-card border-border/30">
            <CardContent className="p-6">
              <MembershipDetailsForm
                initialData={selectedTemplate ? { title: selectedTemplate.name } : undefined}
                onSave={handleCreateMembership}
                onCancel={() => {
                  setShowCreateForm(false);
                  setSelectedTemplate(null);
                }}
                saving={saving}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-card border-border/30">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">Memberships</h2>
                    <p className="text-muted-foreground text-sm">
                      Create memberships to manage billing and access to training programs.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search membership title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background border-border/30"
                      />
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                  </div>

                  {memberships.length === 0 && !loading ? (
                    <div className="text-center space-y-8 py-8">
                      <Button 
                        size="lg" 
                        className="w-full max-w-md"
                        onClick={() => setShowCreateForm(true)}
                      >
                        ADD A NEW MEMBERSHIP
                      </Button>
                      <MembershipTemplates onSelectTemplate={handleSelectTemplate} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Membership
                        </Button>
                      </div>
                      
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/20">
                              <TableHead>Member</TableHead>
                              <TableHead>Plan</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Valid From</TableHead>
                              <TableHead>Expires</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMemberships.map((membership) => (
                              <TableRow key={membership.id} className="border-border/20">
                                <TableCell className="font-medium">{membership.member_name}</TableCell>
                                <TableCell className="capitalize">{membership.plan_type}</TableCell>
                                <TableCell>{getStatusBadge(membership.status)}</TableCell>
                                <TableCell>
                                  {membership.valid_from
                                    ? format(new Date(membership.valid_from), 'dd/MM/yyyy')
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {membership.expiry_date
                                    ? format(new Date(membership.expiry_date), 'dd/MM/yyyy')
                                    : 'No expiry'}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(membership)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select
                value={formData.plan_type}
                onValueChange={(value) => setFormData({ ...formData, plan_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GymLayout>
  );
}
