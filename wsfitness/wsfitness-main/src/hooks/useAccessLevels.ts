import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccessLevel {
  id: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

export function useAccessLevels() {
  return useQuery({
    queryKey: ['access-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_levels')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as AccessLevel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccessLevelMutations() {
  const queryClient = useQueryClient();

  const createLevel = useMutation({
    mutationFn: async (level: { key: string; label: string; emoji: string; color: string; display_order: number }) => {
      const { error } = await supabase.from('access_levels').insert(level);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-levels'] });
      toast.success('Access level created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create access level'),
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccessLevel> & { id: string }) => {
      const { error } = await supabase.from('access_levels').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-levels'] });
      toast.success('Access level updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('access_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-levels'] });
      toast.success('Access level deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  return { createLevel, updateLevel, deleteLevel };
}
