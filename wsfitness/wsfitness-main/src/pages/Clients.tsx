import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Phone, Calendar as CalendarIcon, Package, User, Edit2, Trash2, ClipboardPlus, Zap, History, Dumbbell, Weight, AlertCircle, Filter, RefreshCw, Users, Pencil, RotateCcw, Link, ShoppingCart, Settings2, MoreVertical, Download } from 'lucide-react';
import { ExerciseSelector } from '@/components/clients/ExerciseSelector';
import { CoachAssignmentHistory } from '@/components/clients/CoachAssignmentHistory';
import { TrainingLogExport } from '@/components/clients/TrainingLogExport';
import { MemberSearchSelect } from '@/components/clients/MemberSearchSelect';
import { ClientsExportCard } from '@/components/admin/ClientsExportCard';
import { SessionRenewalDialog } from '@/components/clients/SessionRenewalDialog';
import { useMembershipPlans, extractSessionsFromPlan } from '@/hooks/useMembershipPlans';
import { ManualAdjustmentDialog } from '@/components/clients/ManualAdjustmentDialog';
import { ClientLinkDialog } from '@/components/clients/ClientLinkDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, parse, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoachRealtimeSync } from '@/hooks/useRealtimeSubscription';

// Status filter options
type StatusFilter = 'all' | 'expiring_soon' | 'expired';

// Calculate client status based on expiry date
const getClientExpiryStatus = (expiryDate: string | null): { status: 'active' | 'expiring_soon' | 'expired'; daysRemaining: number | null; label: string } => {
  if (!expiryDate) {
    return { status: 'active', daysRemaining: null, label: 'ACTIVE' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysRemaining = differenceInDays(expiry, today);
  
  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, label: 'EXPIRED' };
  } else if (daysRemaining <= 7) {
    return { status: 'expiring_soon', daysRemaining, label: 'EXPIRING SOON' };
  } else {
    return { status: 'active', daysRemaining, label: 'ACTIVE' };
  }
};

// Database training types - updated to PULL/PUSH/LEGS
type DbTrainingType = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full_body' | 'stretching';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  assigned_coach_id: string | null;
  package_type: string;
  total_sessions_purchased: number;
  carry_over_sessions: number;
  expiry_date: string | null;
  status: 'active' | 'expired';
  profiles?: { name: string } | null;
  sessions_used?: number;
  member_id?: string | null;
  linked_member?: {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    member_id: string | null;
    avatar_url: string | null;
    // Live membership data
    plan_type: string | null;
    membership_status: string | null;
    membership_expiry: string | null;
    membership_valid_from: string | null;
  } | null;
  // Sessions used AFTER the current plan started (for linked members)
  sessions_used_current_plan?: number;
}

interface Coach {
  id: string;
  name: string;
}

interface TrainingLog {
  id: string;
  date: string;
  training_type: DbTrainingType;
  training_types: string[] | null;
  sessions_used: number;
  notes: string | null;
  created_at: string | null;
  weight_kg: number | null;
}

// Updated training types for PULL/PUSH/LEGS system
const TRAINING_TYPES: { value: string; label: string; description: string }[] = [
  { value: 'PULL', label: 'PULL', description: 'Back / Bicep' },
  { value: 'PUSH', label: 'PUSH', description: 'Chest / Shoulder / Tricep' },
  { value: 'LEGS', label: 'LEGS', description: 'Legs' },
];

// Package type presets with default sessions and expiry duration
const PACKAGE_PRESETS: { value: string; label: string; sessions: number; carryOver: number; expiryDays?: number; expiryMonths?: number; expiryWeeks?: number }[] = [
  { value: 'CT-1', label: 'CT-1 - 1 Session (Trial)', sessions: 1, carryOver: 0, expiryDays: 7 }, // 1 week
  { value: 'PT-1', label: 'PT-1 - 1 Session (Trial)', sessions: 1, carryOver: 0, expiryDays: 7 }, // 1 week
  { value: 'CT-16', label: 'CT-16 - 16 Sessions', sessions: 16, carryOver: 0, expiryDays: 42 }, // 6 weeks
  { value: 'PT-16', label: 'PT-16 - 16 Sessions', sessions: 16, carryOver: 0, expiryDays: 42 }, // 6 weeks
  { value: 'CT-48', label: 'CT-48 - 48 Sessions', sessions: 48, carryOver: 0, expiryMonths: 5, expiryWeeks: 2 }, // 5 months + 2 weeks
  { value: 'CT-99', label: 'CT-99 - 99 Sessions', sessions: 99, carryOver: 0, expiryDays: 365 }, // 1 year
  { value: 'CUSTOM', label: 'Custom Package', sessions: 0, carryOver: 0 }, // manual
];

// Calculate expiry date based on package preset
const calculateExpiryFromPackage = (packageType: string): string => {
  const preset = PACKAGE_PRESETS.find(p => p.value === packageType);
  if (!preset || (!preset.expiryDays && !preset.expiryMonths && !preset.expiryWeeks)) {
    return ''; // Manual entry for CUSTOM and PT-DAY
  }
  
  let expiryDate = new Date();
  
  if (preset.expiryMonths) {
    expiryDate.setMonth(expiryDate.getMonth() + preset.expiryMonths);
  }
  if (preset.expiryWeeks) {
    expiryDate.setDate(expiryDate.getDate() + (preset.expiryWeeks * 7));
  }
  if (preset.expiryDays) {
    expiryDate.setDate(expiryDate.getDate() + preset.expiryDays);
  }
  
  return format(expiryDate, 'yyyy-MM-dd');
};

export default function Clients() {
  const { user, role } = useAuth();
  const { data: dbPlans } = useMembershipPlans();
  const [clients, setClients] = useState<Client[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [coachHistoryDialogOpen, setCoachHistoryDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<TrainingLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Session Renewal Dialog state (Package Sales)
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [renewalClient, setRenewalClient] = useState<Client | null>(null);
  
  // Manual Adjustment Dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentClient, setAdjustmentClient] = useState<Client | null>(null);
  
  // Client Link Dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkClient, setLinkClient] = useState<Client | null>(null);
  
  // Linked member state for adding/editing clients
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; email: string | null; phone_number: string | null; member_id: string | null; avatar_url: string | null } | null>(null);
  
  // Edit training log state
  const [editLogDialogOpen, setEditLogDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
  const [editLogFormData, setEditLogFormData] = useState({
    date: '',
    training_types: [] as string[],
    sessions_used: 1,
    notes: '',
    weight_kg: '' as string,
  });
  const [savingLogEdit, setSavingLogEdit] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    assigned_coach_id: '',
    package_type: 'CT-48',
    total_sessions_purchased: 48,
    carry_over_sessions: 0,
    expiry_date: '',
    status: 'active' as 'active' | 'expired',
  });

  const [logFormData, setLogFormData] = useState({
    training_types: [] as string[],
    sessions_used: 1,
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    weight_kg: '' as string,
    custom_training: '' as string,
    exercises: [] as { id: string; name: string; equipment: string; training_type: string }[],
  });

  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [coachName, setCoachName] = useState<string>('');

  const isAdminOrIT = role === 'admin' || role === 'it_admin';

  useEffect(() => {
    fetchClients();
    if (isAdminOrIT) {
      fetchCoaches();
    } else if (role === 'coach' && user) {
      // Fetch coach's own name
      fetchCoachName();
    }
  }, [user, role]);

  const fetchCoachName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setCoachName(data.name);
  };

  const fetchClients = async () => {
    if (!user) return;

    try {
      // Fetch clients
      const clientsQuery = isAdminOrIT
        ? supabase.from('clients').select('*').order('name')
        : supabase.from('clients').select('*').eq('assigned_coach_id', user.id).order('name');

      const { data: clientsData, error: clientsError } = await clientsQuery;
      if (clientsError) throw clientsError;

      // NOTE: clients.assigned_coach_id has no FK to profiles, so we hydrate coach names manually.
      let hydratedClients: Client[] = (clientsData as any) || [];

      if (isAdminOrIT) {
        const coachIds = Array.from(
          new Set((clientsData || []).map((c: any) => c.assigned_coach_id).filter(Boolean)),
        ) as string[];

        if (coachIds.length > 0) {
          const { data: coachProfiles, error: coachProfilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', coachIds);

          if (coachProfilesError) throw coachProfilesError;

          const coachNameById: Record<string, string> = {};
          coachProfiles?.forEach((p: any) => {
            coachNameById[p.id] = p.name;
          });

          hydratedClients = (clientsData as any[])?.map((c: any) => ({
            ...c,
            profiles: c.assigned_coach_id ? { name: coachNameById[c.assigned_coach_id] || 'Unknown' } : null,
          })) as any;
        } else {
          hydratedClients = (clientsData as any[])?.map((c: any) => ({
            ...c,
            profiles: null,
          })) as any;
        }
      }

      // Fetch linked member profiles for clients that have member_id
      const linkedMemberIds = Array.from(
        new Set((clientsData || []).map((c: any) => c.member_id).filter(Boolean))
      ) as string[];

      let linkedMemberMap: Record<string, any> = {};
      if (linkedMemberIds.length > 0) {
        // Fetch profiles
        const { data: linkedProfiles, error: linkedError } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, member_id, avatar_url')
          .in('id', linkedMemberIds);

        if (linkedError) throw linkedError;

        // Fetch memberships for linked members (to get live plan data)
        const { data: linkedMemberships, error: membershipError } = await supabase
          .from('memberships')
          .select('user_id, plan_type, status, expiry_date, valid_from')
          .in('user_id', linkedMemberIds);

        if (membershipError) throw membershipError;

        // Create membership map by user_id
        const membershipByUserId: Record<string, any> = {};
        linkedMemberships?.forEach((m: any) => {
          membershipByUserId[m.user_id] = m;
        });

        linkedProfiles?.forEach((p: any) => {
          const membership = membershipByUserId[p.id];
          linkedMemberMap[p.id] = {
            ...p,
            plan_type: membership?.plan_type || null,
            membership_status: membership?.status || null,
            membership_expiry: membership?.expiry_date || null,
            membership_valid_from: membership?.valid_from || null,
          };
        });
      }

      // Fetch sessions used for each client
      const clientIds = hydratedClients.map((c) => c.id);

      if (clientIds.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from('training_logs')
          .select('client_id, sessions_used')
          .in('client_id', clientIds);

        if (logsError) throw logsError;

        // Calculate sessions used per client
        const sessionsMap: Record<string, number> = {};
        logsData?.forEach((log) => {
          sessionsMap[log.client_id] = (sessionsMap[log.client_id] || 0) + log.sessions_used;
        });

        // For clients with linked members, calculate sessions used AFTER valid_from
        const sessionsAfterPlanStart: Record<string, number> = {};
        for (const client of hydratedClients) {
          if (client.member_id && linkedMemberMap[client.member_id]?.membership_valid_from) {
            const validFrom = linkedMemberMap[client.member_id].membership_valid_from;
            const { data: logsAfterStart } = await supabase
              .from('training_logs')
              .select('sessions_used')
              .eq('client_id', client.id)
              .gte('date', validFrom);
            
            sessionsAfterPlanStart[client.id] = logsAfterStart?.reduce((sum, log) => sum + log.sessions_used, 0) || 0;
          }
        }

        setClients(
          hydratedClients.map((client) => ({
            ...client,
            sessions_used: sessionsMap[client.id] || 0,
            sessions_used_current_plan: sessionsAfterPlanStart[client.id] ?? sessionsMap[client.id] ?? 0,
            linked_member: client.member_id ? linkedMemberMap[client.member_id] || null : null,
          })),
        );
      } else {
        setClients(hydratedClients.map((client) => ({
          ...client,
          linked_member: client.member_id ? linkedMemberMap[client.member_id] || null : null,
        })));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = async () => {
    try {
      // NOTE: user_roles has no FK to profiles, so we hydrate coach names manually.
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach');

      if (rolesError) throw rolesError;

      const coachIds = Array.from(new Set((roleRows || []).map((r) => r.user_id))) as string[];
      if (coachIds.length === 0) {
        setCoaches([]);
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', coachIds);

      if (profilesError) throw profilesError;

      const nameById: Record<string, string> = {};
      profileRows?.forEach((p: any) => {
        nameById[p.id] = p.name;
      });

      const coachList = coachIds
        .map((id) => ({ id, name: nameById[id] || 'Unknown' }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCoaches(coachList);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    }
  };

  // Real-time subscription for automatic data refresh
  useCoachRealtimeSync(fetchClients);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in again');
      return;
    }

    try {
      const assignedCoachId = isAdminOrIT ? (formData.assigned_coach_id || null) : user.id;

      const clientData = {
        name: formData.name,
        phone: formData.phone || null,
        assigned_coach_id: assignedCoachId,
        package_type: formData.package_type,
        total_sessions_purchased: formData.total_sessions_purchased,
        carry_over_sessions: formData.carry_over_sessions,
        expiry_date: formData.expiry_date || null,
        status: formData.status,
        member_id: selectedMember?.id || null, // Link to gym member profile
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        
        if (error) throw error;
        toast.success('Client updated');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);
        
        if (error) throw error;
        toast.success('Client added');
      }

      setDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save client');
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasTrainingType = logFormData.training_types.length > 0 || logFormData.custom_training.trim();
    
    if (!selectedClient || !hasTrainingType) {
      toast.error('Please select at least one training type or enter a custom type');
      return;
    }

    // Check session balance and expiry before logging
    const remainingBalance = calculateRemainingBalance(selectedClient);
    if (remainingBalance <= 0) {
      toast.error('Cannot log session: No sessions remaining');
      return;
    }
    
    // PRIORITY: Use linked member expiry if available, fallback to manual client data
    const effectiveExpiry = selectedClient.linked_member?.membership_expiry || selectedClient.expiry_date;
    const effectiveStatus = selectedClient.linked_member?.membership_status || selectedClient.status;
    const isExpired = effectiveStatus === 'expired' || (effectiveExpiry && new Date(effectiveExpiry) < new Date());
    if (isExpired) {
      toast.error('Cannot log session: Package has expired');
      return;
    }

    try {
      // Build notes with custom training if provided
      let notesContent = logFormData.time;
      if (logFormData.custom_training.trim()) {
        notesContent += ` - Custom: ${logFormData.custom_training.trim()}`;
      }
      if (logFormData.notes.trim()) {
        notesContent += ` - ${logFormData.notes.trim()}`;
      }

      // Create a single log entry with all training types and exercises
      // Map PULL/PUSH/LEGS to a valid DB enum (using 'full_body' as placeholder since training_types stores the actual types)
      const logEntry = {
        client_id: selectedClient.id,
        coach_id: user?.id,
        date: logFormData.date,
        training_type: 'full_body' as const, // Use full_body as placeholder; actual types stored in training_types
        training_types: logFormData.training_types.length > 0 ? logFormData.training_types : null,
        sessions_used: logFormData.sessions_used,
        notes: notesContent,
        weight_kg: logFormData.weight_kg ? parseFloat(logFormData.weight_kg) : null,
        exercises: logFormData.exercises.length > 0 ? logFormData.exercises : null,
      };

      const { error } = await supabase
        .from('training_logs')
        .insert(logEntry);

      if (error) throw error;
      
      toast.success('Session logged successfully');
      setLogDialogOpen(false);
      setSelectedClient(null);
      setLogFormData({ 
        training_types: [], 
        sessions_used: 1, 
        notes: '', 
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        weight_kg: '',
        custom_training: '',
        exercises: []
      });
      setShowCustomInput(false);
      setLastWeight(null);
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to log session');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast.success('Client deleted');
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      assigned_coach_id: client.assigned_coach_id || '',
      package_type: client.package_type,
      total_sessions_purchased: client.total_sessions_purchased,
      carry_over_sessions: client.carry_over_sessions,
      expiry_date: client.expiry_date || '',
      status: client.status,
    });
    setDialogOpen(true);
  };

  const openLogDialog = async (client: Client) => {
    const remainingBalance = calculateRemainingBalance(client);
    
    // PRIORITY: Use linked member data if available, fallback to manual client data
    const effectiveExpiry = client.linked_member?.membership_expiry || client.expiry_date;
    const effectiveStatus = client.linked_member?.membership_status || client.status;
    const isExpired = effectiveStatus === 'expired' || (effectiveExpiry && new Date(effectiveExpiry) < new Date());
    
    if (remainingBalance <= 0) {
      toast.error('Cannot log session: No sessions remaining');
      return;
    }
    
    if (isExpired) {
      toast.error('Cannot log session: Package has expired');
      return;
    }
    
    setSelectedClient(client);
    setLogFormData({ 
      training_types: [], 
      sessions_used: 1, 
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      weight_kg: '',
      custom_training: '',
      exercises: []
    });
    setShowCustomInput(false);
    setLastWeight(null);
    
    // Fetch last weight for this client
    try {
      const { data } = await supabase
        .from('training_logs')
        .select('weight_kg')
        .eq('client_id', client.id)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.weight_kg) {
        setLastWeight(Number(data.weight_kg));
      }
    } catch (error) {
      console.error('Error fetching last weight:', error);
    }
    
    setLogDialogOpen(true);
  };

  const openHistoryDialog = async (client: Client) => {
    setSelectedClient(client);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('training_logs')
        .select('id, date, training_type, training_types, sessions_used, notes, created_at, weight_kg')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setClientHistory(data || []);
    } catch (error) {
      console.error('Error fetching client history:', error);
      toast.error('Failed to load training history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open edit log dialog (admin/IT only)
  const openEditLogDialog = (log: TrainingLog) => {
    setEditingLog(log);
    setEditLogFormData({
      date: log.date,
      training_types: log.training_types || [log.training_type],
      sessions_used: log.sessions_used,
      notes: log.notes || '',
      weight_kg: log.weight_kg?.toString() || '',
    });
    setEditLogDialogOpen(true);
  };

  // Save edited training log
  const handleSaveLogEdit = async () => {
    if (!editingLog) return;

    setSavingLogEdit(true);
    try {
      const { error } = await supabase
        .from('training_logs')
        .update({
          date: editLogFormData.date,
          training_types: editLogFormData.training_types.length > 0 ? editLogFormData.training_types : null,
          sessions_used: editLogFormData.sessions_used,
          notes: editLogFormData.notes || null,
          weight_kg: editLogFormData.weight_kg ? parseFloat(editLogFormData.weight_kg) : null,
        })
        .eq('id', editingLog.id);

      if (error) throw error;

      toast.success('Training log updated');
      setEditLogDialogOpen(false);
      setEditingLog(null);
      
      // Refresh history
      if (selectedClient) {
        const { data } = await supabase
          .from('training_logs')
          .select('id, date, training_type, training_types, sessions_used, notes, created_at, weight_kg')
          .eq('client_id', selectedClient.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50);
        setClientHistory(data || []);
      }
      fetchClients(); // Refresh session counts
    } catch (error: any) {
      console.error('Error updating training log:', error);
      toast.error(error.message || 'Failed to update training log');
    } finally {
      setSavingLogEdit(false);
    }
  };

  // Delete training log (admin/IT only)
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this training log? This will restore the session to the client.')) return;

    try {
      const { error } = await supabase
        .from('training_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      toast.success('Training log deleted - session restored');
      
      // Refresh history
      setClientHistory(prev => prev.filter(log => log.id !== logId));
      fetchClients(); // Refresh session counts
    } catch (error: any) {
      console.error('Error deleting training log:', error);
      toast.error(error.message || 'Failed to delete training log');
    }
  };

  const getTrainingTypeLabel = (type: DbTrainingType) => {
    const found = TRAINING_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const resetForm = () => {
    setEditingClient(null);
    setSelectedMember(null);
    setFormData({
      name: '',
      phone: '',
      assigned_coach_id: '',
      package_type: 'CT48',
      total_sessions_purchased: 48,
      carry_over_sessions: 0,
      expiry_date: '',
      status: 'active',
    });
  };

  // Open renewal dialog (Package Sales)
  const openRenewalDialog = (client: Client) => {
    setRenewalClient(client);
    setRenewalDialogOpen(true);
  };

  // Open manual adjustment dialog
  const openAdjustmentDialog = (client: Client) => {
    setAdjustmentClient(client);
    setAdjustmentDialogOpen(true);
  };

  const calculateRemainingBalance = (client: Client) => {
    // Don't count carry-over if plan is expired (unused sessions don't roll over)
    const expiry = client.linked_member?.membership_expiry || client.expiry_date;
    const expired = expiry ? new Date(expiry) < new Date() : client.status === 'expired';
    const carryOver = expired ? 0 : client.carry_over_sessions;
    const manualTotal = client.total_sessions_purchased + carryOver;
    const totalUsed = client.sessions_used || 0;

    // If linked to a membership, try plan-based extraction
    if (client.linked_member?.plan_type) {
      const planType = client.linked_member.plan_type;
      const totalFromPlan = extractSessionsFromPlan(planType, dbPlans || undefined);
      if (totalFromPlan != null) {
        // Plan defines the base sessions; carry-over is additive only if not expired
        const effectiveTotal = totalFromPlan + carryOver;
        const used = client.sessions_used_current_plan ?? totalUsed;
        return effectiveTotal - used;
      }
    }
    
    // Fallback to manual data from clients table
    return manualTotal - totalUsed;
  };

  const isExpiringWithin7Days = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isClientWarning = (client: Client) => {
    const remainingBalance = calculateRemainingBalance(client);
    return remainingBalance < 5 || isExpiringWithin7Days(client.expiry_date);
  };

  const filteredClients = clients.filter(c => {
    // Text search filter
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (statusFilter === 'all') return true;
    
    const expiryStatus = getClientExpiryStatus(c.expiry_date);
    
    if (statusFilter === 'expiring_soon') {
      return expiryStatus.status === 'expiring_soon';
    }
    
    if (statusFilter === 'expired') {
      return expiryStatus.status === 'expired' || c.status === 'expired';
    }
    
    return true;
  });

  const handleExportClientsJSON = async () => {
    try {
      const { data: allClients, error } = await supabase
        .from('clients')
        .select('id, name, phone, package_type, total_sessions_purchased, carry_over_sessions, expiry_date, status, assigned_coach_id, member_id, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!allClients?.length) { toast.error('No clients found'); return; }

      // Compute sessions used
      const clientIds = allClients.map(c => c.id);
      const { data: logs } = await supabase.from('training_logs').select('client_id, sessions_used').in('client_id', clientIds);
      const sessionsMap = new Map<string, number>();
      for (const l of logs || []) sessionsMap.set(l.client_id, (sessionsMap.get(l.client_id) || 0) + l.sessions_used);

      const exportData = allClients.map(c => {
        const total = c.total_sessions_purchased + c.carry_over_sessions;
        const used = sessionsMap.get(c.id) || 0;
        return { ...c, sessions_used: used, sessions_remaining: Math.max(0, total - used) };
      });

      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), total_clients: exportData.length, clients: exportData }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportData.length} clients`);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  return (
    <AppLayout title="CLIENTS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Status Filter Dropdown */}
          <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="expiring_soon">🟡 Expiring Soon</SelectItem>
              <SelectItem value="expired">🔴 Expired</SelectItem>
            </SelectContent>
          </Select>
          {isAdminOrIT && (
            <Button variant="outline" size="icon" className="shrink-0" onClick={handleExportClientsJSON} title="Export clients as JSON">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" className="shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editingClient ? 'Edit Client' : 'Add Client'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Link to existing member option */}
                {!editingClient && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Link to Gym Member (Optional)
                    </Label>
                    <MemberSearchSelect
                      value={selectedMember}
                      onChange={(member) => {
                        setSelectedMember(member);
                        if (member) {
                          // Auto-fill form from member data
                          setFormData(prev => ({
                            ...prev,
                            name: member.name,
                            phone: member.phone_number || prev.phone,
                          }));
                        }
                      }}
                      placeholder="Search by name, email, or member ID..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Linking syncs client data with their gym membership profile
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={!!selectedMember}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!!selectedMember}
                  />
                </div>
                {isAdminOrIT ? (
                  <div className="space-y-2">
                    <Label>Assigned Coach</Label>
                    <Select
                      value={formData.assigned_coach_id}
                      onValueChange={(v) => setFormData({ ...formData, assigned_coach_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coach" />
                      </SelectTrigger>
                      <SelectContent>
                        {coaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Assigned Coach</Label>
                    <Input value={coachName || 'You'} disabled className="bg-muted" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Package Type</Label>
                  <Select
                    value={formData.package_type}
                    onValueChange={(v) => {
                      const preset = PACKAGE_PRESETS.find(p => p.value === v);
                      const calculatedExpiry = calculateExpiryFromPackage(v);
                      
                      if (preset) {
                        setFormData({ 
                          ...formData, 
                          package_type: v,
                          total_sessions_purchased: preset.sessions,
                          carry_over_sessions: preset.carryOver,
                          expiry_date: v === 'CUSTOM' ? '' : calculatedExpiry
                        });
                      } else {
                        setFormData({ ...formData, package_type: v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_PRESETS.map((pkg) => (
                        <SelectItem key={pkg.value} value={pkg.value}>{pkg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Sessions</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.total_sessions_purchased}
                      onChange={(e) => setFormData({ ...formData, total_sessions_purchased: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carry Over</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.carry_over_sessions}
                      onChange={(e) => setFormData({ ...formData, carry_over_sessions: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expiry_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiry_date ? format(parse(formData.expiry_date, 'yyyy-MM-dd', new Date()), 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.expiry_date ? parse(formData.expiry_date, 'yyyy-MM-dd', new Date()) : undefined}
                        onSelect={(date) => setFormData({ ...formData, expiry_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v: 'active' | 'expired') => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Log Session Dialog */}
        <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Log Session - {selectedClient?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLogSession} className="space-y-4 mt-4">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={logFormData.date}
                    onChange={(e) => setLogFormData({ ...logFormData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={logFormData.time}
                    onChange={(e) => setLogFormData({ ...logFormData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Training Types - PULL/PUSH/LEGS selection */}
              <div className="space-y-3">
                <Label>Training Type * <span className="text-xs text-muted-foreground">(select one or more)</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  {TRAINING_TYPES.map((type) => {
                    const isSelected = logFormData.training_types.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setLogFormData({ 
                              ...logFormData, 
                              training_types: logFormData.training_types.filter(t => t !== type.value),
                              exercises: logFormData.exercises.filter(e => e.training_type !== type.value)
                            });
                          } else {
                            setLogFormData({ 
                              ...logFormData, 
                              training_types: [...logFormData.training_types, type.value] 
                            });
                          }
                        }}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                          isSelected
                            ? 'bg-primary/20 text-primary border-primary glow'
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted/80 hover:border-muted-foreground/20'
                        }`}
                      >
                        <span className="text-base">{type.label}</span>
                        <span className="text-[10px] font-normal opacity-70">{type.description}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Custom Training */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showCustomInput || logFormData.custom_training
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    + Add Custom Training
                  </button>
                </div>
                {showCustomInput && (
                  <Input
                    value={logFormData.custom_training}
                    onChange={(e) => setLogFormData({ ...logFormData, custom_training: e.target.value })}
                    placeholder="Enter custom training type..."
                    className="mt-2"
                  />
                )}
              </div>

              {/* Exercise Selector */}
              <ExerciseSelector
                selectedTrainingTypes={logFormData.training_types}
                selectedExercises={logFormData.exercises}
                onExercisesChange={(exercises) => setLogFormData({ ...logFormData, exercises })}
              />

              {/* Weight (KG) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Weight (KG)
                  {lastWeight && (
                    <span className="text-xs text-muted-foreground ml-2">
                      Last: {lastWeight} kg
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={logFormData.weight_kg}
                  onChange={(e) => setLogFormData({ ...logFormData, weight_kg: e.target.value })}
                  placeholder="Enter current weight..."
                />
              </div>

              {/* Session Deduction Info */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>1 session will be deducted</span>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Special Training)</Label>
                <Textarea
                  value={logFormData.notes}
                  onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
                  placeholder="Enter any special training notes..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={logFormData.training_types.length === 0 && !logFormData.custom_training.trim()}>
                Log Session
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Client History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <History className="h-5 w-5" />
                {selectedClient?.name} - History
              </DialogTitle>
              <div className="flex gap-2 mt-2">
                <TrainingLogExport clientName={selectedClient?.name || ''} logs={clientHistory} />
                {isAdminOrIT && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCoachHistoryDialogOpen(true)}>
                    <Users className="h-4 w-4" />
                    Coach History
                  </Button>
                )}
              </div>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : clientHistory.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No training history yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientHistory.map((log) => {
                    // Use training_types array if available, otherwise fallback to single training_type
                    const types = log.training_types && log.training_types.length > 0 
                      ? log.training_types 
                      : [log.training_type];
                    
                    return (
                      <div 
                        key={log.id} 
                        className="p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-wrap gap-1">
                            {types.map((type, idx) => (
                              <span key={idx} className="pill-teal">{getTrainingTypeLabel(type as DbTrainingType)}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.date), 'MMM d, yyyy')}
                            </span>
                            {isAdminOrIT && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => openEditLogDialog(log)}
                                  title="Edit log"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteLog(log.id)}
                                  title="Delete log"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{log.sessions_used} session{log.sessions_used > 1 ? 's' : ''}</span>
                          </div>
                          {log.weight_kg && (
                            <div className="flex items-center gap-2">
                              <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{log.weight_kg} kg</span>
                            </div>
                          )}
                        </div>
                        {log.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Coach Assignment History Dialog */}
        <Dialog open={coachHistoryDialogOpen} onOpenChange={setCoachHistoryDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedClient?.name} - Coach History
              </DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <CoachAssignmentHistory clientId={selectedClient.id} clientName={selectedClient.name} />
            )}
          </DialogContent>
        </Dialog>

        {/* Client List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                {search ? 'No clients found' : 'No clients yet. Add your first client!'}
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client, index) => {
              // PRIORITY: Use linked member data if available, fallback to manual data
              const hasLinkedData = client.linked_member && client.linked_member.plan_type;
              
              // Display values - prioritize linked data
              const displayPlanType = hasLinkedData ? client.linked_member!.plan_type! : client.package_type;
              const displayExpiryDate = hasLinkedData ? client.linked_member!.membership_expiry : client.expiry_date;
              const displayStatus = hasLinkedData 
                ? (client.linked_member!.membership_status === 'active' ? 'active' : 'expired') as 'active' | 'expired'
                : client.status;
              
              // Calculate remaining balance (still from training logs for PT sessions)
              const remainingBalance = calculateRemainingBalance(client);
              const isLowBalance = remainingBalance < 5;
              const isZeroBalance = remainingBalance <= 0;
              
              // Use display expiry for status calculation
              const expiryStatus = getClientExpiryStatus(displayExpiryDate);
              const isExpired = displayStatus === 'expired' || expiryStatus.status === 'expired';
              const expiringWarning = expiryStatus.status === 'expiring_soon';
              const hasWarning = isLowBalance || expiringWarning || isExpired;
              const cannotTrain = isZeroBalance || isExpired;
              
              // Determine status badge color and text
              const getStatusBadge = () => {
                if (isExpired) {
                  return (
                    <Badge className="text-xs bg-red-500 hover:bg-red-600 text-white">
                      🔴 EXPIRED
                    </Badge>
                  );
                }
                if (expiringWarning) {
                  return (
                    <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600 text-black">
                      🟡 EXPIRING SOON ({expiryStatus.daysRemaining}d)
                    </Badge>
                  );
                }
                return (
                  <Badge className="text-xs bg-green-500 hover:bg-green-600 text-white">
                    🟢 ACTIVE
                  </Badge>
                );
              };
              
              return (
                <Card 
                  key={client.id} 
                  className={`ios-card animate-slide-up ${isExpired ? 'border-2 border-red-500' : expiringWarning ? 'border-2 border-yellow-500' : hasWarning ? 'border-2 border-destructive' : ''}`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar - Show linked member's photo or placeholder */}
                      <div className="shrink-0">
                        {client.linked_member?.avatar_url ? (
                          <img 
                            src={client.linked_member.avatar_url} 
                            alt={client.linked_member.name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/50"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Name and Status */}
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                          {client.linked_member && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <Link className="h-3 w-3" />
                            </span>
                          )}
                          {getStatusBadge()}
                          {isZeroBalance && !isExpired && (
                            <Badge variant="destructive" className="text-xs">No Sessions</Badge>
                          )}
                        </div>
                        
                        {/* Renewal Required Warning */}
                        {isExpired && (
                          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 text-sm font-medium">
                            <RefreshCw className="h-4 w-4" />
                            <span>Renewal Required - Sessions invalidated</span>
                          </div>
                        )}
                        
                        {/* Cannot Train Warning - only show for zero balance, not for expired (already shown above) */}
                        {cannotTrain && !isExpired && (
                          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-destructive/15 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Cannot log training: No sessions remaining</span>
                          </div>
                        )}
                        
                        {/* Pill Badges Row - Show LIVE data from linked profile */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {/* Plan Type - Show current/linked plan only, skip "Pending Approval" */}
                          {displayPlanType && displayPlanType !== 'Pending Approval' && (
                            <span className="pill-teal">
                              {displayPlanType}
                            </span>
                          )}
                          {displayPlanType === 'Pending Approval' && (
                            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                              Pending Approval
                            </Badge>
                          )}
                          {/* Assigned Coach Badge (admin/IT only) */}
                          {(role === 'admin' || role === 'it_admin') && client.profiles && (
                            <span className="pill-purple">{client.profiles.name}</span>
                          )}
                          {/* Sync Status Badge */}
                          {client.member_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Link className="h-3 w-3" />
                              Synced
                            </span>
                          )}
                        </div>
                        
                        {/* Remaining Balance - Prominent Display */}
                        <div className={`flex items-center gap-2 mb-3 p-2.5 rounded-xl ${
                          isLowBalance || isZeroBalance ? 'bg-destructive/15' : 'bg-primary/10'
                        }`}>
                          <Zap className={`h-4 w-4 ${isLowBalance || isZeroBalance ? 'text-destructive' : 'text-primary'}`} />
                          <span className={`font-semibold ${isLowBalance || isZeroBalance ? 'text-destructive' : 'text-primary'}`}>
                            {remainingBalance} Sessions Left
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          {/* Phone - show linked member's phone if available */}
                          {(client.linked_member?.phone_number || client.phone) && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{client.linked_member?.phone_number || client.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5" />
                            <span>
                              {(() => {
                                // Use same logic as calculateRemainingBalance for consistency
                                const expiry = client.linked_member?.membership_expiry || client.expiry_date;
                                const isExp = expiry ? new Date(expiry) < new Date() : client.status === 'expired';
                                const carryOver = isExp ? 0 : client.carry_over_sessions;

                                if (client.linked_member?.plan_type) {
                                  const totalFromPlan = extractSessionsFromPlan(client.linked_member.plan_type, dbPlans || undefined);
                                  if (totalFromPlan != null) {
                                    const effectiveTotal = totalFromPlan + carryOver;
                                    const used = client.sessions_used_current_plan ?? client.sessions_used ?? 0;
                                    return <>{effectiveTotal} total ({used} used)</>;
                                  }
                                }
                                const manualTotal = client.total_sessions_purchased + carryOver;
                                return <>{manualTotal} total ({client.sessions_used || 0} used)</>;
                              })()}
                            </span>
                          </div>
                          {/* Expiry Date - PRIORITY: linked profile data */}
                          {displayExpiryDate && (
                            <div className={`flex items-center gap-2 ${
                              isExpired ? 'text-red-500 font-medium' : 
                              expiringWarning ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''
                            }`}>
                              <CalendarIcon className={`h-3.5 w-3.5 ${
                                isExpired ? 'text-red-500' : 
                                expiringWarning ? 'text-yellow-600 dark:text-yellow-400' : ''
                              }`} />
                              <span>
                                {isExpired ? 'Expired on ' : 'Expires '}
                                {format(new Date(displayExpiryDate), 'MMM d, yyyy')}
                                {expiryStatus.daysRemaining !== null && !isExpired && (
                                  <span className="ml-1">({expiryStatus.daysRemaining} days left)</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        {/* Sell Package Button - Always visible for coaches */}
                        <Button 
                          size="sm" 
                          onClick={() => openRenewalDialog(client)}
                          className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Sell Package
                        </Button>
                        {/* Log Session Button - Primary action for coaches */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openLogDialog(client)}
                          className="gap-1 rounded-xl"
                          disabled={cannotTrain}
                          title={cannotTrain ? (isExpired ? 'Package expired' : 'No sessions remaining') : 'Log session'}
                        >
                          <ClipboardPlus className="h-4 w-4" />
                          Log Session
                        </Button>
                        {/* More Options Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="gap-1 rounded-xl">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openHistoryDialog(client)}>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setLinkClient(client);
                              setLinkDialogOpen(true);
                            }}>
                              <Link className="h-4 w-4 mr-2" />
                              {client.member_id ? 'Manage Link' : 'Link to App Profile'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustmentDialog(client)}>
                              <Settings2 className="h-4 w-4 mr-2" />
                              Manual Adjustment
                            </DropdownMenuItem>
                            {isAdminOrIT && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Client
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(client.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Client
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Training Log Dialog */}
        <Dialog open={editLogDialogOpen} onOpenChange={setEditLogDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Edit Training Log
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editLogFormData.date}
                  onChange={(e) => setEditLogFormData({ ...editLogFormData, date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Training Types</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TRAINING_TYPES.map((type) => {
                    const isSelected = editLogFormData.training_types.includes(type.value);
                    return (
                      <Button
                        key={type.value}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (isSelected) {
                            setEditLogFormData({
                              ...editLogFormData,
                              training_types: editLogFormData.training_types.filter(t => t !== type.value)
                            });
                          } else {
                            setEditLogFormData({
                              ...editLogFormData,
                              training_types: [...editLogFormData.training_types, type.value]
                            });
                          }
                        }}
                        className="text-xs"
                      >
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sessions Used</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editLogFormData.sessions_used}
                    onChange={(e) => setEditLogFormData({ ...editLogFormData, sessions_used: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editLogFormData.weight_kg}
                    onChange={(e) => setEditLogFormData({ ...editLogFormData, weight_kg: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editLogFormData.notes}
                  onChange={(e) => setEditLogFormData({ ...editLogFormData, notes: e.target.value })}
                  placeholder="Session notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditLogDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLogEdit} disabled={savingLogEdit}>
                {savingLogEdit && <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Session Renewal Dialog (Package Sales) */}
        <SessionRenewalDialog
          open={renewalDialogOpen}
          onOpenChange={setRenewalDialogOpen}
          client={renewalClient}
          onSuccess={fetchClients}
        />

        {/* Manual Adjustment Dialog */}
        <ManualAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
          client={adjustmentClient}
          onSuccess={fetchClients}
        />

        {/* Client Link Dialog */}
        <ClientLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          client={linkClient}
          onSuccess={fetchClients}
        />
      </div>
    </AppLayout>
  );
}
