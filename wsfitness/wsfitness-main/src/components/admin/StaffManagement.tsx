import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Shield, Search, UserPlus, Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StaffMember {
  user_id: string;
  profile: {
    name: string;
    email: string | null;
    avatar_url: string | null;
    member_id: string | null;
  };
  isStaff: boolean;
}

export function StaffManagement() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; member: StaffMember | null; action: 'add' | 'remove' }>({
    open: false,
    member: null,
    action: 'add'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all members with their profiles
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('user_id, profiles:user_id(name, email, avatar_url, member_id)');

      if (membershipError) throw membershipError;

      // Get all staff roles
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');

      if (rolesError) throw rolesError;

      const staffUserIds = new Set(staffRoles?.map(r => r.user_id) || []);

      const membersWithStaffStatus: StaffMember[] = (memberships || []).map(m => ({
        user_id: m.user_id,
        profile: m.profiles as any,
        isStaff: staffUserIds.has(m.user_id)
      }));

      setMembers(membersWithStaffStatus);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStaff = async (member: StaffMember, newValue: boolean) => {
    setConfirmDialog({
      open: true,
      member,
      action: newValue ? 'add' : 'remove'
    });
  };

  const confirmToggle = async () => {
    if (!confirmDialog.member) return;

    const member = confirmDialog.member;
    const newValue = confirmDialog.action === 'add';

    setUpdating(member.user_id);
    setConfirmDialog({ open: false, member: null, action: 'add' });

    try {
      if (newValue) {
        // Add staff role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: member.user_id, role: 'staff' });

        if (error) {
          if (error.code === '23505') {
            toast.info('This user already has staff role');
          } else {
            throw error;
          }
        } else {
          toast.success(`${member.profile.name} is now a staff member`);
        }
      } else {
        // Remove staff role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'staff');

        if (error) throw error;
        toast.success(`Staff access removed from ${member.profile.name}`);
      }

      // Update local state
      setMembers(prev => prev.map(m => 
        m.user_id === member.user_id ? { ...m, isStaff: newValue } : m
      ));
    } catch (error: any) {
      console.error('Error toggling staff status:', error);
      toast.error(error.message || 'Failed to update staff status');
    } finally {
      setUpdating(null);
    }
  };

  // Only show staff members in this tab
  const staffMembers = useMemo(() => members.filter(m => m.isStaff), [members]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return staffMembers;
    const s = search.toLowerCase();
    return staffMembers.filter(m => 
      m.profile.name?.toLowerCase().includes(s) ||
      m.profile.email?.toLowerCase().includes(s) ||
      m.profile.member_id?.toLowerCase().includes(s)
    );
  }, [staffMembers, search]);

  const staffCount = useMemo(() => members.filter(m => m.isStaff).length, [members]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Staff Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage staff access • {staffCount} staff member{staffCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Staff Benefits Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Staff Benefits Include:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• No expiry date required (infinite access until disabled)</li>
              <li>• Unlimited email changes</li>
              <li>• Early check-in access (30 minutes before opening)</li>
              <li>• Special perks and priority access</li>
            </ul>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>

          {/* Members Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Remove Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {search ? 'No staff found matching your search' : 'No staff members yet. Add staff from the Members tab.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {member.profile.avatar_url ? (
                            <img 
                              src={member.profile.avatar_url} 
                              alt={member.profile.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{member.profile.name}</p>
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs mt-1">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active Staff
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {member.profile.member_id || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.profile.email || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {updating === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleToggleStaff(member, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, member: null, action: 'add' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.action === 'add' ? (
                <>
                  <UserPlus className="h-5 w-5 text-primary" />
                  Grant Staff Access
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Remove Staff Access
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {confirmDialog.action === 'add' ? (
              <p className="text-muted-foreground">
                Are you sure you want to grant staff access to <strong>{confirmDialog.member?.profile.name}</strong>?
                They will receive unlimited access, no expiry date, and special perks.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Are you sure you want to remove staff access from <strong>{confirmDialog.member?.profile.name}</strong>?
                They will lose all staff benefits and become a regular member.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, member: null, action: 'add' })}>
              Cancel
            </Button>
            <Button 
              onClick={confirmToggle}
              className={confirmDialog.action === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.action === 'add' ? 'Grant Access' : 'Remove Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
