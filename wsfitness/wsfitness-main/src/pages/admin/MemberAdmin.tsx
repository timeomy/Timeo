import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Users, Download, Clock, UserPlus, Key, XCircle, Shield, AlertTriangle, CalendarClock } from 'lucide-react';
import { MemberApprovals } from '@/components/admin/MemberApprovals';
import { RejectedApplications } from '@/components/admin/RejectedApplications';
import { ExcelMemberImport } from '@/components/admin/ExcelMemberImport';
import { LegacyMemberImport } from '@/components/admin/LegacyMemberImport';
import { InviteCodeManager } from '@/components/admin/InviteCodeManager';
import { MemberListSkeleton } from '@/components/admin/MemberListSkeleton';
import { PaginatedMemberTable } from '@/components/admin/PaginatedMemberTable';
import { PurgeLegacyAccounts } from '@/components/admin/PurgeLegacyAccounts';
import { UserLookup } from '@/components/admin/UserLookup';
import { useMemberCounts } from '@/hooks/useMemberCounts';
import { useMembershipPlans, formatPlanDisplay } from '@/hooks/useMembershipPlans';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { z } from 'zod';

// Validation schemas
const memberSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(6, 'Min 6 characters').max(100),
  name: z.string().min(1, 'Required').max(100),
  phone_number: z.string().max(20).optional(),
  plan_type: z.string().min(1, 'Required'),
  expiry_date: z.string().optional(),
});

type MasterTab = 'register' | 'active' | 'expired' | 'staff' | 'approvals' | 'rejected' | 'invite-codes' | 'scheduled';

export default function MemberAdmin() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Fetch counts for badges
  const { data: counts, refetch: refetchCounts } = useMemberCounts();
  
  // Fetch dynamic plans from database
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  
  // Master tab state - default to 'approvals' tab (priority action)
  const [masterTab, setMasterTab] = useState<MasterTab>('approvals');
  
  // Track which tabs have been visited for lazy loading
  const [visitedTabs, setVisitedTabs] = useState<Set<MasterTab>>(new Set(['approvals']));

  // Real-time subscription for automatic data refresh
  useRealtimeSubscription({
    tables: ['profiles', 'memberships', 'payments', 'check_ins'],
    queryKeys: [['members'], ['member-counts']],
    onUpdate: () => {
      refetchCounts();
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  // Form states - default to first plan if available
  const [memberForm, setMemberForm] = useState({
    email: '', password: '', name: '', phone_number: '', plan_type: '', expiry_date: '',
  });

  // Auto-calculate expiry date when plan is selected
  const handlePlanChange = (planTitle: string) => {
    setMemberForm(prev => ({ ...prev, plan_type: planTitle }));
    
    // Skip expiry calculation for Staff
    if (planTitle === 'Staff') {
      setMemberForm(prev => ({ ...prev, expiry_date: '' }));
      return;
    }
    
    // Find the selected plan and calculate expiry
    const selectedPlan = plans?.find(p => p.title === planTitle);
    if (selectedPlan) {
      const today = new Date();
      // Calculate days from duration_months (approximate: 30 days per month)
      const durationDays = selectedPlan.duration_months * 30;
      const expiryDate = new Date(today.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const formattedDate = expiryDate.toISOString().split('T')[0];
      setMemberForm(prev => ({ ...prev, expiry_date: formattedDate }));
    }
  };

  // Mark tab as visited when selected
  const handleTabChange = (tab: MasterTab) => {
    setMasterTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  const handleAddMember = async () => {
    const result = memberSchema.safeParse(memberForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: memberForm.email,
          password: memberForm.password,
          name: memberForm.name,
          phone_number: memberForm.phone_number,
          role: 'member',
          plan_type: memberForm.plan_type,
          expiry_date: memberForm.expiry_date || null,
        },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message);
      }

      toast.success('Member created successfully');
      setMemberForm({ email: '', password: '', name: '', phone_number: '', plan_type: 'Membership 1M', expiry_date: '' });
      refetchCounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create member');
    } finally {
      setSaving(false);
    }
  };

  const handleDataChange = () => {
    refetchCounts();
    queryClient.invalidateQueries({ queryKey: ['paginated-members'] });
  };

  const CountBadge = ({ count, variant = 'default' }: { count: number; variant?: 'default' | 'warning' | 'danger' }) => {
    if (count === 0) return null;
    
    const variantClasses = {
      default: 'bg-white/20 text-white',
      warning: 'bg-amber-400 text-amber-900',
      danger: 'bg-red-400 text-red-900',
    };
    
    return (
      <Badge className={`ml-1.5 text-xs px-1.5 py-0 h-5 min-w-5 justify-center ${variantClasses[variant]}`}>
        {count}
      </Badge>
    );
  };

  return (
    <GymLayout title="Members" subtitle="Manage your gym members">
      <div className="space-y-4">
        {/* MASTER TAB BAR */}
        <Tabs 
          value={masterTab} 
          onValueChange={(val) => handleTabChange(val as MasterTab)}
          className="w-full"
        >
          <TabsList className="flex w-full overflow-x-auto bg-card border border-border/50 h-12 gap-1 p-1">
            {/* 1. Approvals - Priority action */}
            <TabsTrigger 
              value="approvals"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-1.5 flex-shrink-0"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Approvals</span>
              <span className="sm:hidden">New</span>
              <CountBadge count={counts?.pending || 0} variant="warning" />
            </TabsTrigger>

            {/* 2. Active Members */}
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1.5 flex-shrink-0"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Active</span>
              <CountBadge count={counts?.active || 0} />
            </TabsTrigger>

            {/* 3. Expired Members */}
            <TabsTrigger 
              value="expired" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1.5 flex-shrink-0"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Expired</span>
              <CountBadge count={counts?.expired || 0} variant="danger" />
            </TabsTrigger>

            {/* 4. Scheduled Day Passes */}
            <TabsTrigger 
              value="scheduled" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-1.5 flex-shrink-0"
            >
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">Scheduled</span>
              <CountBadge count={counts?.scheduled || 0} />
            </TabsTrigger>

            {/* 5. Staff Members */}
            <TabsTrigger 
              value="staff" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 flex-shrink-0"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Staff</span>
              <CountBadge count={counts?.staff || 0} />
            </TabsTrigger>

            {/* 6. Rejected Applications */}
            <TabsTrigger 
              value="rejected" 
              className="data-[state=active]:bg-foreground data-[state=active]:text-background gap-1.5 flex-shrink-0"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Rejected</span>
              <CountBadge count={counts?.rejected || 0} />
            </TabsTrigger>

            {/* 7. Invite Codes */}
            <TabsTrigger 
              value="invite-codes" 
              className="data-[state=active]:bg-foreground data-[state=active]:text-background gap-1.5 flex-shrink-0"
            >
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Invite Codes</span>
              <span className="sm:hidden">Invite</span>
              <CountBadge count={counts?.inviteCodes || 0} />
            </TabsTrigger>

            {/* 8. Register / Import - At the end */}
            <TabsTrigger 
              value="register" 
              className="data-[state=active]:bg-foreground data-[state=active]:text-background gap-1.5 flex-shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register / Import</span>
              <span className="sm:hidden">Register</span>
            </TabsTrigger>
          </TabsList>

          {/* APPROVALS TAB */}
          <TabsContent value="approvals" className="mt-4">
            <MemberApprovals />
          </TabsContent>

          {/* REJECTED TAB - Lazy loaded */}
          <TabsContent value="rejected" className="mt-4">
            {visitedTabs.has('rejected') ? (
              <RejectedApplications />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* ACTIVE MEMBERS TAB - Paginated & Lazy loaded */}
          <TabsContent value="active" className="mt-4">
            {visitedTabs.has('active') ? (
              <PaginatedMemberTable tabType="active" />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* STAFF TAB - Paginated & Lazy loaded */}
          <TabsContent value="staff" className="mt-4">
            {visitedTabs.has('staff') ? (
              <PaginatedMemberTable tabType="staff" />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* EXPIRED MEMBERS TAB - Paginated & Lazy loaded */}
          <TabsContent value="expired" className="mt-4">
            {visitedTabs.has('expired') ? (
              <PaginatedMemberTable tabType="expired" />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* SCHEDULED DAY PASSES TAB - Paginated & Lazy loaded */}
          <TabsContent value="scheduled" className="mt-4">
            {visitedTabs.has('scheduled') ? (
              <PaginatedMemberTable tabType="scheduled" />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* INVITE CODES TAB - Lazy loaded */}
          <TabsContent value="invite-codes" className="mt-4">
            {visitedTabs.has('invite-codes') ? (
              <InviteCodeManager />
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>

          {/* REGISTER / IMPORT TAB - Lazy loaded */}
          <TabsContent value="register" className="mt-4">
            {visitedTabs.has('register') ? (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Manual Registration Card */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      Manual Registration
                    </CardTitle>
                    <CardDescription>
                      Create a new member account with email and password
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="member@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input
                          type="password"
                          value={memberForm.password}
                          onChange={(e) => setMemberForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Min 6 characters"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={memberForm.name}
                          onChange={(e) => setMemberForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={memberForm.phone_number}
                          onChange={(e) => setMemberForm(p => ({ ...p, phone_number: e.target.value }))}
                          placeholder="+60 12-345 6789"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Type *</Label>
                        <Select
                          value={memberForm.plan_type}
                          onValueChange={handlePlanChange}
                          disabled={plansLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Staff">Staff (No Expiry)</SelectItem>
                            {plans?.map((plan) => (
                              <SelectItem key={plan.id} value={plan.title}>
                                {formatPlanDisplay(plan)} - {plan.duration_months}mo
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={memberForm.expiry_date}
                          onChange={(e) => setMemberForm(p => ({ ...p, expiry_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddMember} disabled={saving} className="w-full bg-primary">
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      <Plus className="h-4 w-4 mr-2" />
                      Create Member
                    </Button>
                  </CardContent>
                </Card>

                {/* User Lookup Card */}
                <UserLookup onUserUpdated={handleDataChange} />

                {/* Import Tools Card */}
                <Card className="border-border/50 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      Import Tools
                    </CardTitle>
                    <CardDescription>
                      Bulk import members from Excel or JSON backup files
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm">Excel Import</h4>
                        <p className="text-xs text-muted-foreground">Import members from an Excel spreadsheet (.xlsx)</p>
                        <ExcelMemberImport onImportComplete={handleDataChange} />
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm">Legacy JSON Import</h4>
                        <p className="text-xs text-muted-foreground">Import from a JSON backup file with smart merge (matches by name)</p>
                        <LegacyMemberImport onComplete={handleDataChange} />
                      </div>
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm text-red-500">Danger Zone</h4>
                        <p className="text-xs text-muted-foreground">
                          Remove all legacy imported accounts
                        </p>
                        <PurgeLegacyAccounts onComplete={handleDataChange} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <MemberListSkeleton />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </GymLayout>
  );
}
