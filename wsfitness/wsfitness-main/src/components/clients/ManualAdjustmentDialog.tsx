import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2, Settings2, Plus, Minus } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  total_sessions_purchased: number;
  carry_over_sessions: number;
  sessions_used?: number;
  member_id?: string | null;
}

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function ManualAdjustmentDialog({ open, onOpenChange, client, onSuccess }: ManualAdjustmentDialogProps) {
  const { user } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [sessions, setSessions] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!client) return null;

  const currentBalance = (client.total_sessions_purchased + client.carry_over_sessions) - (client.sessions_used || 0);

  const handleAdjust = async () => {
    if (!user || !client || sessions <= 0) return;

    setSaving(true);
    try {
      const adjustedSessions = adjustmentType === 'add' ? sessions : -sessions;
      const newCarryOver = client.carry_over_sessions + adjustedSessions;
      
      // Validate we don't go negative
      if (newCarryOver < 0 && adjustmentType === 'subtract') {
        const maxSubtract = client.carry_over_sessions + client.total_sessions_purchased - (client.sessions_used || 0);
        if (sessions > maxSubtract) {
          toast.error(`Cannot subtract more than available balance (${maxSubtract} sessions)`);
          setSaving(false);
          return;
        }
      }

      // Update client record - use carry_over_sessions for adjustments
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          carry_over_sessions: Math.max(0, newCarryOver),
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      // Log the adjustment in renewal_logs
      const { error: logError } = await supabase
        .from('renewal_logs')
        .insert({
          user_id: client.member_id || client.id,
          performed_by: user.id,
          plan_name: `Manual Adjustment (${adjustmentType === 'add' ? '+' : '-'}${sessions})`,
          amount: 0,
          type: 'Manual Adjustment',
          previous_expiry: null,
          new_expiry: new Date().toISOString().split('T')[0],
          previous_status: null,
          new_status: null,
          notes: `${adjustmentType === 'add' ? 'Added' : 'Subtracted'} ${sessions} session(s). Reason: ${reason || 'No reason provided'}. Previous balance: ${currentBalance}, New balance: ${currentBalance + adjustedSessions}`,
        });

      if (logError) {
        console.error('Failed to log adjustment:', logError);
      }

      toast.success(
        `Successfully ${adjustmentType === 'add' ? 'added' : 'subtracted'} ${sessions} session(s)`,
        { description: `New balance: ${currentBalance + adjustedSessions}` }
      );

      // Reset and close
      setSessions(1);
      setReason('');
      setAdjustmentType('add');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adjusting sessions:', error);
      toast.error(error.message || 'Failed to adjust sessions');
    } finally {
      setSaving(false);
    }
  };

  const newBalance = adjustmentType === 'add' 
    ? currentBalance + sessions 
    : Math.max(0, currentBalance - sessions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-amber-500" />
            Manual Session Adjustment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium">{client.name}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Current Balance:</span>
              <span className="font-medium text-foreground">{currentBalance} sessions</span>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('add')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sessions
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'subtract' ? 'destructive' : 'outline'}
                onClick={() => setAdjustmentType('subtract')}
                className="gap-2"
              >
                <Minus className="h-4 w-4" />
                Subtract
              </Button>
            </div>
          </div>

          {/* Sessions Input */}
          <div className="space-y-2">
            <Label>Number of Sessions</Label>
            <Input
              type="number"
              min="1"
              value={sessions}
              onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Required for audit)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Compensation for canceled class, correction, bonus sessions..."
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg border space-y-1 ${
            adjustmentType === 'add' 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <p className="text-xs text-muted-foreground">New Balance After Adjustment:</p>
            <p className="text-lg font-bold">
              {currentBalance} {adjustmentType === 'add' ? '+' : '-'} {sessions} = <span className={adjustmentType === 'add' ? 'text-emerald-600' : 'text-amber-600'}>{newBalance}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleAdjust}
            disabled={saving || sessions <= 0}
            variant={adjustmentType === 'add' ? 'default' : 'destructive'}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm {adjustmentType === 'add' ? 'Add' : 'Subtract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
