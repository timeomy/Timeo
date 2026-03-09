import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ShoppingCart, TrendingUp } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useMembershipPlans, type DatabasePlan } from '@/hooks/useMembershipPlans';

interface Client {
  id: string;
  name: string;
  total_sessions_purchased: number;
  carry_over_sessions: number;
  sessions_used?: number;
  expiry_date: string | null;
  status: 'active' | 'expired';
  package_type: string;
  member_id?: string | null;
}

interface SessionRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function SessionRenewalDialog({ open, onOpenChange, client, onSuccess }: SessionRenewalDialogProps) {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [renewing, setRenewing] = useState(false);
  
  // Fetch plans dynamically from DB - filter to training/coaching plans
  const { data: allPlans, isLoading: plansLoading } = useMembershipPlans();
  
  // Filter to only training/coaching plans that have sessions
  const ptPlans = (allPlans || []).filter(p => p.sessions != null && p.sessions > 0);
  
  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlanId('');
    }
  }, [open]);
  
  if (!client) return null;
  
  const currentSessions = (client.total_sessions_purchased + client.carry_over_sessions) - (client.sessions_used || 0);
  const isExpired = client.status === 'expired' || (client.expiry_date && new Date(client.expiry_date) < new Date());
  
  const calculateNewExpiry = (plan: DatabasePlan): Date => {
    const durationDays = (plan.duration_months * 30) + (plan.duration_days || 0);
    
    // Stacking logic: if active, extend from current expiry; if expired, start from today
    let baseDate: Date;
    if (!isExpired && client.expiry_date) {
      baseDate = new Date(client.expiry_date);
    } else {
      baseDate = new Date();
    }
    
    return addDays(baseDate, durationDays);
  };
  
  const calculateNewSessions = (plan: DatabasePlan): number => {
    // Stacking: add new sessions to remaining balance
    return Math.max(0, currentSessions) + (plan.sessions || 0);
  };
  
  const handleSellPackage = async () => {
    if (!selectedPlanId || !user || !client) return;
    
    const selectedPlan = ptPlans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) return;
    
    setRenewing(true);
    try {
      const previousExpiry = client.expiry_date;
      const previousSessions = client.total_sessions_purchased;
      const newExpiry = calculateNewExpiry(selectedPlan);
      const newTotalSessions = client.total_sessions_purchased + (selectedPlan.sessions || 0);
      
      // Update client record
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          package_type: selectedPlan.title,
          total_sessions_purchased: newTotalSessions,
          expiry_date: format(newExpiry, 'yyyy-MM-dd'),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);
      
      if (updateError) throw updateError;
      
      // Log the package sale in renewal_logs with full audit trail
      const { error: logError } = await supabase
        .from('renewal_logs')
        .insert({
          user_id: client.member_id || client.id,
          performed_by: user.id,
          plan_name: `${selectedPlan.title} - ${selectedPlan.sessions} Sessions`,
          amount: selectedPlan.price,
          type: 'Package Sale',
          previous_expiry: previousExpiry,
          new_expiry: format(newExpiry, 'yyyy-MM-dd'),
          previous_status: client.status,
          new_status: 'active',
          notes: `PACKAGE SOLD: ${selectedPlan.title}. Sessions added: ${selectedPlan.sessions}. Previous total: ${previousSessions}, New total: ${newTotalSessions}. Previous balance: ${currentSessions}, New balance: ${calculateNewSessions(selectedPlan)}. Mode: ${isExpired ? 'Reactivation' : 'Stacking'}`,
        });
      
      if (logError) {
        console.error('Failed to log package sale:', logError);
      }
      
      toast.success(
        `Package Sold: ${selectedPlan.title}`,
        { description: `${client.name} now has ${calculateNewSessions(selectedPlan)} sessions. Status: Active` }
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error selling package:', error);
      toast.error(error.message || 'Failed to sell package');
    } finally {
      setRenewing(false);
    }
  };
  
  const selectedPlan = ptPlans.find(p => p.id === selectedPlanId);
  
  const getDurationLabel = (plan: DatabasePlan) => {
    const parts: string[] = [];
    if (plan.duration_months === 12 && (plan.duration_days || 0) === 0) return '1 Year';
    if (plan.duration_months > 0) parts.push(plan.duration_months === 1 ? '1 Month' : `${plan.duration_months} Months`);
    if ((plan.duration_days || 0) > 0) parts.push(plan.duration_days === 1 ? '1 Day' : `${plan.duration_days} Days`);
    return parts.join(' + ') || '—';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-500" />
            Sell PT Package
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Client Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium">{client.name}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Current Status:</span>
              <Badge variant={isExpired ? 'destructive' : 'default'} className="text-xs">
                {isExpired ? 'Expired / Completed' : 'Active'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sessions Remaining:</span>
              <span className={currentSessions <= 0 ? 'text-destructive font-medium' : 'font-medium'}>
                {currentSessions}
              </span>
            </div>
            {client.expiry_date && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isExpired ? 'Expired on:' : 'Current Expiry:'}</span>
                <span>{format(new Date(client.expiry_date), 'PPP')}</span>
              </div>
            )}
          </div>
          
          {/* Package Selection - Dynamic from DB */}
          <div className="space-y-2">
            <Label>Select Package to Sell</Label>
            {plansLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading plans...
              </div>
            ) : ptPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No session-based plans found. Add plans with sessions in Plan Manager.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a package..." />
                </SelectTrigger>
                <SelectContent>
                  {ptPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{plan.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {plan.sessions}s · RM{plan.price.toFixed(0)} · {getDurationLabel(plan)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Preview */}
          {selectedPlan && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-600">
                  {isExpired ? '🔄 Reactivation Mode' : '📈 Stacking Mode'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Sessions After Sale</p>
                  <p className="font-medium text-emerald-600">
                    {currentSessions} + {selectedPlan.sessions} = <span className="text-lg">{calculateNewSessions(selectedPlan)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">New Expiry Date</p>
                  <p className="font-medium">{format(calculateNewExpiry(selectedPlan), 'PPP')}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Package Price:</span>
                  <span className="font-semibold text-emerald-600">RM {selectedPlan.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={renewing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSellPackage} 
            disabled={!selectedPlanId || renewing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {renewing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirm Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
