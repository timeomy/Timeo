import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Loader2, CheckCircle, Shield } from 'lucide-react';

interface BulkIdMigrationProps {
  onComplete?: () => void;
}

export function BulkIdMigration({ onComplete }: BulkIdMigrationProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [failedMembers, setFailedMembers] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleMigration = async () => {
    setIsMigrating(true);
    setProgress(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setErrorCount(0);
    setFailedMembers([]);
    setIsComplete(false);

    try {
      // Fetch all profiles that are members (have member role)
      const { data: memberRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'member');

      if (rolesError) throw rolesError;

      if (!memberRoles || memberRoles.length === 0) {
        toast.info('No members found to migrate');
        setIsMigrating(false);
        return;
      }

      const memberIds = memberRoles.map(r => r.user_id);
      
      // Fetch profiles for these members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, member_id')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast.info('No member profiles found to migrate');
        setIsMigrating(false);
        return;
      }

      setTotalMembers(profiles.length);
      let currentSuccessCount = 0;
      let currentErrorCount = 0;
      const currentFailedMembers: string[] = [];

      // Helper function to generate 8-digit hex ID
      const generateHexId = (): string => {
        const chars = '0123456789ABCDEF';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Collect existing IDs to avoid collisions
      const existingIds = new Set(profiles.map(p => p.member_id).filter(Boolean));

      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        
        try {
          // Generate new hex ID with collision check
          let newId: string;
          let attempts = 0;
          do {
            newId = generateHexId();
            attempts++;
          } while (existingIds.has(newId) && attempts < 10);

          if (attempts >= 10) throw new Error('Failed to generate unique ID');

          // Add to existing set to prevent future collisions
          existingIds.add(newId);

          // Update profile with new hex ID
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ member_id: newId })
            .eq('id', profile.id);

          if (updateError) throw updateError;
          
          currentSuccessCount++;
        } catch (error: any) {
          console.error(`Failed to migrate member ${profile.id}:`, error);
          currentErrorCount++;
          currentFailedMembers.push(profile.id);
          // Continue to next member instead of stopping
        }

        const processed = i + 1;
        setProcessedCount(processed);
        setSuccessCount(currentSuccessCount);
        setErrorCount(currentErrorCount);
        setProgress(Math.round((processed / profiles.length) * 100));
      }

      setFailedMembers(currentFailedMembers);
      setIsComplete(true);
      
      if (currentErrorCount > 0) {
        toast.warning(`Migration completed: ${currentSuccessCount} succeeded, ${currentErrorCount} failed`);
      } else {
        toast.success(`Successfully migrated ${currentSuccessCount} member IDs!`);
      }

      onComplete?.();
    } catch (error: any) {
      console.error('Migration failed:', error);
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const resetState = () => {
    setIsComplete(false);
    setProgress(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setErrorCount(0);
    setFailedMembers([]);
    setTotalMembers(0);
  };

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">Bulk ID Migration</CardTitle>
        </div>
        <CardDescription>
          Convert all member IDs to Gate-Compatible Hex Format (e.g., 1A2B3C4D)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMigrating ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Migrating members...</span>
              <span className="font-mono text-primary">
                {processedCount}/{totalMembers}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait, do not close this page...
            </div>
          </div>
        ) : isComplete ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <span className="text-lg font-medium text-emerald-500">Migration Complete!</span>
            </div>
            <div className="text-sm text-center space-y-1">
              <p className="text-muted-foreground">
                <span className="text-emerald-500 font-medium">{successCount}</span> succeeded
                {errorCount > 0 && (
                  <span className="text-destructive ml-2">• {errorCount} failed</span>
                )}
              </p>
              {failedMembers.length > 0 && (
                <p className="text-xs text-destructive/80">
                  Failed IDs logged to console for review
                </p>
              )}
            </div>
            <Button variant="outline" onClick={resetState} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Migrate All to Gate-Compatible IDs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Warning: Irreversible Action
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-semibold text-foreground">
                    Converting all IDs to Gate-Compatible Hex Format (e.g., 1A2B3C4D)
                  </p>
                  <p>
                    Old QR codes will stop working immediately. Members will need 
                    to access their updated digital ID cards to get new QR codes.
                  </p>
                  <p className="text-destructive font-medium">
                    This action cannot be undone!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleMigration}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Migrate All IDs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> New format uses 8 hexadecimal characters (0-9, A-F) 
          for compatibility with physical gate hardware.
        </p>
      </CardContent>
    </Card>
  );
}
