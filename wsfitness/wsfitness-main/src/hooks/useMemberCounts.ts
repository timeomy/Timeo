import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberCounts {
  pending: number;
  rejected: number;
  active: number;
  expired: number;
  staff: number;
  inviteCodes: number;
  scheduled: number;
}

export function useMemberCounts() {
  return useQuery({
    queryKey: ['member-counts'],
    queryFn: async (): Promise<MemberCounts> => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all counts in parallel
      const [
        pendingResult,
        rejectedResult,
        expiredResult,
        staffRolesResult,
        inviteResult,
        membershipsResult,
        scheduledResult
      ] = await Promise.all([
        // Pending approvals
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),
        
        // Rejected
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'rejected'),
        
        // Expired (expiry_date < today)
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .lt('expiry_date', today),
        
        // Staff roles
        supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['staff', 'admin', 'it_admin']),
        
        // Active invite codes
        supabase
          .from('invite_codes')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // All active memberships (started and not expired)
        supabase
          .from('memberships')
          .select('user_id, valid_from')
          .eq('status', 'active')
          .or(`expiry_date.gte.${today},expiry_date.is.null`),
        
        // Scheduled (future-dated Day Passes - valid_from > today)
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('valid_from', today)
      ]);

      // Get staff user IDs
      const staffUserIds = new Set((staffRolesResult.data || []).map(r => r.user_id));
      
      // Get all membership user IDs, filtering out future day passes
      const todayDate = new Date(today);
      const activeMemberships = (membershipsResult.data || []).filter(m => {
        // If valid_from is in the future, don't count as active
        if (m.valid_from) {
          const validFromDate = new Date(m.valid_from);
          if (validFromDate > todayDate) return false;
        }
        return true;
      });
      const membershipUserIds = new Set(activeMemberships.map(m => m.user_id));
      
      // Staff count: only count staff who also have a membership record
      const staffWithMembership = [...staffUserIds].filter(id => membershipUserIds.has(id));
      
      // Active count: members with active status excluding staff
      const activeNonStaff = activeMemberships.filter(m => !staffUserIds.has(m.user_id));

      return {
        pending: pendingResult.count || 0,
        rejected: rejectedResult.count || 0,
        active: activeNonStaff.length,
        expired: expiredResult.count || 0,
        staff: staffWithMembership.length,
        inviteCodes: inviteResult.count || 0,
        scheduled: scheduledResult.count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
