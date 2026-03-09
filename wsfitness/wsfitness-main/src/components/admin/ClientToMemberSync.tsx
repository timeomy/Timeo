import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClientSyncReviewModal } from './ClientSyncReviewModal';

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

interface SyncResult {
  created: string[];
  skipped: string[];
  failed: string[];
}

export function ClientToMemberSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [clientsToSync, setClientsToSync] = useState<Client[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<SyncResult | null>(null);

  const normalizeNameForComparison = (name: string): string => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const handleReviewClients = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Fetch all clients from the clients table
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, phone')
        .order('name');

      if (clientsError) {
        throw new Error(`Failed to fetch clients: ${clientsError.message}`);
      }

      if (!clients || clients.length === 0) {
        toast.info('No clients found in the coaching system.');
        setIsLoading(false);
        return;
      }

      // Fetch all existing profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) {
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      // Create a normalized name set for quick lookup
      const existingNames = new Set(
        (profiles || []).map(p => normalizeNameForComparison(p.name))
      );

      // Filter clients that don't exist in profiles
      const unsynced = clients.filter(
        client => !existingNames.has(normalizeNameForComparison(client.name))
      );

      if (unsynced.length === 0) {
        toast.success('All clients are already synced as members!');
        setIsLoading(false);
        return;
      }

      setClientsToSync(unsynced);
      setShowReviewModal(true);
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientDeleted = (clientId: string) => {
    setClientsToSync(prev => prev.filter(c => c.id !== clientId));
  };

  const handleSync = async (clients: Client[]) => {
    if (clients.length === 0) {
      toast.info('No clients to sync');
      setShowReviewModal(false);
      return;
    }

    setIsSyncing(true);
    setProgress({ current: 0, total: clients.length });

    const syncResult: SyncResult = {
      created: [],
      skipped: [],
      failed: []
    };

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      
      try {
        const { error } = await supabase.functions.invoke('create-user', {
          body: {
            fullName: client.name,
            role: 'member',
            plan_type: 'Monthly'
          }
        });

        if (error) {
          console.error(`Failed to create ${client.name}:`, error);
          syncResult.failed.push(client.name);
        } else {
          syncResult.created.push(client.name);
        }
      } catch (err) {
        console.error(`Error creating ${client.name}:`, err);
        syncResult.failed.push(client.name);
      }

      setProgress({ current: i + 1, total: clients.length });

      // Add delay between requests to avoid rate limiting
      if (i < clients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setResult(syncResult);
    setShowReviewModal(false);
    setClientsToSync([]);

    if (syncResult.created.length > 0) {
      toast.success(`Success! ${syncResult.created.length} new members added.`);
    }
    if (syncResult.failed.length > 0) {
      toast.error(`${syncResult.failed.length} clients failed to sync.`);
    }

    setIsSyncing(false);
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      <Card className="ios-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-primary" />
            Sync Coach Clients to Members
          </CardTitle>
          <CardDescription className="text-xs">
            Review and sync clients from coaching system to members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleReviewClients}
            disabled={isLoading || isSyncing}
            className="w-full"
            variant="default"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading clients...
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing: {progress.current}/{progress.total}...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                🔄 Sync Coach Clients to DB
              </>
            )}
          </Button>

          {isSyncing && progress.total > 0 && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Processing {progress.current} of {progress.total} clients...
              </p>
            </div>
          )}

          {result && !isSyncing && (
            <div className="space-y-2 text-xs">
              {result.created.length > 0 && (
                <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Created ({result.created.length}):</span>
                    <p className="text-muted-foreground">{result.created.join(', ')}</p>
                  </div>
                </div>
              )}
              {result.failed.length > 0 && (
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Failed ({result.failed.length}):</span>
                    <p>{result.failed.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientSyncReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        clientsToSync={clientsToSync}
        onClientDeleted={handleClientDeleted}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
    </>
  );
}
