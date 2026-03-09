import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Clock, RefreshCw, Shield, Users, Dumbbell, User, AlertTriangle, ZoomIn, UserCog, CalendarClock, Search, Calendar as CalendarIcon, Store } from 'lucide-react';

interface PendingMember {
  id: string;
  user_id: string;
  plan_type: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
    phone_number: string | null;
    avatar_url: string | null;
  } | null;
}

export function MemberApprovals() {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [dayPassDate, setDayPassDate] = useState<Date>(new Date());
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Photo preview dialog state
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewMemberName, setPreviewMemberName] = useState<string>('');

  const fetchPendingMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('memberships')
      .select('id, user_id, plan_type, created_at, profiles:user_id(name, email, phone_number, avatar_url)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending members:', error);
      toast.error('Failed to load pending applications');
    } else {
      setPendingMembers((data as unknown as PendingMember[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingMembers();
  }, []);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return pendingMembers;
    
    const search = searchTerm.toLowerCase();
    return pendingMembers.filter((member) => {
      const name = member.profiles?.name?.toLowerCase() || '';
      const email = member.profiles?.email?.toLowerCase() || '';
      const planType = member.plan_type?.toLowerCase() || '';
      return name.includes(search) || email.includes(search) || planType.includes(search);
    });
  }, [pendingMembers, searchTerm]);

  const openPhotoPreview = (member: PendingMember) => {
    if (member.profiles?.avatar_url) {
      setPreviewPhotoUrl(member.profiles.avatar_url);
      setPreviewMemberName(member.profiles.name || 'Applicant');
      setPhotoPreviewOpen(true);
    }
  };

  const openApproveDialog = (member: PendingMember) => {
    setSelectedMember(member);
    setSelectedRole('member');
    setDayPassDate(new Date()); // Reset to today
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedMember) return;
    setProcessing(selectedMember.id);
    
    try {
      let generatedMemberId: string | null = null;
      
      // Vendors don't get a member ID - skip ID generation for them
      if (selectedRole !== 'vendor') {
        // 1. Generate unique member ID
        const { data: memberIdData, error: memberIdError } = await supabase
          .rpc('generate_member_id');

        if (memberIdError) throw memberIdError;
        
        generatedMemberId = memberIdData as string;
        
        // 2. Create QR code data (we'll store the JSON payload, frontend will render it)
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
            qr_code_url: qrPayload // Store JSON payload for QR generation
          })
          .eq('id', selectedMember.user_id);

        if (profileError) throw profileError;
      }

      // 4. Calculate expiry date for Day Pass (use selected date)
      let expiryDate: string | null = null;
      let validFrom: string | null = null;
      let planType = selectedMember.plan_type;
      
      if (selectedRole === 'day_pass') {
        // Use the selected day pass date
        const selectedDate = new Date(dayPassDate);
        selectedDate.setHours(0, 0, 0, 0);
        validFrom = selectedDate.toISOString().split('T')[0];
        
        const endOfDay = new Date(dayPassDate);
        endOfDay.setHours(23, 59, 59, 999);
        expiryDate = endOfDay.toISOString();
        planType = 'Day Pass';
      }

      // 5. Update membership status (vendors get 'vendor' status, others get 'active')
      const membershipUpdate: Record<string, unknown> = { 
        status: selectedRole === 'vendor' ? 'vendor' : 'active',
        plan_type: selectedRole === 'vendor' ? 'Vendor Partner' : planType,
        updated_at: new Date().toISOString()
      };
      
      if (expiryDate) {
        membershipUpdate.expiry_date = expiryDate;
        membershipUpdate.valid_from = validFrom;
      }
      
      const { error: membershipError } = await supabase
        .from('memberships')
        .update(membershipUpdate)
        .eq('id', selectedMember.id);

      if (membershipError) throw membershipError;

      // 6. Update user role - day_pass uses 'member' role internally
      const actualRole = selectedRole === 'day_pass' ? 'member' : selectedRole;
      if (actualRole !== 'member') {
        // Delete existing member role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedMember.user_id);

        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: selectedMember.user_id, 
            role: actualRole as 'admin' | 'coach' | 'member' | 'vendor' | 'staff'
          });

        if (roleError) throw roleError;
      }

      // 7. Create or update vendor record if vendor role
      if (selectedRole === 'vendor') {
        const { error: vendorError } = await supabase
          .from('vendors')
          .upsert({
            user_id: selectedMember.user_id,
            business_name: selectedMember.profiles?.name || 'Partner Vendor'
          }, { onConflict: 'user_id' });
        
        if (vendorError) throw vendorError;
      }

      // 8. Log to audit
      const { data: userData } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert({
        action_type: selectedRole === 'vendor' ? 'vendor_approved' : 'member_approved',
        actor_id: userData.user?.id,
        actor_name: actorProfile?.name || 'Admin',
        target_user_id: selectedMember.user_id,
        target_user_name: selectedMember.profiles?.name || 'Unknown',
        details: {
          member_id: generatedMemberId,
          assigned_role: selectedRole,
          plan_type: selectedRole === 'vendor' ? 'Vendor Partner' : selectedMember.plan_type
        }
      });

      // 9. Send approval email notification
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
          // Don't block approval if email fails
        }
      }

      const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ');
      const successMsg = selectedRole === 'vendor' 
        ? `${selectedMember.profiles?.name} approved as Vendor Partner`
        : `${selectedMember.profiles?.name} approved as ${roleLabel} with ID: ${generatedMemberId}`;
      toast.success(successMsg);
      setApproveDialogOpen(false);
      setSelectedMember(null);
      await fetchPendingMembers();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve member');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (member: PendingMember) => {
    setSelectedMember(member);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedMember) return;
    
    setProcessing(selectedMember.id);
    
    try {
      // Update membership status to rejected
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMember.id);

      if (membershipError) throw membershipError;

      // Log to audit with rejection reason
      const { data: userData } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert({
        action_type: 'member_rejected',
        actor_id: userData.user?.id,
        actor_name: actorProfile?.name || 'Admin',
        target_user_id: selectedMember.user_id,
        target_user_name: selectedMember.profiles?.name || 'Unknown',
        details: {
          reason: rejectionReason || 'No reason provided',
          plan_type: selectedMember.plan_type
        }
      });

      // Send rejection email notification
      if (selectedMember.profiles?.email) {
        try {
          await supabase.functions.invoke('send-member-notification', {
            body: {
              type: 'rejected',
              email: selectedMember.profiles.email,
              name: selectedMember.profiles.name || 'Applicant',
              reason: rejectionReason || undefined
            }
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
          // Don't block rejection if email fails
        }
      }

      toast.success(`${selectedMember.profiles?.name} application rejected`);
      setRejectDialogOpen(false);
      setSelectedMember(null);
      await fetchPendingMembers();
    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error(error.message || 'Failed to reject member');
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            New Requests ({pendingMembers.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchPendingMembers}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            searchTerm ? (
              <div className="text-center py-12">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No results for "{searchTerm}"</p>
                <Button variant="link" onClick={() => setSearchTerm('')}>Clear search</Button>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
                <p className="text-muted-foreground">No pending applications to review</p>
                <p className="text-sm text-muted-foreground/70 mt-1">New signups will appear here automatically</p>
              </div>
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const hasPhoto = !!member.profiles?.avatar_url;
                  return (
                    <TableRow 
                      key={member.id}
                      className={!hasPhoto ? 'bg-amber-500/5' : ''}
                    >
                      <TableCell>
                        <button
                          onClick={() => hasPhoto && openPhotoPreview(member)}
                          className={`relative group ${hasPhoto ? 'cursor-pointer' : 'cursor-default'}`}
                          disabled={!hasPhoto}
                        >
                          <Avatar className={`h-10 w-10 ${!hasPhoto ? 'border-2 border-amber-500' : 'border border-border'}`}>
                            {hasPhoto ? (
                              <AvatarImage 
                                src={member.profiles?.avatar_url || ''} 
                                alt={member.profiles?.name || 'Photo'} 
                              />
                            ) : null}
                            <AvatarFallback className={!hasPhoto ? 'bg-amber-500/20 text-amber-600' : ''}>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          {hasPhoto && (
                            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                          )}
                          {!hasPhoto && (
                            <div className="absolute -top-1 -right-1">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.profiles?.name || 'N/A'}
                        {!hasPhoto && (
                          <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500/30 text-xs">
                            No Photo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.profiles?.email}</TableCell>
                      <TableCell>{member.profiles?.phone_number || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(member.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => openApproveDialog(member)}
                            disabled={processing === member.id}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {processing === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(member)}
                            disabled={processing === member.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Photo Verification</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <p className="text-sm text-muted-foreground mb-4">{previewMemberName}</p>
            {previewPhotoUrl && (
              <img
                src={previewPhotoUrl}
                alt={previewMemberName}
                className="max-w-full max-h-[400px] rounded-lg object-contain border border-border"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog with Role Selection */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Approve Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {selectedMember?.profiles?.avatar_url ? (
                  <AvatarImage 
                    src={selectedMember.profiles.avatar_url} 
                    alt={selectedMember.profiles.name || 'Photo'} 
                  />
                ) : null}
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedMember?.profiles?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMember?.profiles?.email}</p>
              </div>
            </div>
            
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
                  <SelectItem value="day_pass">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Day Pass
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
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Staff
                    </div>
                  </SelectItem>
                  <SelectItem value="vendor">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Vendor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground">
                {selectedRole === 'member' && 'Standard gym member with access to classes and perks'}
                {selectedRole === 'day_pass' && `Single-day access on ${format(dayPassDate, 'dd MMM yyyy')} - expires at 23:59`}
                {selectedRole === 'studio' && 'Studio class instructor - can be assigned to teach classes'}
                {selectedRole === 'coach' && 'Can manage clients and training logs'}
                {selectedRole === 'admin' && 'Full access to admin dashboard and member management'}
                {selectedRole === 'staff' && 'Staff member - no expiry date or plan type required, can hold multiple roles'}
                {selectedRole === 'vendor' && 'Partner vendor - can issue and manage vouchers, no member ID required'}
              </p>
              
              {/* Day Pass Date Picker */}
              {selectedRole === 'day_pass' && (
                <div className="mt-4 space-y-2">
                  <Label>Select Visit Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dayPassDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dayPassDate ? format(dayPassDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={dayPassDate}
                        onSelect={(date) => date && setDayPassDate(date)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={processing === selectedMember?.id}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing === selectedMember?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You are about to reject the application for <strong>{selectedMember?.profiles?.name}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Rejection Reason (Internal Note)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Optional: Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing === selectedMember?.id}
            >
              {processing === selectedMember?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
