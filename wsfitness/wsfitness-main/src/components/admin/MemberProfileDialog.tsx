import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, CheckCircle, XCircle, Phone, Mail, CreditCard, Calendar as CalendarIcon, Edit, Save, X, RefreshCw, Loader2, Gift, Plus, Camera, History, MapPin, Ticket, UserCheck, Shield, Key, Pencil, Send, Clock, CalendarDays, RotateCcw, Dumbbell, Zap, Wifi } from 'lucide-react';
import { format, addMonths, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateEncryptedQrPayload } from '@/lib/memberQr';
import { BiometricPhotoCapture } from './BiometricPhotoCapture';
import { NfcCardScanner } from './NfcCardScanner';
import { useMembershipPlans, formatPlanDisplay } from '@/hooks/useMembershipPlans';
import { MemberClassHistory } from './MemberClassHistory';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/auth';
import { extractSessionsFromPlan } from '@/hooks/useMembershipPlans';
interface MemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    user_id: string;
    status: string;
    plan_type: string;
    expiry_date: string | null;
    user_role?: string;
    profiles: {
      name: string;
      email: string | null;
      phone_number: string | null;
      member_id: string | null;
      avatar_url: string | null;
      created_at: string | null;
    } | null;
  } | null;
  onUpdate?: () => void;
  onMemberIdGenerated?: (userId: string, newMemberId: string) => void;
  currentUserId?: string;
}

interface ActivityItem {
  id: string;
  type: 'check_in' | 'redemption' | 'profile_update';
  description: string;
  timestamp: string;
  details?: string;
}

export function MemberProfileDialog({ open, onOpenChange, member, onUpdate, onMemberIdGenerated, currentUserId }: MemberProfileDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Current user role for permission checks
  const { memberRole, hasAdminAccess, isCoach } = useUserRole();
  const { user } = useAuth();
  // Coaching session balance state
  const [sessionBalance, setSessionBalance] = useState<{ total: number; used: number; remaining: number; planName: string; clientId: string } | null>(null);
  const [showSessionAdjust, setShowSessionAdjust] = useState(false);
  const [sessionAdjustAmount, setSessionAdjustAmount] = useState('');
  const [sessionAdjustReason, setSessionAdjustReason] = useState('');
  const [adjustingSessions, setAdjustingSessions] = useState(false);
  
  // Renewal state
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalPlan, setRenewalPlan] = useState<string>('');
  const [renewingMembership, setRenewingMembership] = useState(false);
  
  // Fetch dynamic plans from database
  const { data: membershipPlans, isLoading: plansLoading } = useMembershipPlans();
  
  // Local state synced from props
  const [localMemberId, setLocalMemberId] = useState<string | null>(null);
  const [localPlanType, setLocalPlanType] = useState<string>('');
  const [localName, setLocalName] = useState<string>('');
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localExpiryDate, setLocalExpiryDate] = useState<string | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [localRole, setLocalRole] = useState<string>('member');
  const [savingRole, setSavingRole] = useState(false);
  const [localNfcCardId, setLocalNfcCardId] = useState<string | null>(null);

  // Activity log state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Assign voucher state
  const [showAssignVoucher, setShowAssignVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [assigningVoucher, setAssigningVoucher] = useState(false);
  
  // Account management state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [loadingSessionBalance, setLoadingSessionBalance] = useState(false);
  
  // NFC Scanner state
  const [showNfcScanner, setShowNfcScanner] = useState(false);
  
  // Day Pass date picker dialog state
  const [showDayPassDateDialog, setShowDayPassDateDialog] = useState(false);
  const [dayPassDate, setDayPassDate] = useState<Date>(new Date());
  
  // Confirmation dialog state
  const [confirmEmailChange, setConfirmEmailChange] = useState(false);
  const [confirmPasswordReset, setConfirmPasswordReset] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    plan_type: '',
    expiry_date: null as Date | null,
    member_id: '',
    nfc_card_id: '',
    day_pass_date: new Date() as Date, // For Day Pass: specific visit date
  });

  // Track which member.id we last synced from
  const [syncedMemberId, setSyncedMemberId] = useState<string | null>(null);
  
  // Encrypted QR payload state (must be at top level with other hooks)
  const [qrPayload, setQrPayload] = useState<string>('');

  // Sync from props when member changes
  useEffect(() => {
    if (!open || !member) return;
    
    // Only sync from props when we switch to a DIFFERENT member or first open
    if (syncedMemberId === member.id) return;

    setLocalMemberId(member.profiles?.member_id ?? null);
    setLocalPlanType(member.plan_type);
    setLocalName(member.profiles?.name ?? '');
    setLocalEmail(member.profiles?.email ?? null);
    setLocalPhone(member.profiles?.phone_number ?? null);
    setLocalExpiryDate(member.expiry_date);
    setLocalAvatarUrl(member.profiles?.avatar_url ?? null);
    setLocalRole(member.user_role || 'member');
    setSyncedMemberId(member.id);
    setShowAssignVoucher(false);
    setSelectedVoucherId('');
    setIsEditing(false);
    
    // Fetch NFC card ID from profiles (not included in member prop)
    const fetchNfcCardId = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nfc_card_id')
        .eq('id', member.user_id)
        .maybeSingle();
      setLocalNfcCardId(data?.nfc_card_id ?? null);
    };
    fetchNfcCardId();
  }, [open, member?.id, syncedMemberId]);

  // Fetch coaching session balance
  useEffect(() => {
    if (!open || !member) return;
    fetchSessionBalance();
  }, [open, member?.user_id]);

  // Fetch activity log when dialog opens
  useEffect(() => {
    if (!open || !member) return;
    fetchActivities();
  }, [open, member?.user_id]);

  // Refresh encrypted QR every 30 seconds
  useEffect(() => {
    const generatePayload = () => {
      if (localMemberId && localMemberId.trim().length > 0) {
        const encrypted = generateEncryptedQrPayload(localMemberId);
        setQrPayload(encrypted);
      } else {
        setQrPayload('');
      }
    };
    
    generatePayload();
    const interval = setInterval(generatePayload, 30000);
    return () => clearInterval(interval);
  }, [localMemberId]);

  const fetchActivities = async () => {
    if (!member) return;
    setLoadingActivities(true);
    
    try {
      const allActivities: ActivityItem[] = [];
      
      // Fetch check-ins
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('id, checked_in_at, location, notes')
        .eq('member_id', member.user_id)
        .order('checked_in_at', { ascending: false })
        .limit(10);
      
      if (checkIns) {
        checkIns.forEach(ci => {
          allActivities.push({
            id: `checkin-${ci.id}`,
            type: 'check_in',
            description: 'Checked in',
            timestamp: ci.checked_in_at,
            details: ci.location || undefined,
          });
        });
      }

      // Fetch redemptions
      const { data: redemptions } = await supabase
        .from('redemption_logs')
        .select('id, redeemed_at, vouchers(title, code)')
        .eq('member_id', member.user_id)
        .order('redeemed_at', { ascending: false })
        .limit(10);
      
      if (redemptions) {
        redemptions.forEach(r => {
          allActivities.push({
            id: `redemption-${r.id}`,
            type: 'redemption',
            description: `Redeemed voucher`,
            timestamp: r.redeemed_at,
            details: (r.vouchers as any)?.title || (r.vouchers as any)?.code,
          });
        });
      }

      // Fetch audit logs for profile updates
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, created_at, action_type, details')
        .eq('target_user_id', member.user_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (auditLogs) {
        auditLogs.forEach(log => {
          const details = log.details as Record<string, any> | null;
          allActivities.push({
            id: `audit-${log.id}`,
            type: 'profile_update',
            description: formatActionType(log.action_type, details),
            timestamp: log.created_at,
            details: details?.old_email && details?.new_email 
              ? `${details.old_email} → ${details.new_email}`
              : undefined,
          });
        });
      }

      // Sort all activities by timestamp (newest first)
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(allActivities.slice(0, 20));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchSessionBalance = async () => {
    if (!member) return;
    setLoadingSessionBalance(true);
    try {
      // Check if member is linked as a coaching client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, total_sessions_purchased, carry_over_sessions, package_type, expiry_date, status')
        .eq('member_id', member.user_id)
        .maybeSingle();

      if (!clientData) {
        setSessionBalance(null);
        return;
      }

      // Get membership data for plan info
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('plan_type, valid_from, expiry_date')
        .eq('user_id', member.user_id)
        .maybeSingle();

      // Get all training logs
      const { data: logsData } = await supabase
        .from('training_logs')
        .select('sessions_used, date')
        .eq('client_id', clientData.id);

      const logs = logsData || [];
      const planName = membershipData?.plan_type || clientData.package_type;

      // Don't count carry-over if plan is expired
      const expiry = membershipData?.expiry_date || clientData.expiry_date;
      const expired = expiry ? new Date(expiry) < new Date() : clientData.status === 'expired';
      const carryOver = expired ? 0 : clientData.carry_over_sessions;

      // Try to extract total sessions from the plan
      const totalFromPlan = extractSessionsFromPlan(planName, membershipPlans || undefined);
      const manualTotal = clientData.total_sessions_purchased + carryOver;

      // Calculate used sessions (from plan start if available)
      let sessionsUsed = 0;
      if (membershipData?.valid_from) {
        sessionsUsed = logs
          .filter(log => log.date >= membershipData.valid_from!)
          .reduce((sum, log) => sum + (log.sessions_used || 0), 0);
      } else {
        sessionsUsed = logs.reduce((sum, log) => sum + (log.sessions_used || 0), 0);
      }

      // Plan defines the base sessions; carry-over is additive only if not expired
      const total = totalFromPlan ? totalFromPlan + carryOver : manualTotal;
      setSessionBalance({
        total,
        used: sessionsUsed,
        remaining: total - sessionsUsed,
        planName,
        clientId: clientData.id,
      });
    } catch (error) {
      console.error('Error fetching session balance:', error);
    } finally {
      setLoadingSessionBalance(false);
    }
  };

  const handleSessionAdjustment = async () => {
    if (!member || !sessionBalance) return;
    const amount = parseInt(sessionAdjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      toast.error('Enter a valid number (positive to add, negative to deduct)');
      return;
    }
    if (!sessionAdjustReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setAdjustingSessions(true);
    try {
      // Insert a training_log entry with negative sessions_used (for additions) or positive (for deductions)
      // We use carry_over_sessions on the client record to track manual adjustments
      const { error } = await supabase
        .from('clients')
        .update({ 
          carry_over_sessions: (await supabase
            .from('clients')
            .select('carry_over_sessions')
            .eq('id', sessionBalance.clientId)
            .single()
            .then(r => r.data?.carry_over_sessions || 0)) + amount
        })
        .eq('id', sessionBalance.clientId);

      if (error) throw error;

      // Log the adjustment in audit_logs
      const { data: userData } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert({
        action_type: 'session_adjustment',
        actor_id: userData.user?.id || '',
        actor_name: actorProfile?.name || 'Admin',
        target_user_id: member.user_id,
        target_user_name: member.profiles?.name || 'Unknown',
        details: {
          adjustment: amount,
          reason: sessionAdjustReason.trim(),
          client_id: sessionBalance.clientId,
          previous_remaining: sessionBalance.remaining,
          new_remaining: sessionBalance.remaining + amount,
        },
      });

      toast.success(`Sessions adjusted by ${amount > 0 ? '+' : ''}${amount}`);
      setShowSessionAdjust(false);
      setSessionAdjustAmount('');
      setSessionAdjustReason('');
      fetchSessionBalance();
      onUpdate?.();
    } catch (error: any) {
      console.error('Session adjustment error:', error);
      toast.error(error.message || 'Failed to adjust sessions');
    } finally {
      setAdjustingSessions(false);
    }
  };

  const formatActionType = (action: string, details?: any): string => {
    const map: Record<string, string> = {
      'membership_renewed': 'Membership renewed',
      'profile_updated': 'Profile updated',
      'member_created': 'Account created',
      'voucher_assigned': 'Voucher assigned',
      'email_changed': 'Email changed',
      'password_reset': 'Password reset by admin',
      'user_credentials_updated': 'Credentials updated',
      'role_changed': 'Role changed',
      'user_created': 'Account created',
      'user_deleted': 'Account deleted',
    };
    
    // Add detail suffix for email changes
    if (action === 'email_changed' && details?.old_email && details?.new_email) {
      return `Email changed: ${details.old_email} → ${details.new_email}`;
    }
    if (action === 'role_changed' && details?.new_role) {
      return `Role changed to ${details.new_role}`;
    }
    
    return map[action] || action.replace(/_/g, ' ');
  };

  // Fetch available vouchers when assign panel opens
  useEffect(() => {
    if (!showAssignVoucher) return;
    const fetchVouchers = async () => {
      const { data } = await supabase
        .from('vouchers')
        .select('id, title, code, value, vendors(business_name)')
        .eq('status', 'valid')
        .is('member_id', null)
        .order('created_at', { ascending: false });
      setAvailableVouchers(data || []);
    };
    fetchVouchers();
  }, [showAssignVoucher]);

  const handleAssignVoucher = async () => {
    if (!selectedVoucherId || !member) return;
    setAssigningVoucher(true);
    try {
      const { error } = await supabase.from('member_vouchers').insert({
        member_id: member.user_id,
        voucher_id: selectedVoucherId,
        status: 'active',
      });
      if (error) throw error;
      toast.success('Voucher assigned to member');
      setShowAssignVoucher(false);
      setSelectedVoucherId('');
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign voucher');
    } finally {
      setAssigningVoucher(false);
    }
  };

  // Handle role change - open date picker for day_pass
  const handleRoleChange = async (newRole: string) => {
    if (!member) return;
    
    // Safety check: prevent admin from demoting themselves
    if (member.user_id === currentUserId) {
      toast.error("You cannot change your own role");
      return;
    }

    // If day_pass, open date picker dialog first
    if (newRole === 'day_pass') {
      setDayPassDate(new Date());
      setShowDayPassDateDialog(true);
      return;
    }

    await applyRoleChange(newRole);
  };

  // Apply role change with optional date (for day pass)
  const applyRoleChange = async (newRole: string, selectedDate?: Date) => {
    if (!member) return;

    setSavingRole(true);
    try {
      // First, remove existing role entries for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', member.user_id);

      if (deleteError) throw deleteError;

      // Insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: member.user_id, role: newRole as 'admin' | 'coach' | 'it_admin' | 'member' | 'vendor' | 'staff' | 'day_pass' });

      // If day_pass role, set membership expiry to end of selected date
      if (newRole === 'day_pass' && selectedDate) {
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        await supabase
          .from('memberships')
          .update({ 
            expiry_date: endOfDay.toISOString(),
            valid_from: startOfDay.toISOString().split('T')[0],
            plan_type: 'Day Pass',
            status: 'active'
          })
          .eq('user_id', member.user_id);
      }

      if (insertError) throw insertError;

      // Log the change
      const { data: userData } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert({
        action_type: 'role_changed',
        actor_id: userData.user?.id,
        actor_name: actorProfile?.name || 'Admin',
        target_user_id: member.user_id,
        target_user_name: member.profiles?.name || 'Unknown',
        details: {
          previous_role: localRole,
          new_role: newRole,
          ...(selectedDate && { day_pass_date: format(selectedDate, 'yyyy-MM-dd') }),
        },
      });

      setLocalRole(newRole);
      toast.success(`User role updated to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`);
      onUpdate?.();
    } catch (error: any) {
      console.error('Role update error:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDayPassDateConfirm = async () => {
    setShowDayPassDateDialog(false);
    await applyRoleChange('day_pass', dayPassDate);
  };

  const handleBiometricPhotoCapture = async (file: File) => {
    if (!member) return;
    
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${member.user_id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', member.user_id);

      if (updateError) throw updateError;

      // Update local state
      setLocalAvatarUrl(publicUrl);
      toast.success('Biometric photo uploaded successfully');
      onUpdate?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
      throw error; // Re-throw to let BiometricPhotoCapture handle it
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle email change (called after confirmation)
  const handleChangeEmail = async () => {
    if (!member || !newEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailUpdateError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    setEmailUpdateError(null);

    // Be explicit about the access token to avoid any "missing Authorization" situations
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      const msg = 'Session expired. Please log in again.';
      setEmailUpdateError(msg);
      toast.error(msg);
      return;
    }

    setUpdatingCredentials(true);
    try {
      console.log('[MemberProfileDialog] invoking update-user (email)', { userId: member.user_id });

      const invokePromise = supabase.functions.invoke('update-user', {
        body: { userId: member.user_id, email: newEmail.trim() },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000)
      );

      const response = await Promise.race([invokePromise, timeoutPromise]);
      console.log('[MemberProfileDialog] update-user response (email)', response);

      // Handle transport/invocation errors (non-2xx or network failure)
      if (response.error) {
        const msg = response.error.message || 'Failed to invoke update function';
        setEmailUpdateError(msg);
        toast.error(msg, { duration: 4000 });
        return;
      }

      // Backend now returns 200 with { success, error, code, httpStatus }
      const data = response.data ?? {};
      const success = data.success === true;
      const errorCode = data.code as string | undefined;
      const errorMessage = data.error as string | undefined;

      if (!success && errorMessage) {
        setEmailUpdateError(errorMessage);

        // DUPLICATE_EMAIL: show inline message only (no toast) for cleaner UX
        if (errorCode === 'DUPLICATE_EMAIL') {
          return;
        }

        // Other errors: show toast as well
        if (errorCode === 'UNAUTHORIZED' || errorCode === 'FORBIDDEN') {
          toast.error(
            errorCode === 'UNAUTHORIZED'
              ? 'Session expired. Please log in again.'
              : 'Permission denied. Admin access required.',
            { duration: 5000 },
          );
        } else {
          toast.error(errorMessage, { duration: 4000 });
        }
        return;
      }

      // Update UI immediately (props refresh may come later)
      setLocalEmail(newEmail.trim().toLowerCase());

      toast.success('Email updated successfully');
      setShowEmailChange(false);
      setNewEmail('');

      // Refresh activities to show the new audit log entry
      fetchActivities();
      onUpdate?.();
    } catch (error: any) {
      console.error('[MemberProfileDialog] update-user error (email)', error);
      setEmailUpdateError(error?.message || 'Failed to update email');
      toast.error(error.message || 'Failed to update email', { duration: 4000 });
    } finally {
      setUpdatingCredentials(false);
      // Always close the confirmation dialog so the overlay never blocks the UI
      setConfirmEmailChange(false);
    }
  };

  // Handle password reset (set password directly - called after confirmation)
  const handleResetPassword = async () => {
    if (!member || !newPassword.trim()) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Be explicit about the access token to avoid any "missing Authorization" situations
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      toast.error('Session expired. Please log in again.', { duration: 5000 });
      return;
    }

    setUpdatingCredentials(true);
    try {
      console.log('[MemberProfileDialog] invoking update-user (password)', { userId: member.user_id });

      const invokePromise = supabase.functions.invoke('update-user', {
        body: { userId: member.user_id, password: newPassword },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000)
      );

      const response = await Promise.race([invokePromise, timeoutPromise]);
      console.log('[MemberProfileDialog] update-user response (password)', response);

      // Handle function invocation errors (non-2xx responses)
      if (response.error) {
        const ctx = (response.error as any)?.context;
        const ctxBody = ctx?.body;
        let parsed: any = null;
        try {
          parsed = typeof ctxBody === 'string' ? JSON.parse(ctxBody) : ctxBody;
        } catch {
          parsed = null;
        }

        const msg = parsed?.error || response.error.message || 'Failed to invoke update function';

        if (ctx?.status === 401) {
          toast.error('Session expired. Please log in again.', { duration: 5000 });
          return;
        }
        if (ctx?.status === 403) {
          toast.error('Permission denied. Admin access required.', { duration: 5000 });
          return;
        }

        toast.error(msg, { duration: 4000 });
        return;
      }

      // Handle business logic errors returned as 200
      if (response.data?.error) {
        const errorMessage = response.data.error as string;

        if (errorMessage.includes('Access denied')) {
          toast.error('Permission denied. Admin access required.', { duration: 5000 });
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Missing authorization')) {
          toast.error('Session expired. Please log in again.', { duration: 5000 });
        } else {
          toast.error(errorMessage, { duration: 4000 });
        }
        return;
      }
      toast.success('Password reset successfully');
      setShowPasswordReset(false);
      setNewPassword('');

      // Refresh activities to show the new audit log entry
      fetchActivities();
    } catch (error: any) {
      console.error('[MemberProfileDialog] update-user error (password)', error);
      toast.error(error.message || 'Failed to reset password', { duration: 4000 });
    } finally {
      setUpdatingCredentials(false);
      setConfirmPasswordReset(false);
    }
  };

  // Send password reset email to user
  const handleSendPasswordResetEmail = async () => {
    if (!member || !profile?.email) {
      toast.error('User does not have an email address');
      return;
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    setSendingResetEmail(true);
    try {
      // Use custom backend function for branded password reset emails
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: normalizedEmail,
          redirectTo: `${window.location.origin}/update-password`,
        }
      });
      
      if (error) {
        // Handle rate limiting
        if (error.message?.toLowerCase().includes('rate limit')) {
          toast.error('Please wait 60 seconds before trying again.');
        } else {
          throw error;
        }
      } else if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        toast.error((data as { message?: string }).message || 'Failed to send password reset email');
      } else {
        toast.success(`Password reset email sent to ${normalizedEmail}. Please ask the user to check their inbox and spam folder.`, {
          duration: 6000,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Direct NFC card save (when not in edit mode)
  const handleDirectNfcSave = async (cardId: string) => {
    if (!member) return;
    
    try {
      // Check for duplicate NFC Card ID
      const { data: existingNfc, error: nfcCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('nfc_card_id', cardId)
        .neq('id', member.user_id)
        .maybeSingle();
      
      if (nfcCheckError) {
        toast.error(`DB Error: ${nfcCheckError.message}`);
        return;
      }
      if (existingNfc) {
        toast.error('This NFC Card ID is already in use by another member.');
        return;
      }

      // Update profile with new NFC card ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nfc_card_id: cardId })
        .eq('id', member.user_id);

      if (updateError) {
        toast.error(`Failed to save NFC card: ${updateError.message}`);
        return;
      }

      setLocalNfcCardId(cardId);
      toast.success(`NFC card assigned: ${cardId}`);
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save NFC card');
    }
  };

  if (!member) return null;

  const profile = member.profiles;
  const isActive = member.status === 'active';
  
  // Use local state for display
  const displayMemberId = localMemberId;
  const displayPlanType = localPlanType;
  const displayName = localName;
  const displayPhone = localPhone;
  const displayExpiryDate = localExpiryDate;
  const displayAvatarUrl = localAvatarUrl;

  const handleStartEdit = () => {
    setEditForm({
      name: displayName || '',
      phone_number: displayPhone || '',
      plan_type: displayPlanType,
      expiry_date: displayExpiryDate ? new Date(displayExpiryDate) : null,
      member_id: displayMemberId || '',
      nfc_card_id: localNfcCardId || '',
      day_pass_date: displayExpiryDate ? new Date(displayExpiryDate) : new Date(),
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Check if member is active (not expired)
  const isMemberActive = () => {
    if (!displayExpiryDate) return false;
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(displayExpiryDate));
    return isAfter(expiry, today) || expiry.getTime() === today.getTime();
  };
  
  // Check if coach can renew (only if member is expired)
  const canCoachRenew = isCoach && !isMemberActive();
  const canRenew = hasAdminAccess || canCoachRenew;
  const renewButtonDisabled = isCoach && isMemberActive();

  // Handle membership renewal with stacking logic
  const handleRenewMembership = async () => {
    if (!renewalPlan || !member || !user) return;
    
    setRenewingMembership(true);
    try {
      const selectedPlan = membershipPlans?.find(p => p.title === renewalPlan);
      if (!selectedPlan) {
        toast.error('Please select a valid plan');
        return;
      }
      
      // Calculate total duration: (months * 30) + days
      const durationDays = (selectedPlan.duration_months * 30) + (selectedPlan.duration_days || 0);
      const previousExpiry = displayExpiryDate ? new Date(displayExpiryDate) : null;
      const previousStatus = member.status;
      
      let newExpiryDate: Date;
      const today = new Date();
      
      // Sequential Stacking Logic:
      // - If ACTIVE and current expiry > today: New Expiry = Current Expiry + Plan Duration
      // - If EXPIRED or current expiry <= today: New Expiry = Today + Plan Duration
      if (isMemberActive() && previousExpiry && previousExpiry > today) {
        // Stacking: extend from current expiry (sequential extension)
        newExpiryDate = addDays(previousExpiry, durationDays);
      } else {
        // Expired or no valid expiry: start from today
        newExpiryDate = addDays(today, durationDays);
      }
      
      const formattedNewExpiry = format(newExpiryDate, 'yyyy-MM-dd');
      const formattedPreviousExpiry = previousExpiry ? format(previousExpiry, 'yyyy-MM-dd') : null;
      
      // Update membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({
          plan_type: renewalPlan,
          expiry_date: formattedNewExpiry,
          status: 'active',
          valid_from: format(new Date(), 'yyyy-MM-dd'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);
      
      if (membershipError) throw membershipError;
      
      // Log the renewal for audit trail
      const { error: logError } = await supabase
        .from('renewal_logs')
        .insert({
          user_id: member.user_id,
          performed_by: user.id,
          plan_name: renewalPlan,
          amount: selectedPlan.price,
          type: 'Manual Renewal',
          previous_expiry: formattedPreviousExpiry,
          new_expiry: formattedNewExpiry,
          previous_status: previousStatus,
          new_status: 'active',
          notes: isMemberActive() ? 'Stacked renewal (extended from current expiry)' : 'Reactivation (expired member)',
        });
      
      if (logError) {
        console.error('Failed to log renewal:', logError);
        // Don't fail the operation, just warn
      }
      
      // Update local state
      setLocalPlanType(renewalPlan);
      setLocalExpiryDate(formattedNewExpiry);
      
      toast.success(
        isMemberActive() 
          ? `Membership extended to ${format(newExpiryDate, 'PPP')}` 
          : `Membership reactivated until ${format(newExpiryDate, 'PPP')}`
      );
      
      setShowRenewalDialog(false);
      setRenewalPlan('');
      onUpdate?.();
    } catch (error: any) {
      toast.error(`Renewal failed: ${error.message || 'Unknown error'}`);
    } finally {
      setRenewingMembership(false);
    }
  };
  // CRITICAL FIX: No optimistic updates - wait for DB confirmation
  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const newMemberId = editForm.member_id.trim() || null;
      const originalMemberId = displayMemberId || null;
      const newNfcCardId = editForm.nfc_card_id.trim() || null;
      
      // Check for duplicate Member ID if changed
      if (newMemberId && newMemberId !== originalMemberId) {
        const { data: existing, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('member_id', newMemberId)
          .neq('id', member.user_id)
          .maybeSingle();
        
        if (checkError) {
          toast.error(`DB Error: ${checkError.message}`);
          setSaving(false);
          return;
        }
        if (existing) {
          toast.error('This Member ID is already in use by another member.');
          setSaving(false);
          return;
        }
      }

      // Check for duplicate NFC Card ID if changed
      if (newNfcCardId && newNfcCardId !== localNfcCardId) {
        const { data: existingNfc, error: nfcCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nfc_card_id', newNfcCardId)
          .neq('id', member.user_id)
          .maybeSingle();
        
        if (nfcCheckError) {
          toast.error(`DB Error: ${nfcCheckError.message}`);
          setSaving(false);
          return;
        }
        if (existingNfc) {
          toast.error('This NFC Card ID is already in use by another member.');
          setSaving(false);
          return;
        }
      }

      // Update profile (including member_id and nfc_card_id)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone_number: editForm.phone_number,
          member_id: newMemberId,
          nfc_card_id: newNfcCardId,
        })
        .eq('id', member.user_id);

      if (profileError) {
        toast.error(`Profile update failed: ${profileError.message}`);
        setSaving(false);
        return;
      }

      // Update membership - handle Day Pass with valid_from
      const selectedPlan = membershipPlans?.find(p => p.title === editForm.plan_type);
      const isDayPass = selectedPlan?.access_level === 'day_pass' || editForm.plan_type === 'Day Pass';
      
      let formattedExpiry: string | null;
      let formattedValidFrom: string | null = null;
      
      if (isDayPass && editForm.day_pass_date) {
        // Day Pass: set both valid_from and expiry to the selected date
        const dayPassDate = new Date(editForm.day_pass_date);
        formattedValidFrom = format(dayPassDate, 'yyyy-MM-dd');
        // Set expiry to end of that day
        dayPassDate.setHours(23, 59, 59, 999);
        formattedExpiry = dayPassDate.toISOString();
      } else {
        formattedExpiry = editForm.expiry_date ? format(editForm.expiry_date, 'yyyy-MM-dd') : null;
      }
      
      const membershipUpdate: Record<string, any> = {
        plan_type: editForm.plan_type,
        expiry_date: formattedExpiry,
        status: 'active',
      };
      
      if (formattedValidFrom) {
        membershipUpdate.valid_from = formattedValidFrom;
      }
      
      const { error: membershipError } = await supabase
        .from('memberships')
        .update(membershipUpdate)
        .eq('id', member.id);

      if (membershipError) {
        toast.error(`Membership update failed: ${membershipError.message}`);
        setSaving(false);
        return;
      }

      // SUCCESS: Now update local state after DB confirmation
      setLocalName(editForm.name);
      setLocalPhone(editForm.phone_number);
      setLocalPlanType(editForm.plan_type);
      setLocalExpiryDate(formattedExpiry);
      setLocalMemberId(newMemberId);
      setLocalNfcCardId(newNfcCardId);

      // Update parent list if member ID changed
      if (newMemberId !== originalMemberId) {
        onMemberIdGenerated?.(member.user_id, newMemberId || '');
      }

      toast.success('Member updated successfully');
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Failed to update member'}`);
    } finally {
      setSaving(false);
    }
  };

  // CRITICAL FIX: No optimistic updates - wait for DB confirmation
  const handleGenerateMemberId = async () => {
    if (displayMemberId) {
      const confirmed = window.confirm('This member already has an ID assigned. Do you want to overwrite it?');
      if (!confirmed) return;
    }

    setGeneratingId(true);
    try {
      // Generate new ID
      const { data: newMemberId, error: genError } = await supabase.rpc('generate_member_id');

      if (genError) {
        toast.error(`Generation failed: ${genError.message}`);
        setGeneratingId(false);
        return;
      }

      // Persist to DB first (no optimistic update)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ member_id: newMemberId })
        .eq('id', member.user_id);

      if (updateError) {
        toast.error(`Save failed: ${updateError.message}`);
        setGeneratingId(false);
        return;
      }

      // SUCCESS: Now update local state after DB confirmation
      setLocalMemberId(newMemberId);
      setEditForm(p => ({ ...p, member_id: newMemberId }));
      
      // Update parent's list
      onMemberIdGenerated?.(member.user_id, newMemberId);
      
      toast.success(`ID Saved: ${newMemberId}`);
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Failed to generate Member ID'}`);
    } finally {
      setGeneratingId(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'check_in': return <MapPin className="h-3 w-3 text-emerald-500" />;
      case 'redemption': return <Ticket className="h-3 w-3 text-purple-500" />;
      case 'profile_update': return <UserCheck className="h-3 w-3 text-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Member Profile
            </span>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="classes">
              <CalendarDays className="h-4 w-4 mr-1" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="h-4 w-4 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {/* Avatar and Name Section */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {displayAvatarUrl ? (
                    <img
                      src={displayAvatarUrl}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-primary/50"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-4 border-primary/50">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {isEditing && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                      onClick={() => setShowPhotoCapture(true)}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Biometric Photo Capture Modal */}
                <BiometricPhotoCapture
                  open={showPhotoCapture}
                  onOpenChange={setShowPhotoCapture}
                  onCapture={handleBiometricPhotoCapture}
                  currentAvatarUrl={displayAvatarUrl}
                />
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full Name"
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h2 className="text-xl font-display tracking-wide">{displayName || 'Unknown'}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        {member.status}
                      </Badge>
                    )}
                  </div>
                  {/* Member Since */}
                  {member.profiles?.created_at && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Member Since: {new Date(member.profiles.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Member Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Member ID
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editForm.member_id}
                        onChange={(e) => setEditForm(p => ({ ...p, member_id: e.target.value.toUpperCase() }))}
                        placeholder="WS-2025-0001"
                        className="h-8 font-mono text-primary"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleGenerateMemberId}
                        disabled={generatingId}
                        title="Auto-generate WS-ID"
                      >
                        {generatingId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="font-mono font-medium text-primary">
                      {displayMemberId || 'Not assigned'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> Plan Type
                  </span>
                  {isEditing ? (
                    <Select
                      value={editForm.plan_type}
                      onValueChange={(v) => {
                        // Find the selected plan to auto-calculate expiry
                        const selectedPlan = membershipPlans?.find(p => p.title === v);
                        
                        if (v === 'Staff') {
                          // Staff has no expiry
                          setEditForm(p => ({ ...p, plan_type: v, expiry_date: null }));
                        } else if (selectedPlan?.access_level === 'day_pass') {
                          // Day Pass: default to today, user can pick a specific date
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          setEditForm(p => ({ ...p, plan_type: v, expiry_date: today, day_pass_date: new Date() }));
                        } else if (selectedPlan) {
                          // Auto-calculate expiry with STACKING logic:
                          // - If ACTIVE: Extend from current expiry
                          // - If EXPIRED: Start from today
                          const durationDays = selectedPlan.duration_months * 30;
                          let baseDate: Date;
                          
                          if (isMemberActive() && displayExpiryDate) {
                            // Stacking: extend from current expiry
                            baseDate = new Date(displayExpiryDate);
                          } else {
                            // Expired: start from today
                            baseDate = new Date();
                          }
                          
                          const newExpiry = addDays(baseDate, durationDays);
                          setEditForm(p => ({ ...p, plan_type: v, expiry_date: newExpiry }));
                        } else {
                          setEditForm(p => ({ ...p, plan_type: v }));
                        }
                      }}
                      disabled={plansLoading}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={plansLoading ? "Loading..." : "Select plan"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto bg-popover">
                        <SelectItem value="Staff">Staff (No Expiry)</SelectItem>
                        {membershipPlans?.map(plan => (
                          <SelectItem key={plan.id} value={plan.title}>
                            {formatPlanDisplay(plan)} - {plan.duration_months}mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{displayPlanType}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <p className="text-sm truncate">{localEmail || profile?.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </span>
                  {isEditing ? (
                    <Input
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm(p => ({ ...p, phone_number: e.target.value }))}
                      placeholder="+60 12-345 6789"
                      className="h-8"
                    />
                  ) : (
                    <p className="text-sm">{displayPhone || 'N/A'}</p>
                  )}
                </div>

                {/* NFC Card ID */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> NFC Card ID
                  </span>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={editForm.nfc_card_id}
                        onChange={(e) => setEditForm(p => ({ ...p, nfc_card_id: e.target.value.toUpperCase() }))}
                        placeholder="Scan or type card number"
                        className="h-8 font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setShowNfcScanner(true)}
                      >
                        <Wifi className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{localNfcCardId || 'Not assigned'}</p>
                      {!localNfcCardId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowNfcScanner(true)}
                        >
                          <Wifi className="h-3 w-3 mr-1" />
                          Scan
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {/* System Role */}
                <div className="col-span-2 space-y-1 border-t border-border/50 pt-3 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> System Role
                  </span>
                  {member.user_id === currentUserId ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {localRole === 'it_admin' ? 'IT Admin' : localRole.charAt(0).toUpperCase() + localRole.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(Cannot change your own role)</span>
                    </div>
                  ) : (
                    <Select
                      value={localRole}
                      onValueChange={handleRoleChange}
                      disabled={savingRole}
                    >
                      <SelectTrigger className="h-8 w-full">
                        {savingRole ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day_pass">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Day Pass
                            <span className="text-xs text-amber-500">(select date)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3" />
                            Member
                          </div>
                        </SelectItem>
                        <SelectItem value="staff">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Staff
                          </div>
                        </SelectItem>
                        <SelectItem value="studio">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-violet-500" />
                            Studio
                          </div>
                        </SelectItem>
                        <SelectItem value="coach">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Coach
                          </div>
                        </SelectItem>
                        <SelectItem value="vendor">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Vendor
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Account Management - Admin Only */}
                {member.user_id !== currentUserId && (
                  <div className="col-span-2 space-y-3 border-t border-border/50 pt-3 mt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Key className="h-3 w-3" /> Account Management
                    </span>
                    
                    {/* Email Change Section */}
                    {!showEmailChange ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setEmailUpdateError(null);
                          setShowEmailChange(true);
                          setNewEmail(profile?.email || '');
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-2" />
                        Change Email Address
                      </Button>
                    ) : (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        <Label className="text-xs">New Email Address</Label>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => {
                              setNewEmail(e.target.value);
                              if (emailUpdateError) setEmailUpdateError(null);
                            }}
                            placeholder="newemail@example.com"
                            className="h-8 flex-1"
                            disabled={updatingCredentials}
                          />
                          <Button
                            size="sm"
                            onClick={() => setConfirmEmailChange(true)}
                            disabled={
                              updatingCredentials ||
                              !newEmail.trim() ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()) ||
                              newEmail.trim().toLowerCase() === (localEmail ?? profile?.email ?? '').toLowerCase()
                            }
                            className="h-8"
                          >
                            {updatingCredentials ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowEmailChange(false);
                              setNewEmail('');
                              setEmailUpdateError(null);
                            }}
                            disabled={updatingCredentials}
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        {emailUpdateError ? (
                          <p className="text-xs text-destructive">{emailUpdateError}</p>
                        ) : null}
                      </div>
                    )}

                    {/* Password Reset Section */}
                    {!showPasswordReset ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start"
                          onClick={() => setShowPasswordReset(true)}
                        >
                          <Key className="h-3 w-3 mr-2" />
                          Set Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start"
                          onClick={handleSendPasswordResetEmail}
                          disabled={sendingResetEmail || !profile?.email}
                        >
                          {sendingResetEmail ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-2" />
                          )}
                          Send Reset Email
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        <Label className="text-xs">New Password</Label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="h-8 flex-1"
                            disabled={updatingCredentials}
                          />
                          <Button
                            size="sm"
                            onClick={() => setConfirmPasswordReset(true)}
                            disabled={updatingCredentials || !newPassword.trim() || newPassword.length < 6}
                            className="h-8"
                          >
                            {updatingCredentials ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowPasswordReset(false);
                              setNewPassword('');
                            }}
                            disabled={updatingCredentials}
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Set a new password directly for this user
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirmation Dialogs */}
                <AlertDialog open={confirmEmailChange} onOpenChange={setConfirmEmailChange}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to change the email for <strong>{displayName}</strong> to <strong>{newEmail}</strong>?
                        This will update their login credentials.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button
                        type="button"
                        onClick={() => {
                          // Close the dialog immediately so it never traps scroll/clicks
                          setConfirmEmailChange(false);
                          void handleChangeEmail();
                        }}
                        disabled={updatingCredentials}
                      >
                        {updatingCredentials ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Change
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={confirmPasswordReset} onOpenChange={setConfirmPasswordReset}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset the password for <strong>{displayName}</strong>?
                        They will need to use the new password to log in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button
                        type="button"
                        onClick={() => {
                          setConfirmPasswordReset(false);
                          void handleResetPassword();
                        }}
                        disabled={updatingCredentials}
                      >
                        {updatingCredentials ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reset Password
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Expiry Date */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {localRole === 'staff' ? 'Access' : (isActive ? 'Valid until' : 'Expired on')}
                </p>
                {localRole === 'staff' ? (
                  <p className="font-medium text-primary">Unlimited</p>
                ) : isEditing ? (
                  membershipPlans?.find(p => p.title === editForm.plan_type)?.access_level === 'day_pass' || editForm.plan_type === 'Day Pass' ? (
                    // Day Pass: Show date picker for selecting visit date
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-center border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(editForm.day_pass_date, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <Calendar
                            mode="single"
                            selected={editForm.day_pass_date}
                            onSelect={(date) => {
                              if (date) {
                                // Set both day_pass_date and expiry_date to end of that day
                                const endOfDay = new Date(date);
                                endOfDay.setHours(23, 59, 59, 999);
                                setEditForm(p => ({ ...p, day_pass_date: date, expiry_date: endOfDay }));
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-amber-600">Pass valid on selected date (expires 11:59 PM)</p>
                    </div>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-center",
                            !editForm.expiry_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.expiry_date ? format(editForm.expiry_date, "PPP") : "Select expiry date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                          mode="single"
                          selected={editForm.expiry_date || undefined}
                          onSelect={(date) => setEditForm(p => ({ ...p, expiry_date: date || null }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  )
                ) : (
                  <p className="font-medium">
                    {displayExpiryDate
                      ? new Date(displayExpiryDate).toLocaleDateString('en-MY', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                )}
              </div>

              {/* Coaching Session Balance */}
              {!isEditing && sessionBalance && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Coaching Sessions</span>
                    </div>
                    {hasAdminAccess && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setShowSessionAdjust(!showSessionAdjust)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Adjust
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{sessionBalance.planName}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className={cn("h-5 w-5", sessionBalance.remaining <= 3 ? "text-amber-500" : "text-primary")} />
                      <div>
                        <p className={cn("text-2xl font-bold", sessionBalance.remaining <= 3 ? "text-amber-500" : "text-primary")}>
                          {sessionBalance.remaining}
                        </p>
                        <p className="text-xs text-muted-foreground">remaining of {sessionBalance.total}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{sessionBalance.used} used</p>
                    </div>
                  </div>

                  {/* Session Adjustment Form */}
                  {showSessionAdjust && (
                    <div className="pt-2 border-t border-primary/20 space-y-2">
                      <Label className="text-xs">Adjust Sessions (+add / -deduct)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={sessionAdjustAmount}
                          onChange={(e) => setSessionAdjustAmount(e.target.value)}
                          placeholder="e.g. +3 or -1"
                          className="h-8 w-24"
                        />
                        <Input
                          value={sessionAdjustReason}
                          onChange={(e) => setSessionAdjustReason(e.target.value)}
                          placeholder="Reason..."
                          className="h-8 flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setShowSessionAdjust(false);
                            setSessionAdjustAmount('');
                            setSessionAdjustReason('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={adjustingSessions || !sessionAdjustAmount || !sessionAdjustReason.trim()}
                          onClick={handleSessionAdjustment}
                        >
                          {adjustingSessions && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Apply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!isEditing && loadingSessionBalance && (
                <div className="p-3 rounded-xl bg-muted/50 animate-pulse h-20" />
              )}

              {/* Renew Membership Button */}
              {!isEditing && localRole !== 'staff' && (
                <div className="pt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full",
                              renewButtonDisabled 
                                ? "opacity-50 cursor-not-allowed" 
                                : "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                            )}
                            onClick={() => setShowRenewalDialog(true)}
                            disabled={renewButtonDisabled}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {isMemberActive() ? 'Extend Membership' : 'Renew Membership'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {renewButtonDisabled && (
                        <TooltipContent side="bottom" className="max-w-[250px]">
                          <p className="text-xs">
                            Coach permission restricted: Cannot renew active plans. Please contact Admin.
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {!isEditing && displayMemberId && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Member ID</p>
                    <p className="font-mono text-lg font-bold text-primary tracking-wider">
                      {displayMemberId}
                    </p>
                  </div>
                  <div className="p-4 bg-[hsl(var(--qr-bg))] rounded-2xl shadow-lg">
                    {qrPayload ? (
                      <QRCodeSVG
                        value={qrPayload}
                        size={160}
                        level="H"
                        includeMargin={false}
                        bgColor="hsl(var(--qr-bg))"
                        fgColor="hsl(var(--qr-fg))"
                      />
                    ) : (
                      <div className="w-[160px] h-[160px] flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                        <span className="text-xs text-muted-foreground">Securing ID...</span>
                      </div>
                    )}
                  </div>
                  {/* Secure token label */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    <span>Secure Dynamic ID (Updates every 30s)</span>
                  </div>
                </div>
              )}

              {/* Assign Voucher Section */}
              {!isEditing && (
                <div className="pt-4 border-t border-border">
                  {!showAssignVoucher ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAssignVoucher(true)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Assign Voucher
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Label>Select Voucher</Label>
                      <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a voucher..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVouchers.length === 0 ? (
                            <SelectItem value="_none" disabled>No available vouchers</SelectItem>
                          ) : (
                            availableVouchers.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.title} (RM{v.value}) — {v.vendors?.business_name || 'Unknown'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowAssignVoucher(false);
                            setSelectedVoucherId('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          disabled={!selectedVoucherId || assigningVoucher}
                          onClick={handleAssignVoucher}
                        >
                          {assigningVoucher && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Assign
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Mode Footer */}
              {isEditing && (
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              )}
            </div>
          </TabsContent>

          <TabsContent value="classes" className="flex-1 overflow-hidden mt-4">
            <MemberClassHistory memberId={member.user_id} />
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.description}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(activity.timestamp), 'd MMM, h:mm a')}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Day Pass Date Picker Dialog */}
      <Dialog open={showDayPassDateDialog} onOpenChange={setShowDayPassDateDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Select Day Pass Date
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose the visit date for {member?.profiles?.name || 'this member'}'s Day Pass
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={dayPassDate}
                onSelect={(date) => date && setDayPassDate(date)}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto rounded-md border border-border")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDayPassDateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDayPassDateConfirm}
              disabled={!dayPassDate || savingRole}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {savingRole ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Day Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-500" />
              {isMemberActive() ? 'Extend Membership' : 'Renew Membership'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">{displayName}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Current Status:</span>
                <Badge variant={isMemberActive() ? 'default' : 'destructive'} className="text-xs">
                  {isMemberActive() ? 'Active' : 'Expired'}
                </Badge>
              </div>
              {displayExpiryDate && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{isMemberActive() ? 'Current Expiry:' : 'Expired on:'}</span>
                  <span>{format(new Date(displayExpiryDate), 'PPP')}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select value={renewalPlan} onValueChange={setRenewalPlan} disabled={plansLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={plansLoading ? "Loading plans..." : "Choose a plan"} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {membershipPlans?.filter(p => p.access_level !== 'day_pass').map(plan => (
                    <SelectItem key={plan.id} value={plan.title}>
                      {formatPlanDisplay(plan)} - {plan.duration_months}mo (RM{plan.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renewalPlan && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-xs text-emerald-600 font-medium mb-1">
                  {isMemberActive() ? '📈 Stacking Mode' : '🔄 Reactivation Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const selectedPlan = membershipPlans?.find(p => p.title === renewalPlan);
                    if (!selectedPlan) return '';
                    const durationDays = selectedPlan.duration_months * 30;
                    const baseDate = isMemberActive() && displayExpiryDate 
                      ? new Date(displayExpiryDate) 
                      : new Date();
                    const newExpiry = addDays(baseDate, durationDays);
                    return `New expiry: ${format(newExpiry, 'PPP')}`;
                  })()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowRenewalDialog(false); setRenewalPlan(''); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRenewMembership}
              disabled={!renewalPlan || renewingMembership}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {renewingMembership ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm {isMemberActive() ? 'Extension' : 'Renewal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NFC Card Scanner Dialog */}
      <NfcCardScanner
        open={showNfcScanner}
        onOpenChange={setShowNfcScanner}
        currentCardId={localNfcCardId}
        onCardScanned={(cardId) => {
          if (isEditing) {
            setEditForm(p => ({ ...p, nfc_card_id: cardId }));
          } else {
            // Direct save when not in edit mode
            handleDirectNfcSave(cardId);
          }
        }}
      />
    </Dialog>
  );
}
