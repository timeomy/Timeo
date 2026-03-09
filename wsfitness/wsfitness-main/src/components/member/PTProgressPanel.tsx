import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dumbbell, Zap, Calendar, Clock, ChevronDown, ChevronUp, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useMembershipPlans, extractSessionsFromPlan } from '@/hooks/useMembershipPlans';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PTClientData {
  id: string;
  total_sessions_purchased: number;
  carry_over_sessions: number;
  status: 'active' | 'expired';
  expiry_date: string | null;
  package_type: string;
  sessions_used: number;
  membership_expiry?: string | null;
  membership_valid_from?: string | null;
  membership_plan_type?: string | null;
  sessions_used_current_plan?: number;
}

interface TrainingLog {
  id: string;
  date: string;
  training_types: string[] | null;
  training_type: string;
  sessions_used: number;
  notes: string | null;
  weight_kg: number | null;
  created_at: string;
  exercises: unknown;
}

interface PTProgressPanelProps {
  refreshKey?: number;
}

export function PTProgressPanel({ refreshKey = 0 }: PTProgressPanelProps) {
  const { user } = useAuth();
  const { data: membershipPlans } = useMembershipPlans();
  const [ptClient, setPtClient] = useState<PTClientData | null>(null);
  const [todayLogs, setTodayLogs] = useState<TrainingLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPTData();
    }
  }, [user, refreshKey]);

  const fetchPTData = async () => {
    if (!user) return;

    try {
      // Check if member is linked to a client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, total_sessions_purchased, carry_over_sessions, status, expiry_date, package_type, member_id')
        .eq('member_id', user.id)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client data:', clientError);
        setLoading(false);
        return;
      }

      if (!clientData) {
        setPtClient(null);
        setLoading(false);
        return;
      }

      // Fetch linked membership data for accurate plan info
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('expiry_date, valid_from, plan_type, status')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch all training logs for this client
      const { data: logsData, error: logsError } = await supabase
        .from('training_logs')
        .select('id, date, training_type, training_types, sessions_used, notes, weight_kg, created_at, exercises')
        .eq('client_id', clientData.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching training logs:', logsError);
      }

      const logs = logsData || [];
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Filter today's logs
      const todaysLogs = logs.filter(log => log.date === today);
      setTodayLogs(todaysLogs);

      // Get recent logs (last 5 excluding today)
      const recentLogsData = logs.filter(log => log.date !== today).slice(0, 5);
      setRecentLogs(recentLogsData);

      // Calculate sessions used
      const totalSessionsUsed = logs.reduce((sum, log) => sum + (log.sessions_used || 0), 0);

      // Calculate sessions used after current plan started (for linked members)
      let sessionsUsedCurrentPlan = totalSessionsUsed;
      if (membershipData?.valid_from) {
        sessionsUsedCurrentPlan = logs
          .filter(log => log.date >= membershipData.valid_from!)
          .reduce((sum, log) => sum + (log.sessions_used || 0), 0);
      }

      setPtClient({
        ...clientData,
        sessions_used: totalSessionsUsed,
        membership_expiry: membershipData?.expiry_date || null,
        membership_valid_from: membershipData?.valid_from || null,
        membership_plan_type: membershipData?.plan_type || null,
        sessions_used_current_plan: sessionsUsedCurrentPlan,
      });
    } catch (error) {
      console.error('Error fetching PT data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining sessions using linked membership data if available
  const calculateRemainingSessions = () => {
    if (!ptClient) return 0;

    // Don't count carry-over if plan is expired (unused sessions don't roll over)
    const expiry = ptClient.membership_expiry || ptClient.expiry_date;
    const expired = expiry ? new Date(expiry) < new Date() : ptClient.status === 'expired';
    const carryOver = expired ? 0 : ptClient.carry_over_sessions;

    const manualTotal = ptClient.total_sessions_purchased + carryOver;
    const planName = ptClient.membership_plan_type || ptClient.package_type;
    const totalFromPlan = extractSessionsFromPlan(planName, membershipPlans || undefined);

    if (totalFromPlan) {
      // Plan defines the base sessions; carry-over is additive only if not expired
      const effectiveTotal = totalFromPlan + carryOver;
      const used = ptClient.sessions_used_current_plan ?? ptClient.sessions_used ?? 0;
      return effectiveTotal - used;
    }

    // Fallback to manual data
    return manualTotal - ptClient.sessions_used;
  };

  // Get effective expiry date (prioritize membership data)
  const getEffectiveExpiry = () => {
    return ptClient?.membership_expiry || ptClient?.expiry_date;
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    const expiry = getEffectiveExpiry();
    if (!expiry) return null;
    return differenceInDays(new Date(expiry), new Date());
  };

  // Format training types for display
  const formatTrainingTypes = (log: TrainingLog) => {
    if (log.training_types && log.training_types.length > 0) {
      return log.training_types.join(' + ');
    }
    return log.training_type?.replace('_', ' ').toUpperCase() || 'Training';
  };

  if (loading) {
    return (
      <Card className="border border-primary/20 bg-card/50">
        <CardContent className="py-4 px-4 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show panel if user is not linked as a PT client
  if (!ptClient) {
    return null;
  }

  const remainingSessions = calculateRemainingSessions();
  const effectiveExpiry = getEffectiveExpiry();
  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isLowSessions = remainingSessions <= 3;
  const packageLabel = ptClient.membership_plan_type || ptClient.package_type;

  return (
    <Card className={cn(
      "border bg-card/50 overflow-hidden",
      isExpired ? "border-destructive/50 bg-destructive/5" : "border-primary/20"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Personal Training</CardTitle>
              <p className="text-xs text-muted-foreground">{packageLabel}</p>
            </div>
          </div>
          <Badge variant={isExpired ? 'destructive' : ptClient.status === 'active' ? 'default' : 'destructive'}>
            {isExpired ? 'Expired' : ptClient.status === 'active' ? 'Active' : 'Expired'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Session Balance */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl",
          isLowSessions ? "bg-amber-500/10" : "bg-primary/10"
        )}>
          <div className="flex items-center gap-3">
            <Zap className={cn("h-5 w-5", isLowSessions ? "text-amber-500" : "text-primary")} />
            <div>
              <p className={cn("text-2xl font-bold", isLowSessions ? "text-amber-500" : "text-primary")}>
                {remainingSessions}
              </p>
              <p className="text-xs text-muted-foreground">Sessions Remaining</p>
            </div>
          </div>
          {isLowSessions && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Low Balance</span>
            </div>
          )}
        </div>

        {/* Expiry Info */}
        {effectiveExpiry && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isExpired ? "bg-destructive/10 text-destructive" : 
            isExpiringSoon ? "bg-amber-500/10 text-amber-500" : 
            "bg-muted text-muted-foreground"
          )}>
            <Calendar className="h-4 w-4" />
            {isExpired ? (
              <span>Package expired on {format(new Date(effectiveExpiry), 'MMM d, yyyy')}</span>
            ) : isExpiringSoon ? (
              <span>Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} - Renew soon!</span>
            ) : (
              <span>Valid until {format(new Date(effectiveExpiry), 'MMM d, yyyy')}</span>
            )}
          </div>
        )}

        <Separator />

        {/* Today's Workouts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Today's Workouts
            </h4>
            {todayLogs.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {todayLogs.length} session{todayLogs.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {todayLogs.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">No workouts logged today</p>
              <p className="text-xs text-muted-foreground mt-1">Your coach will log your session after training</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-medium">
                      {formatTrainingTypes(log)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.notes?.split(' - ')[0] || 'Session'}
                    </span>
                  </div>
                  {log.weight_kg && (
                    <p className="text-xs text-muted-foreground">
                      Weight: <span className="font-medium text-foreground">{log.weight_kg} kg</span>
                    </p>
                  )}
                  {Array.isArray(log.exercises) && log.exercises.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Exercises:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {(log.exercises as any[]).slice(0, 3).map((ex: any, idx: number) => (
                          <li key={idx}>{ex.name}</li>
                        ))}
                        {log.exercises.length > 3 && (
                          <li className="text-muted-foreground">+{log.exercises.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent History (Collapsible) */}
        {recentLogs.length > 0 && (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">Recent History</span>
                {isHistoryOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-2 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.date), 'MMM d')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {formatTrainingTypes(log)}
                    </Badge>
                  </div>
                  {log.weight_kg && (
                    <span className="text-xs text-muted-foreground">{log.weight_kg} kg</span>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
