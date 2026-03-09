import { useEffect, useState, useMemo } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Users, Phone, Package, Calendar, Dumbbell, History, Loader2, Mail, Pencil, UserPlus, UserMinus, Search, Eye, TrendingUp, Edit2, Trash2, Plus, Sparkles, Filter, Download } from 'lucide-react';
import { format, parse, differenceInDays } from 'date-fns';
import { CoachClientExport } from '@/components/admin/CoachClientExport';
import { Navigate } from 'react-router-dom';
import { useMembershipPlans, extractSessionsFromPlan } from '@/hooks/useMembershipPlans';
import { cn } from '@/lib/utils';

// Package type presets
const PACKAGE_PRESETS = [
  { value: 'CT-1', label: 'CT-1 - 1 Session (Trial)', sessions: 1 },
  { value: 'PT-1', label: 'PT-1 - 1 Session (Trial)', sessions: 1 },
  { value: 'CT-16', label: 'CT-16 - 16 Sessions', sessions: 16 },
  { value: 'PT-16', label: 'PT-16 - 16 Sessions', sessions: 16 },
  { value: 'CT-48', label: 'CT-48 - 48 Sessions', sessions: 48 },
  { value: 'CT-99', label: 'CT-99 - 99 Sessions', sessions: 99 },
  { value: 'CUSTOM', label: 'Custom Package', sessions: 0 },
];

interface TrainingLog {
  id: string;
  date: string;
  training_type: string;
  sessions_used: number;
  notes: string | null;
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  package_type: string;
  total_sessions_purchased: number;
  carry_over_sessions: number;
  expiry_date: string | null;
  status: 'active' | 'expired';
  sessions_used?: number;
  assigned_coach_id?: string | null;
  member_id?: string | null;
  linked_member?: {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    avatar_url: string | null;
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
  email: string | null;
  clients: Client[];
}

interface UnassignedClient {
  id: string;
  name: string;
  package_type: string;
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full Body',
  stretching: 'Stretching',
};

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, iconColor }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconColor?: 'primary' | 'green' | 'amber';
}) {
  const bgColor = iconColor === 'green' ? 'bg-emerald-500/10' : iconColor === 'amber' ? 'bg-amber-500/10' : 'bg-primary/10';
  const textColor = iconColor === 'green' ? 'text-emerald-500' : iconColor === 'amber' ? 'text-amber-500' : 'text-primary';

  return (
    <Card className="bg-card border-border/30 h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Coaches() {
  const { role, loading: authLoading } = useAuth();
  const { data: dbPlans } = useMembershipPlans();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<TrainingLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Pagination state for training history
  const HISTORY_PAGE_SIZE = 10;
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  
  // Training history filter: 'current' (default) or 'all'
  const [historyFilter, setHistoryFilter] = useState<'current' | 'all'>('current');
  const [currentPlanHistoryCount, setCurrentPlanHistoryCount] = useState(0);
  
  // View clients dialog
  const [viewClientsDialogOpen, setViewClientsDialogOpen] = useState(false);
  const [viewingCoach, setViewingCoach] = useState<Coach | null>(null);
  
  // Edit coach state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Client management state
  const [manageClientsDialogOpen, setManageClientsDialogOpen] = useState(false);
  const [managingCoach, setManagingCoach] = useState<Coach | null>(null);
  const [unassignedClients, setUnassignedClients] = useState<UnassignedClient[]>([]);
  const [allClients, setAllClients] = useState<UnassignedClient[]>([]);
  const [selectedClientToAdd, setSelectedClientToAdd] = useState<string>('');
  const [savingClient, setSavingClient] = useState(false);

  // Edit client state
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [editingClientData, setEditingClientData] = useState<Client | null>(null);
  const [clientFormData, setClientFormData] = useState({
    name: '',
    phone: '',
    package_type: 'CT-48',
    total_sessions_purchased: 48,
    carry_over_sessions: 0,
    expiry_date: '',
    status: 'active' as 'active' | 'expired',
  });
  const [savingClientEdit, setSavingClientEdit] = useState(false);

  // Edit training log state
  const [editLogDialogOpen, setEditLogDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
  const [editLogFormData, setEditLogFormData] = useState({
    date: '',
    sessions_used: 1,
    notes: '',
  });
  const [savingLogEdit, setSavingLogEdit] = useState(false);

  // Add session back state
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [sessionsToAdd, setSessionsToAdd] = useState(1);
  const [addSessionReason, setAddSessionReason] = useState('');
  const [savingAddSession, setSavingAddSession] = useState(false);

  // Training types for edit dialog
  const TRAINING_TYPES = [
    { value: 'PULL', label: 'PULL' },
    { value: 'PUSH', label: 'PUSH' },
    { value: 'LEGS', label: 'LEGS' },
  ];

  const isAdminOrIT = role === 'admin' || role === 'it_admin';

  // Calculate stats
  const stats = useMemo(() => {
    const totalCoaches = coaches.length;
    const totalClients = coaches.reduce((sum, c) => sum + c.clients.length, 0);
    const avgClients = totalCoaches > 0 ? (totalClients / totalCoaches).toFixed(1) : '0';
    return { totalCoaches, totalClients, avgClients };
  }, [coaches]);

  // Filtered coaches based on search
  const filteredCoaches = useMemo(() => {
    if (!searchQuery.trim()) return coaches;
    const query = searchQuery.toLowerCase();
    return coaches.filter(
      c => c.name.toLowerCase().includes(query) || 
           (c.email && c.email.toLowerCase().includes(query))
    );
  }, [coaches, searchQuery]);

  useEffect(() => {
    if (isAdminOrIT) {
      fetchCoachesWithClients();
    }
  }, [role]);

  // Realtime subscription - refresh when memberships are updated (e.g., after renewal)
  useEffect(() => {
    if (!isAdminOrIT) return;

    const channel = supabase
      .channel('coach-membership-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships'
        },
        () => {
          // Refetch coach data when any membership changes
          fetchCoachesWithClients();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          // Refetch when client data changes
          fetchCoachesWithClients();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_logs'
        },
        () => {
          // Refetch when training logs change (session usage)
          fetchCoachesWithClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminOrIT]);

  const fetchCoachesWithClients = async () => {
    try {
      // Fetch all coaches
      const { data: coachRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach');

      if (rolesError) throw rolesError;

      const coachIds = coachRoles?.map(r => r.user_id) || [];
      
      if (coachIds.length === 0) {
        setCoaches([]);
        setLoading(false);
        return;
      }

      // Fetch coach profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', coachIds);

      if (profilesError) throw profilesError;

      // Fetch all clients with their assigned coaches
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('assigned_coach_id', coachIds)
        .order('name');

      if (clientsError) throw clientsError;

      // Fetch sessions used for each client
      const clientIds = clients?.map(c => c.id) || [];
      let sessionsMap: Record<string, number> = {};

      if (clientIds.length > 0) {
        const { data: logsData } = await supabase
          .from('training_logs')
          .select('client_id, sessions_used')
          .in('client_id', clientIds);

        logsData?.forEach(log => {
          sessionsMap[log.client_id] = (sessionsMap[log.client_id] || 0) + log.sessions_used;
        });
      }

      // Fetch linked member profiles for clients that have member_id
      const linkedMemberIds = Array.from(
        new Set((clients || []).map((c: any) => c.member_id).filter(Boolean))
      ) as string[];

      let linkedMemberMap: Record<string, any> = {};
      if (linkedMemberIds.length > 0) {
        // Fetch profiles
        const { data: linkedProfiles, error: linkedError } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, avatar_url')
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

      // For clients with linked members, calculate sessions used AFTER valid_from
      const clientsWithLinkedMembers = (clients || []).filter((c: any) => c.member_id && linkedMemberMap[c.member_id]?.membership_valid_from);
      
      let sessionsAfterPlanStart: Record<string, number> = {};
      if (clientsWithLinkedMembers.length > 0) {
        // Fetch training logs and filter by valid_from date
        for (const client of clientsWithLinkedMembers) {
          const validFrom = linkedMemberMap[client.member_id]?.membership_valid_from;
          if (validFrom) {
            const { data: logsAfterStart } = await supabase
              .from('training_logs')
              .select('sessions_used')
              .eq('client_id', client.id)
              .gte('date', validFrom);
            
            sessionsAfterPlanStart[client.id] = logsAfterStart?.reduce((sum, log) => sum + log.sessions_used, 0) || 0;
          }
        }
      }

      // Build coach-client hierarchy
      const coachData: Coach[] = (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        clients: (clients || [])
          .filter(c => c.assigned_coach_id === profile.id)
          .map(c => ({
            ...c,
            sessions_used: sessionsMap[c.id] || 0,
            sessions_used_current_plan: sessionsAfterPlanStart[c.id] ?? sessionsMap[c.id] ?? 0,
            linked_member: c.member_id ? linkedMemberMap[c.member_id] || null : null,
          })),
      }));

      // Sort by client count (most clients first)
      coachData.sort((a, b) => b.clients.length - a.clients.length);

      setCoaches(coachData);
    } catch (error) {
      console.error('Error fetching coaches:', error);
      toast.error('Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  const openViewClientsDialog = (coach: Coach) => {
    setViewingCoach(coach);
    setViewClientsDialogOpen(true);
  };

  const openClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
    setLoadingHistory(true);
    setClientHistory([]);
    setHistoryPage(0);
    setHasMoreHistory(true);
    setHistoryFilter('current'); // Default to current plan

    const validFrom = client.linked_member?.membership_valid_from;

    try {
      // Get total count (all-time)
      const { count: totalCount } = await supabase
        .from('training_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id);
      
      setTotalHistoryCount(totalCount || 0);

      // Get current plan count if valid_from exists
      if (validFrom) {
        const { count: currentCount } = await supabase
          .from('training_logs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('date', validFrom);
        
        setCurrentPlanHistoryCount(currentCount || 0);

        // Fetch first page - current plan only (default)
        const { data, error } = await supabase
          .from('training_logs')
          .select('id, date, training_type, sessions_used, notes')
          .eq('client_id', client.id)
          .gte('date', validFrom)
          .order('date', { ascending: false })
          .range(0, HISTORY_PAGE_SIZE - 1);

        if (error) throw error;
        setClientHistory(data || []);
        setHasMoreHistory((data?.length || 0) >= HISTORY_PAGE_SIZE);
      } else {
        setCurrentPlanHistoryCount(totalCount || 0);
        
        // No valid_from, fetch all history
        const { data, error } = await supabase
          .from('training_logs')
          .select('id, date, training_type, sessions_used, notes')
          .eq('client_id', client.id)
          .order('date', { ascending: false })
          .range(0, HISTORY_PAGE_SIZE - 1);

        if (error) throw error;
        setClientHistory(data || []);
        setHasMoreHistory((data?.length || 0) >= HISTORY_PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load training history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Switch history filter and refetch
  const switchHistoryFilter = async (filter: 'current' | 'all') => {
    if (!selectedClient || filter === historyFilter) return;
    
    setHistoryFilter(filter);
    setLoadingHistory(true);
    setClientHistory([]);
    setHistoryPage(0);
    setHasMoreHistory(true);

    const validFrom = selectedClient.linked_member?.membership_valid_from;

    try {
      let query = supabase
        .from('training_logs')
        .select('id, date, training_type, sessions_used, notes')
        .eq('client_id', selectedClient.id)
        .order('date', { ascending: false })
        .range(0, HISTORY_PAGE_SIZE - 1);

      // Apply filter if current plan and valid_from exists
      if (filter === 'current' && validFrom) {
        query = query.gte('date', validFrom);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientHistory(data || []);
      setHasMoreHistory((data?.length || 0) >= HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load training history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMoreHistory = async () => {
    if (!selectedClient || loadingMoreHistory || !hasMoreHistory) return;
    
    setLoadingMoreHistory(true);
    const nextPage = historyPage + 1;
    const from = nextPage * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE - 1;

    const validFrom = selectedClient.linked_member?.membership_valid_from;

    try {
      let query = supabase
        .from('training_logs')
        .select('id, date, training_type, sessions_used, notes')
        .eq('client_id', selectedClient.id)
        .order('date', { ascending: false })
        .range(from, to);

      // Apply filter if current plan and valid_from exists
      if (historyFilter === 'current' && validFrom) {
        query = query.gte('date', validFrom);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setClientHistory(prev => [...prev, ...(data || [])]);
      setHistoryPage(nextPage);
      setHasMoreHistory((data?.length || 0) >= HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more history:', error);
      toast.error('Failed to load more history');
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const isClientExpired = (client: Client) => {
    const expiry = client.linked_member?.membership_expiry || client.expiry_date;
    if (!expiry) return client.status === 'expired';
    return new Date(expiry) < new Date();
  };

  const calculateRemainingBalance = (client: Client) => {
    // Don't count carry-over if plan is expired (unused sessions don't roll over)
    const expired = isClientExpired(client);
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

  // Helper to get total sessions from linked plan or manual data
  const getTotalSessions = (client: Client) => {
    const expired = isClientExpired(client);
    const carryOver = expired ? 0 : client.carry_over_sessions;
    const manualTotal = client.total_sessions_purchased + carryOver;
    if (client.linked_member?.plan_type) {
      const sessions = extractSessionsFromPlan(client.linked_member.plan_type, dbPlans || undefined);
      if (sessions != null) return sessions + carryOver;
    }
    return manualTotal;
  };

  // Helper to get display plan type (linked or manual)
  const getDisplayPlanType = (client: Client) => {
    return client.linked_member?.plan_type || client.package_type;
  };

  // Helper to get display status (linked or manual)
  const getDisplayStatus = (client: Client): 'active' | 'expired' => {
    if (client.linked_member?.membership_status) {
      return client.linked_member.membership_status === 'active' ? 'active' : 'expired';
    }
    return client.status;
  };

  // Helper to get display expiry date (linked or manual)
  const getDisplayExpiryDate = (client: Client) => {
    return client.linked_member?.membership_expiry || client.expiry_date;
  };

  const handleExportCoachesJSON = async () => {
    try {
      const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'coach');
      const coachIds = coachRoles?.map(r => r.user_id) || [];
      if (!coachIds.length) { toast.error('No coaches found'); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, name, email, phone_number, member_id, avatar_url, created_at').in('id', coachIds);
      const { data: allClients } = await supabase.from('clients').select('id, name, phone, package_type, total_sessions_purchased, carry_over_sessions, expiry_date, status, assigned_coach_id').in('assigned_coach_id', coachIds);

      const coachClientMap = new Map<string, typeof allClients>(); 
      for (const c of allClients || []) {
        if (!coachClientMap.has(c.assigned_coach_id!)) coachClientMap.set(c.assigned_coach_id!, []);
        coachClientMap.get(c.assigned_coach_id!)!.push(c);
      }

      const exportData = (profiles || []).map(p => ({
        coach_id: p.id,
        member_id: p.member_id || '',
        name: p.name,
        email: p.email || '',
        phone: p.phone_number || '',
        avatar_url: p.avatar_url || '',
        joined_at: p.created_at || '',
        total_clients: coachClientMap.get(p.id)?.length || 0,
        active_clients: coachClientMap.get(p.id)?.filter(c => c.status === 'active').length || 0,
        clients: (coachClientMap.get(p.id) || []).map(c => ({
          name: c.name, phone: c.phone, package_type: c.package_type,
          total_sessions: c.total_sessions_purchased + c.carry_over_sessions,
          expiry_date: c.expiry_date, status: c.status,
        })),
      }));

      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), total_coaches: exportData.length, coaches: exportData }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coaches_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportData.length} coaches`);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const openEditDialog = (coach: Coach, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCoach(coach);
    setEditName(coach.name);
    setEditEmail(coach.email || '');
    setEditDialogOpen(true);
  };

  const handleSaveCoach = async () => {
    if (!editingCoach) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName, email: editEmail || null })
        .eq('id', editingCoach.id);

      if (error) throw error;

      toast.success('Coach details updated');
      setEditDialogOpen(false);
      fetchCoachesWithClients();
    } catch (error) {
      console.error('Error updating coach:', error);
      toast.error('Failed to update coach');
    } finally {
      setSaving(false);
    }
  };

  const openManageClientsDialog = async (coach: Coach, e: React.MouseEvent) => {
    e.stopPropagation();
    setManagingCoach(coach);
    setManageClientsDialogOpen(true);
    setSelectedClientToAdd('');

    // Fetch all clients and filter unassigned ones
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, package_type, assigned_coach_id')
        .order('name');

      if (error) throw error;

      const all = data || [];
      setAllClients(all.map(c => ({ id: c.id, name: c.name, package_type: c.package_type })));
      
      // Get unassigned clients (no coach assigned, or assigned to other coach)
      const unassigned = all.filter(c => !c.assigned_coach_id || c.assigned_coach_id !== coach.id);
      setUnassignedClients(unassigned.map(c => ({ id: c.id, name: c.name, package_type: c.package_type })));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleAddClientToCoach = async () => {
    if (!managingCoach || !selectedClientToAdd) return;

    setSavingClient(true);
    try {
      // Get previous coach info
      const clientData = allClients.find(c => c.id === selectedClientToAdd);
      const { data: clientInfo } = await supabase
        .from('clients')
        .select('assigned_coach_id')
        .eq('id', selectedClientToAdd)
        .single();
      
      const previousCoachId = clientInfo?.assigned_coach_id;

      const { error } = await supabase
        .from('clients')
        .update({ assigned_coach_id: managingCoach.id })
        .eq('id', selectedClientToAdd);

      if (error) throw error;

      // Log the coach change
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('client_coach_history').insert({
          client_id: selectedClientToAdd,
          previous_coach_id: previousCoachId || null,
          new_coach_id: managingCoach.id,
          changed_by: userData.user.id,
          notes: `Assigned to ${managingCoach.name}`
        });
      }

      toast.success('Client assigned to coach');
      setSelectedClientToAdd('');
      setManageClientsDialogOpen(false);
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast.error(error.message || 'Failed to assign client');
    } finally {
      setSavingClient(false);
    }
  };

  const handleRemoveClientFromCoach = async (clientId: string, clientName: string) => {
    if (!confirm(`Remove ${clientName} from this coach?`)) return;

    // Find the current coach for this client
    const currentCoach = coaches.find(c => c.clients.some(cl => cl.id === clientId));

    try {
      const { error } = await supabase
        .from('clients')
        .update({ assigned_coach_id: null })
        .eq('id', clientId);

      if (error) throw error;

      // Log the coach change
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && currentCoach) {
        await supabase.from('client_coach_history').insert({
          client_id: clientId,
          previous_coach_id: currentCoach.id,
          new_coach_id: null,
          changed_by: userData.user.id,
          notes: `Removed from ${currentCoach.name}`
        });
      }

      toast.success('Client removed from coach');
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error removing client:', error);
      toast.error(error.message || 'Failed to remove client');
    }
  };

  const openEditClientDialog = (client: Client) => {
    setEditingClientData(client);
    setClientFormData({
      name: client.name,
      phone: client.phone || '',
      package_type: client.package_type,
      total_sessions_purchased: client.total_sessions_purchased,
      carry_over_sessions: client.carry_over_sessions,
      expiry_date: client.expiry_date || '',
      status: client.status,
    });
    setDialogOpen(false);
    setEditClientDialogOpen(true);
  };

  const handleSaveClientEdit = async () => {
    if (!editingClientData) return;

    setSavingClientEdit(true);
    try {
      const updatePayload = {
        name: clientFormData.name,
        phone: clientFormData.phone || null,
        package_type: clientFormData.package_type,
        total_sessions_purchased: clientFormData.total_sessions_purchased,
        carry_over_sessions: clientFormData.carry_over_sessions,
        expiry_date: clientFormData.expiry_date || null,
        status: clientFormData.status,
      };

      const { data, error } = await supabase
        .from('clients')
        .update(updatePayload)
        .eq('id', editingClientData.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Update failed — you may not have permission to edit this client');
      }

      toast.success('Client updated successfully');
      setEditClientDialogOpen(false);
      setEditingClientData(null);
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error(error.message || 'Failed to update client');
    } finally {
      setSavingClientEdit(false);
    }
  };

  // Open edit log dialog
  const openEditLogDialog = (log: TrainingLog) => {
    setEditingLog(log);
    setEditLogFormData({
      date: log.date,
      sessions_used: log.sessions_used,
      notes: log.notes || '',
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
          sessions_used: editLogFormData.sessions_used,
          notes: editLogFormData.notes || null,
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
          .select('id, date, training_type, sessions_used, notes')
          .eq('client_id', selectedClient.id)
          .order('date', { ascending: false });
        setClientHistory(data || []);
      }
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error updating training log:', error);
      toast.error(error.message || 'Failed to update training log');
    } finally {
      setSavingLogEdit(false);
    }
  };

  // Delete training log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this training log? This will restore the session to the client.')) return;

    try {
      const { error } = await supabase
        .from('training_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      toast.success('Training log deleted - session restored');
      setClientHistory(prev => prev.filter(log => log.id !== logId));
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error deleting training log:', error);
      toast.error(error.message || 'Failed to delete training log');
    }
  };

  const openAddSessionDialog = () => {
    setSessionsToAdd(1);
    setAddSessionReason('');
    setAddSessionDialogOpen(true);
  };

  const handleAddSession = async () => {
    if (!selectedClient || sessionsToAdd < 1) return;
    
    setSavingAddSession(true);
    try {
      // Add to carry_over_sessions
      const newCarryOver = selectedClient.carry_over_sessions + sessionsToAdd;
      
      const { error } = await supabase
        .from('clients')
        .update({ carry_over_sessions: newCarryOver })
        .eq('id', selectedClient.id);

      if (error) throw error;

      toast.success(`Added ${sessionsToAdd} session${sessionsToAdd > 1 ? 's' : ''} to ${selectedClient.name}`);
      setAddSessionDialogOpen(false);
      
      // Update local state
      setSelectedClient(prev => prev ? { ...prev, carry_over_sessions: newCarryOver } : null);
      fetchCoachesWithClients();
    } catch (error: any) {
      console.error('Error adding session:', error);
      toast.error(error.message || 'Failed to add session');
    } finally {
      setSavingAddSession(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrIT) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <GymLayout title="COACHES" subtitle="Manage trainers and client assignments">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Coaches"
            value={stats.totalCoaches}
            subtitle="Registered trainers"
            icon={User}
            iconColor="primary"
          />
          <StatCard
            title="Total Clients Assigned"
            value={stats.totalClients}
            subtitle="Under active coaches"
            icon={Users}
            iconColor="green"
          />
          <StatCard
            title="Avg. Clients/Coach"
            value={stats.avgClients}
            subtitle="Average workload"
            icon={TrendingUp}
            iconColor="amber"
          />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coaches by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>

        {/* Header with Export */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? 'es' : ''} found
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCoachesJSON}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <CoachClientExport />
          </div>
        </div>

        {/* Coaches Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCoaches.length === 0 ? (
          <Card className="bg-card border-border/30">
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery ? 'No coaches match your search.' : 'No coaches found. Seed demo data from IT Admin page.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoaches.map((coach, index) => (
              <Card 
                key={coach.id}
                className="bg-card border-border/30 hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  {/* Avatar */}
                  <Avatar className="w-20 h-20 mb-4 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">
                      {coach.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Coach Badge */}
                  <Badge variant="secondary" className="mb-2 text-xs">
                    Coach
                  </Badge>
                  
                  {/* Name & Email */}
                  <h3 className="text-lg font-semibold text-foreground mb-1">{coach.name}</h3>
                  {coach.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <Mail className="h-3 w-3" />
                      {coach.email}
                    </p>
                  )}
                  
                  {/* Active Clients Stat */}
                  <div className="w-full py-3 px-4 rounded-lg bg-muted/50 mb-4">
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                    <p className="text-2xl font-bold text-primary">{coach.clients.length}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="w-full flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => openViewClientsDialog(coach)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Clients
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => openEditDialog(coach, e)}
                      title="Edit Profile"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Clients Dialog */}
        <Dialog open={viewClientsDialogOpen} onOpenChange={setViewClientsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {viewingCoach?.name}'s Clients
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">{viewingCoach?.clients.length || 0} clients</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  if (viewingCoach) {
                    setViewClientsDialogOpen(false);
                    openManageClientsDialog(viewingCoach, e as any);
                  }
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
            <ScrollArea className="h-[400px] max-h-[60vh] -mx-1 px-1">
              {viewingCoach?.clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No clients assigned to this coach
                </p>
              ) : (
                <div className="space-y-2 pr-4">
                  {viewingCoach?.clients.map((client) => {
                    const remaining = calculateRemainingBalance(client);
                    const isLowBalance = remaining < 5;
                    
                    return (
                      <div 
                        key={client.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start h-auto p-0 hover:bg-transparent"
                          onClick={() => {
                            setViewClientsDialogOpen(false);
                            openClientDetails(client);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${client.status === 'active' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                              <User className={`h-4 w-4 ${client.status === 'active' ? 'text-primary' : 'text-destructive'}`} />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-foreground">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.package_type} • {remaining} sessions left
                              </p>
                            </div>
                          </div>
                        </Button>
                        <div className="flex items-center gap-2">
                          {isLowBalance && (
                            <Badge variant="destructive" className="text-xs">Low</Badge>
                          )}
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveClientFromCoach(client.id, client.name);
                            }}
                            title="Remove from coach"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Client Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {selectedClient?.name}
                </div>
                {selectedClient && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditClientDialog(selectedClient)}
                    className="gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedClient && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                {/* Client Info */}
                <Card className="flex-shrink-0">
                  <CardContent className="p-4 space-y-3">
                    {/* Phone - prefer linked member's phone */}
                    {(selectedClient.linked_member?.phone_number || selectedClient.phone) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.linked_member?.phone_number || selectedClient.phone}</span>
                      </div>
                    )}
                    {/* Plan Type - from linked profile if available */}
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{getDisplayPlanType(selectedClient)}</span>
                      <Badge variant={getDisplayStatus(selectedClient) === 'active' ? 'default' : 'secondary'}>
                        {getDisplayStatus(selectedClient)}
                      </Badge>
                    </div>
                    
                    {/* Renewal Indicator - Show plan start date */}
                    {selectedClient.linked_member?.membership_valid_from && (
                      (() => {
                        const validFrom = new Date(selectedClient.linked_member.membership_valid_from);
                        const daysSinceStart = differenceInDays(new Date(), validFrom);
                        const isNewPlan = daysSinceStart <= 7 && daysSinceStart >= 0;
                        
                        return (
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Current Plan Started: {format(validFrom, 'MMM d, yyyy')}</span>
                            {isNewPlan && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                                <Sparkles className="h-3 w-3" />
                                {daysSinceStart === 0 ? 'New Today!' : daysSinceStart === 1 ? 'Renewed Yesterday' : `Renewed ${daysSinceStart} days ago`}
                              </Badge>
                            )}
                          </div>
                        );
                      })()
                    )}
                    
                    {/* Sessions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {calculateRemainingBalance(selectedClient)} / {getTotalSessions(selectedClient)} sessions remaining
                        </span>
                      </div>
                      {isAdminOrIT && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openAddSessionDialog}
                          className="gap-1 h-7 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          Add Session
                        </Button>
                      )}
                    </div>
                    {/* Expiry Date */}
                    {getDisplayExpiryDate(selectedClient) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Expires: {format(new Date(getDisplayExpiryDate(selectedClient)!), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Training History */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Training History</h3>
                      <Badge variant="outline">
                        {historyFilter === 'current' ? currentPlanHistoryCount : totalHistoryCount} sessions
                      </Badge>
                    </div>
                    
                    {/* History Filter Toggle */}
                    {selectedClient.linked_member?.membership_valid_from && (
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => switchHistoryFilter('current')}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                            historyFilter === 'current'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Current Plan
                        </button>
                        <button
                          onClick={() => switchHistoryFilter('all')}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                            historyFilter === 'all'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          All-Time
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : clientHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No training history yet
                    </p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {clientHistory.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg bg-muted/50 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">
                                {TRAINING_TYPE_LABELS[log.training_type] || log.training_type}
                              </Badge>
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
                            <p className="text-sm text-muted-foreground">
                              {log.sessions_used} session{log.sessions_used > 1 ? 's' : ''}
                            </p>
                            {log.notes && (
                              <p className="text-sm text-foreground/80 italic">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                        
                        {/* Load More Button */}
                        {hasMoreHistory && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={loadMoreHistory}
                            disabled={loadingMoreHistory}
                          >
                            {loadingMoreHistory ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </>
                            ) : (
                              `Load More (${totalHistoryCount - clientHistory.length} remaining)`
                            )}
                          </Button>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Coach Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Edit Coach
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="coach-name">Name</Label>
                <Input
                  id="coach-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Coach name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-email">Email</Label>
                <Input
                  id="coach-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="coach@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCoach} disabled={saving || !editName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Clients Dialog */}
        <Dialog open={manageClientsDialogOpen} onOpenChange={setManageClientsDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Assign Client to {managingCoach?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select
                  value={selectedClientToAdd}
                  onValueChange={setSelectedClientToAdd}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedClients.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No available clients
                      </div>
                    ) : (
                      unassignedClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.package_type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This will assign the selected client to {managingCoach?.name}. If the client is currently assigned to another coach, they will be reassigned.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageClientsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddClientToCoach} 
                disabled={savingClient || !selectedClientToAdd}
              >
                {savingClient ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Assign Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Edit Client
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={clientFormData.phone}
                  onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Package Type</Label>
                <Select
                  value={clientFormData.package_type}
                  onValueChange={(v) => {
                    const preset = PACKAGE_PRESETS.find(p => p.value === v);
                    if (preset) {
                      setClientFormData({ 
                        ...clientFormData, 
                        package_type: v,
                        total_sessions_purchased: preset.sessions || clientFormData.total_sessions_purchased
                      });
                    } else {
                      setClientFormData({ ...clientFormData, package_type: v });
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
                    value={clientFormData.total_sessions_purchased}
                    onChange={(e) => setClientFormData({ ...clientFormData, total_sessions_purchased: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carry Over</Label>
                  <Input
                    type="number"
                    min="0"
                    value={clientFormData.carry_over_sessions}
                    onChange={(e) => setClientFormData({ ...clientFormData, carry_over_sessions: parseInt(e.target.value) || 0 })}
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
                        !clientFormData.expiry_date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {clientFormData.expiry_date 
                        ? format(parse(clientFormData.expiry_date, 'yyyy-MM-dd', new Date()), 'PPP') 
                        : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={clientFormData.expiry_date ? parse(clientFormData.expiry_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => setClientFormData({ ...clientFormData, expiry_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={clientFormData.status}
                  onValueChange={(v: 'active' | 'expired') => setClientFormData({ ...clientFormData, status: v })}
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditClientDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveClientEdit} 
                disabled={savingClientEdit || !clientFormData.name.trim()}
              >
                {savingClientEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label>Sessions Used</Label>
                <Input
                  type="number"
                  min="0"
                  value={editLogFormData.sessions_used}
                  onChange={(e) => setEditLogFormData({ ...editLogFormData, sessions_used: parseInt(e.target.value) || 0 })}
                />
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLogDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLogEdit} disabled={savingLogEdit}>
                {savingLogEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Session Dialog */}
        <Dialog open={addSessionDialogOpen} onOpenChange={setAddSessionDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Session to {selectedClient?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Number of Sessions to Add</Label>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={sessionsToAdd}
                  onChange={(e) => setSessionsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Sessions will be added to carry-over balance
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={addSessionReason}
                  onChange={(e) => setAddSessionReason(e.target.value)}
                  placeholder="e.g., Coach logged wrong session, system error..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSessionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSession} disabled={savingAddSession || sessionsToAdd < 1}>
                {savingAddSession ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add {sessionsToAdd} Session{sessionsToAdd > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </GymLayout>
  );
}