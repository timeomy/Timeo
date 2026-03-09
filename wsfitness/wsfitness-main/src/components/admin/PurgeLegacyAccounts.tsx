import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PurgeLegacyAccountsProps {
  onComplete?: () => void;
}

export function PurgeLegacyAccounts({ onComplete }: PurgeLegacyAccountsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [legacyCount, setLegacyCount] = useState<number | null>(null);

  const checkLegacyCount = async () => {
    // Count legacy accounts before showing dialog
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .ilike('email', 'legacy%')
      .ilike('email', '%@wsfitness.my');
    
    if (error) {
      toast.error('Failed to check legacy accounts');
      return;
    }
    
    setLegacyCount(count || 0);
    setConfirmOpen(true);
  };

  const handlePurge = async () => {
    setPurging(true);
    toast.loading('Purging legacy accounts...', { id: 'purge-legacy' });

    try {
      // Step 1: Find all legacy user IDs
      const { data: legacyProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .ilike('email', 'legacy%')
        .ilike('email', '%@wsfitness.my');

      if (fetchError) throw fetchError;

      if (!legacyProfiles || legacyProfiles.length === 0) {
        toast.dismiss('purge-legacy');
        toast.info('No legacy accounts found to delete');
        setConfirmOpen(false);
        return;
      }

      let deleted = 0;
      let failed = 0;
      const errors: string[] = [];

      // Step 2: Delete each user through the delete-user edge function
      for (const profile of legacyProfiles) {
        try {
          const res = await supabase.functions.invoke('delete-user', {
            body: { userId: profile.id },
          });

          if (res.error) throw new Error(res.error.message);
          if (res.data?.error) throw new Error(res.data.error);

          deleted++;
          
          // Update progress periodically
          if (deleted % 10 === 0) {
            toast.loading(`Deleted ${deleted}/${legacyProfiles.length} legacy accounts...`, { id: 'purge-legacy' });
          }
        } catch (error: any) {
          failed++;
          if (errors.length < 10) {
            errors.push(`${profile.name}: ${error.message}`);
          }
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.dismiss('purge-legacy');

      if (deleted > 0) {
        toast.success(`Successfully deleted ${deleted} legacy users`);
      }
      
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} users. Check console for details.`);
        console.error('Purge errors:', errors);
      }

      setConfirmOpen(false);
      onComplete?.();
    } catch (error: any) {
      toast.dismiss('purge-legacy');
      console.error('Purge error:', error);
      toast.error(error.message || 'Failed to purge legacy accounts');
    } finally {
      setPurging(false);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={checkLegacyCount}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Purge Legacy Imports
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Purge Legacy Accounts
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete <strong className="text-destructive">{legacyCount} legacy account{legacyCount !== 1 ? 's' : ''}</strong> from the system.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Accounts matching:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Email starts with <code className="bg-muted px-1 rounded">legacy</code></li>
                  <li>Email ends with <code className="bg-muted px-1 rounded">@wsfitness.my</code></li>
                </ul>
              </div>
              <p className="text-destructive font-medium">
                ⚠️ This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              disabled={purging || legacyCount === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {purging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Purging...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {legacyCount} Accounts
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
