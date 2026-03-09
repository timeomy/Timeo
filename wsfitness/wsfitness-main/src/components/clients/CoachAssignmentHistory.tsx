import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowRight, User, Loader2 } from 'lucide-react';

interface CoachHistoryEntry {
  id: string;
  previous_coach_id: string | null;
  new_coach_id: string | null;
  changed_by: string;
  changed_at: string;
  notes: string | null;
  previous_coach_name?: string;
  new_coach_name?: string;
  changed_by_name?: string;
}

interface CoachAssignmentHistoryProps {
  clientId: string;
  clientName: string;
}

export function CoachAssignmentHistory({ clientId, clientName }: CoachAssignmentHistoryProps) {
  const [history, setHistory] = useState<CoachHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [clientId]);

  const fetchHistory = async () => {
    try {
      // Fetch history entries
      const { data: historyData, error } = await supabase
        .from('client_coach_history')
        .select('*')
        .eq('client_id', clientId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      if (!historyData || historyData.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Get unique profile IDs
      const profileIds = new Set<string>();
      historyData.forEach(h => {
        if (h.previous_coach_id) profileIds.add(h.previous_coach_id);
        if (h.new_coach_id) profileIds.add(h.new_coach_id);
        if (h.changed_by) profileIds.add(h.changed_by);
      });

      // Fetch profile names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(profileIds));

      const nameById: Record<string, string> = {};
      profiles?.forEach(p => { nameById[p.id] = p.name; });

      // Hydrate history with names
      const hydratedHistory = historyData.map(h => ({
        ...h,
        previous_coach_name: h.previous_coach_id ? nameById[h.previous_coach_id] || 'Unknown' : null,
        new_coach_name: h.new_coach_id ? nameById[h.new_coach_id] || 'Unknown' : null,
        changed_by_name: nameById[h.changed_by] || 'Unknown'
      }));

      setHistory(hydratedHistory);
    } catch (error) {
      console.error('Error fetching coach history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No coach assignment changes recorded for {clientName}.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {history.map((entry) => (
          <div 
            key={entry.id}
            className="p-3 rounded-xl bg-muted/50 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {entry.previous_coach_name ? (
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    {entry.previous_coach_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                {entry.new_coach_name ? (
                  <Badge className="gap-1 bg-primary/20 text-primary hover:bg-primary/30">
                    <User className="h-3 w-3" />
                    {entry.new_coach_name}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Changed by <span className="font-medium text-foreground">{entry.changed_by_name}</span>
              <span className="mx-1">•</span>
              {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
            </div>
            {entry.notes && (
              <p className="mt-2 text-sm text-muted-foreground italic">"{entry.notes}"</p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
