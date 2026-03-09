import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Check, XCircle, RefreshCw, Shield, Users, Dumbbell, Undo2 } from 'lucide-react';

interface RejectedMember {
  id: string;
  user_id: string;
  plan_type: string;
  created_at: string;
  updated_at: string;
  profiles: {
    name: string;
    email: string;
    phone_number: string | null;
  } | null;
}

export function RejectedApplications() {
  const [rejectedMembers, setRejectedMembers] = useState<RejectedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Re-approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RejectedMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');

  const fetchRejectedMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('memberships')
      .select('id, user_id, plan_type, created_at, updated_at, profiles:user_id(name, email, phone_number)')
      .eq('status', 'rejected')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching rejected members:', error);
      toast.error('Failed to load rejected applications');
    } else {
      setRejectedMembers((data as unknown as RejectedMember[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRejectedMembers();
  }, []);

  const openApproveDialog = (member: RejectedMember) => {
    setSelectedMember(member);
    setSelectedRole('member');
    setApproveDialogOpen(true);
  };

  const handleReApprove = async () => {
    if (!selectedMember) return;
    setProcessing(selectedMember.id);
    
    try {
      // 1. Generate unique member ID
      const { data: memberIdData, error: memberIdError } = await supabase
        .rpc('generate_member_id');

      if (memberIdError) throw memberIdError;
      
      const generatedMemberId = memberIdData as string;
      
      // 2. Create QR code data
      const qrPayload = JSON.stringify({
        id: generatedMemberId,
        name: selectedMember.profiles?.name || '',
        phone: selectedMember.profiles?.phone_number || ''
      });

      // 3. Update profile with member_id and QR code data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          member_id: generatedMemberId,
          qr_code_url: qrPayload
        })
        .eq('id', selectedMember.user_id);

      if (profileError) throw profileError;

      // 4. Update membership status to active
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMember.id);

      if (membershipError) throw membershipError;

      // 5. Update user role if not 'member'
      if (selectedRole !== 'member') {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedMember.user_id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: selectedMember.user_id, 
            role: selectedRole as 'admin' | 'coach' | 'member' | 'vendor' 
          });

        if (roleError) throw roleError;
      }

      // 6. Log to audit
      const { data: userData } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert({
        action_type: 'member_reapproved',
        actor_id: userData.user?.id,
        actor_name: actorProfile?.name || 'Admin',
        target_user_id: selectedMember.user_id,
        target_user_name: selectedMember.profiles?.name || 'Unknown',
        details: {
          member_id: generatedMemberId,
          assigned_role: selectedRole,
          plan_type: selectedMember.plan_type
        }
      });

      // 7. Send approval email notification
      if (selectedMember.profiles?.email) {
        try {
          await supabase.functions.invoke('send-member-notification', {
            body: {
              type: 'approved',
              email: selectedMember.profiles.email,
              name: selectedMember.profiles.name || 'Member',
              memberId: generatedMemberId,
              role: selectedRole
            }
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }

      const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
      toast.success(`${selectedMember.profiles?.name} re-approved as ${roleLabel} with ID: ${generatedMemberId}`);
      setApproveDialogOpen(false);
      setSelectedMember(null);
      await fetchRejectedMembers();
    } catch (error: any) {
      console.error('Re-approval error:', error);
      toast.error(error.message || 'Failed to re-approve member');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Rejected ({rejectedMembers.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRejectedMembers}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rejectedMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rejected applications</p>
              <p className="text-sm mt-1">All rejected applications will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.profiles?.name || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{member.profiles?.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(member.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openApproveDialog(member)}
                        disabled={processing === member.id}
                      >
                        {processing === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="h-4 w-4 mr-1" />
                        )}
                        Re-approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Re-Approval Dialog with Role Selection */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Re-approve Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Re-approve <strong>{selectedMember?.profiles?.name}</strong> for access?
            </p>
            
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Member
                    </div>
                  </SelectItem>
                  <SelectItem value="studio">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-violet-500" />
                      Studio
                    </div>
                  </SelectItem>
                  <SelectItem value="coach">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Coach
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === 'member' && 'Standard gym member with access to classes and perks'}
                {selectedRole === 'studio' && 'Studio class instructor - can be assigned to teach classes'}
                {selectedRole === 'coach' && 'Can manage clients and training logs'}
                {selectedRole === 'admin' && 'Full access to admin dashboard and member management'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReApprove}
              disabled={processing === selectedMember?.id}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing === selectedMember?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm Re-approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
