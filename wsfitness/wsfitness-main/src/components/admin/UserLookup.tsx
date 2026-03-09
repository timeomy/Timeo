import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, User, Loader2, Edit, Trash2, Phone, Mail, Calendar, Shield } from 'lucide-react';
import { useMembershipPlans, formatPlanDisplay } from '@/hooks/useMembershipPlans';

interface FoundMember {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  member_id: string | null;
  membership?: {
    status: string;
    plan_type: string;
    expiry_date: string | null;
  };
  roles: string[];
}

interface UserLookupProps {
  onUserUpdated?: () => void;
}

export function UserLookup({ onUserUpdated }: UserLookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FoundMember | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Fetch membership plans from database
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone_number: '', plan_type: '' });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Real-time search as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setNotFound(false);
        return;
      }

      setSearching(true);
      setNotFound(false);

      try {
        // Search by name or email - get more results for scrolling
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, avatar_url, member_id')
          .or(`name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`)
          .order('name')
          .limit(25);

        if (error) throw error;

        if (!profiles || profiles.length === 0) {
          setSearchResults([]);
          setNotFound(true);
          return;
        }

        // Get membership and roles for all results
        const userIds = profiles.map(p => p.id);

        const { data: memberships } = await supabase
          .from('memberships')
          .select('user_id, status, plan_type, expiry_date')
          .in('user_id', userIds);

        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const membershipMap = new Map(memberships?.map(m => [m.user_id, m]) || []);
        const rolesMap = new Map<string, string[]>();
        allRoles?.forEach(r => {
          const existing = rolesMap.get(r.user_id) || [];
          rolesMap.set(r.user_id, [...existing, r.role]);
        });

        const results: FoundMember[] = profiles.map(profile => ({
          ...profile,
          membership: membershipMap.get(profile.id) || undefined,
          roles: rolesMap.get(profile.id) || [],
        }));

        setSearchResults(results);
      } catch (error: any) {
        console.error('Search error:', error);
        toast.error('Failed to search');
      } finally {
        setSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const selectMember = (member: FoundMember) => {
    setSelectedMember(member);
  };

  const openEditDialog = () => {
    if (!selectedMember) return;
    setEditForm({
      name: selectedMember.name,
      phone_number: selectedMember.phone_number || '',
      plan_type: selectedMember.membership?.plan_type || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone_number: editForm.phone_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMember.id);

      if (profileError) throw profileError;

      // Update membership if plan type changed
      if (editForm.plan_type && selectedMember.membership && editForm.plan_type !== selectedMember.membership.plan_type) {
        // Find the plan to get duration for expiry calculation
        const selectedPlan = plans?.find(p => p.title === editForm.plan_type);
        let newExpiry: string | null = null;

        if (selectedPlan) {
          // Calculate new expiry: today + duration_months * 30 days
          const today = new Date();
          const durationDays = selectedPlan.duration_months * 30;
          const expiryDate = new Date(today.getTime() + durationDays * 24 * 60 * 60 * 1000);
          newExpiry = expiryDate.toISOString().split('T')[0];
        }

        const updateData: any = {
          plan_type: editForm.plan_type,
          updated_at: new Date().toISOString(),
        };

        // Only update expiry if we calculated a new one
        if (newExpiry) {
          updateData.expiry_date = newExpiry;
          updateData.status = 'active';
        }

        const { error: membershipError } = await supabase
          .from('memberships')
          .update(updateData)
          .eq('user_id', selectedMember.id);

        if (membershipError) throw membershipError;
      }

      toast.success('Member updated successfully');
      setEditDialogOpen(false);
      
      // Refresh the selected member data
      setSearchTerm(searchTerm + ' '); // Trigger re-search
      setTimeout(() => setSearchTerm(searchTerm.trim()), 100);
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setDeleting(true);

    try {
      // Call the delete-user edge function
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedMember.id },
      });

      if (error) throw error;

      toast.success(`${selectedMember.name} has been deleted`);
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      setSearchResults([]);
      setSearchTerm('');
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'expired': return 'bg-red-500';
      case 'pending_approval': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            User Lookup
          </CardTitle>
          <CardDescription>
            Search for an existing user by name or email to edit or delete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type to search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {searching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
          </div>

          {notFound && searchTerm.length >= 2 && (
            <div className="text-center py-6 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No user found matching "{searchTerm}"</p>
            </div>
          )}

          {/* Search Results List - Always scrollable */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Found {searchResults.length} user{searchResults.length > 1 ? 's' : ''} - click to select
              </p>
              <ScrollArea className="h-[250px] border border-border rounded-lg">
                <div className="divide-y divide-border">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedMember?.id === member.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => selectMember(member)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {member.avatar_url ? (
                            <AvatarImage src={member.avatar_url} alt={member.name} />
                          ) : null}
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {member.membership && (
                          <Badge className={`${getStatusColor(member.membership.status)} text-white text-xs flex-shrink-0`}>
                            {member.membership.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Selected Member Details */}
          {selectedMember && (
            <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {selectedMember.avatar_url ? (
                    <AvatarImage src={selectedMember.avatar_url} alt={selectedMember.name} />
                  ) : null}
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{selectedMember.name}</h3>
                  {selectedMember.member_id && (
                    <p className="text-sm text-primary font-mono">{selectedMember.member_id}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMember.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {role}
                      </Badge>
                    ))}
                    {selectedMember.membership && (
                      <Badge className={`${getStatusColor(selectedMember.membership.status)} text-white text-xs`}>
                        {selectedMember.membership.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedMember.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{selectedMember.email}</span>
                  </div>
                )}
                {selectedMember.phone_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{selectedMember.phone_number}</span>
                  </div>
                )}
                {selectedMember.membership?.plan_type && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{selectedMember.membership.plan_type}</span>
                  </div>
                )}
                {selectedMember.membership?.expiry_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Expires: {new Date(selectedMember.membership.expiry_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={openEditDialog}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Details</DialogTitle>
            <DialogDescription>
              Update information for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={editForm.phone_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select
                value={editForm.plan_type}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, plan_type: v }))}
                disabled={plansLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan"} />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                    <SelectItem value="Staff">Staff (No Expiry)</SelectItem>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.title}>
                        {formatPlanDisplay(plan)} - {plan.duration_months}mo
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the plan will recalculate the expiry date
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete {selectedMember?.name}'s account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
