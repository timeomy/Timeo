import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

interface ClientSyncReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientsToSync: Client[];
  onClientDeleted: (clientId: string) => void;
  onSync: (clients: Client[]) => void;
  isSyncing: boolean;
}

const JUNK_PATTERNS = ['test', 'mark', 'temp', 'demo', 'dummy', 'sample'];

function isLikelyJunk(name: string): boolean {
  const lowerName = name.toLowerCase();
  return JUNK_PATTERNS.some(pattern => lowerName.includes(pattern));
}

export function ClientSyncReviewModal({
  open,
  onOpenChange,
  clientsToSync,
  onClientDeleted,
  onSync,
  isSyncing
}: ClientSyncReviewModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (client: Client) => {
    setDeletingId(client.id);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) {
        toast.error(`Failed to delete ${client.name}: ${error.message}`);
      } else {
        toast.success(`Deleted "${client.name}" from coach clients`);
        onClientDeleted(client.id);
      }
    } catch (err) {
      toast.error('Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  };

  const junkCount = clientsToSync.filter(c => isLikelyJunk(c.name)).length;
  const validCount = clientsToSync.length - junkCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Found {clientsToSync.length} Unsynced Clients
          </DialogTitle>
        </DialogHeader>

        {clientsToSync.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>All clients are already synced!</p>
          </div>
        ) : (
          <>
            {junkCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{junkCount} entries may be junk data. Delete before syncing.</span>
              </div>
            )}

            <ScrollArea className="max-h-[300px] pr-2">
              <div className="space-y-2">
                {clientsToSync.map((client) => {
                  const isJunk = isLikelyJunk(client.name);
                  return (
                    <div
                      key={client.id}
                      className={`flex items-center justify-between p-2 rounded-md border ${
                        isJunk 
                          ? 'border-amber-500/30 bg-amber-500/5' 
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{client.name}</span>
                        {isJunk && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/50 text-xs">
                            Likely Junk
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={() => handleDelete(client)}
                        disabled={deletingId === client.id || isSyncing}
                      >
                        {deletingId === client.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="text-xs text-muted-foreground text-center">
              {validCount} valid • {junkCount} flagged as junk
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSync(clientsToSync)} 
            disabled={clientsToSync.length === 0 || isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Sync {clientsToSync.length} Clients
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
