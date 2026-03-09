import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type TableName = 'profiles' | 'clients' | 'payments' | 'class_enrollments' | 'memberships' | 'check_ins' | 'training_logs' | 'renewal_logs' | 'notifications';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  queryKeys: string[][];
  enabled?: boolean;
  onUpdate?: (table: TableName, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
}

/**
 * Hook to subscribe to real-time database changes and automatically invalidate React Query cache
 * 
 * @param options.tables - Array of table names to subscribe to
 * @param options.queryKeys - Array of query keys to invalidate when changes occur
 * @param options.enabled - Whether the subscription is enabled (default: true)
 * @param options.onUpdate - Optional callback when an update occurs
 */
export function useRealtimeSubscription({ 
  tables, 
  queryKeys, 
  enabled = true,
  onUpdate 
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-${tables.join('-')}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Subscribe to each table
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          
          // Invalidate all specified query keys
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });

          // Call optional callback
          if (onUpdate) {
            onUpdate(table, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', payload);
          }
        }
      );
    });

    channel.subscribe((status) => {
      console.log(`[Realtime] Subscription status for ${channelName}:`, status);
    });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), queryKeys.map(k => k.join('.')).join(','), enabled]);
}

/**
 * Simplified hook for common admin dashboard real-time updates
 */
export function useAdminRealtimeSync(queryKeys: string[][] = [['members'], ['clients'], ['payments']]) {
  useRealtimeSubscription({
    tables: ['profiles', 'clients', 'payments', 'memberships', 'check_ins'],
    queryKeys,
  });
}

/**
 * Simplified hook for coach client list real-time updates
 * Includes 'memberships' to reflect renewed member data on coach views
 */
export function useCoachRealtimeSync(onUpdate?: () => void) {
  useRealtimeSubscription({
    tables: ['clients', 'training_logs', 'profiles', 'memberships'],
    queryKeys: [['clients'], ['training-logs'], ['memberships']],
    onUpdate: onUpdate ? () => onUpdate() : undefined,
  });
}

/**
 * Simplified hook for merge center real-time updates
 */
export function useMergeCenterRealtimeSync(onUpdate?: () => void) {
  useRealtimeSubscription({
    tables: ['clients', 'profiles', 'notifications'],
    queryKeys: [['unlinked-clients'], ['flagged-notifications']],
    onUpdate: onUpdate ? () => onUpdate() : undefined,
  });
}
