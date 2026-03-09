import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberFilter {
  tab: 'active' | 'expired' | 'staff' | 'scheduled';
  search?: string;
  missingIdOnly?: boolean;
}

interface FetchParams {
  filter: MemberFilter;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
}

// Auto-expire memberships that are past their expiry date
async function autoExpireMemberships() {
  const today = new Date().toISOString().split('T')[0];
  
  // Update memberships where status is 'active' but expiry_date has passed
  await supabase
    .from('memberships')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .not('expiry_date', 'is', null)
    .lt('expiry_date', today);
}

export function usePaginatedMembers(
  filter: MemberFilter,
  pageSize: number = 20
) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('profiles.created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  const fetchMembers = async ({ filter, page, pageSize, sortKey, sortDirection }: FetchParams) => {
    // Run auto-expire check before fetching members
    await autoExpireMemberships();
    
    const today = new Date().toISOString().split('T')[0];
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // For staff tab, we need a different approach - fetch staff user IDs first
    if (filter.tab === 'staff') {
      // Get all staff user IDs (including studio role)
      const { data: staffRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['staff', 'admin', 'it_admin', 'studio']);

      const staffUserIds = (staffRoles || []).map(r => r.user_id);
      const roleMap: Record<string, string> = {};
      staffRoles?.forEach(r => {
        const existing = roleMap[r.user_id];
        const rolePriority = ['it_admin', 'admin', 'coach', 'studio', 'staff', 'vendor', 'member'];
        if (!existing || rolePriority.indexOf(r.role) < rolePriority.indexOf(existing)) {
          roleMap[r.user_id] = r.role;
        }
      });

      if (staffUserIds.length === 0) {
        return { members: [], totalCount: 0, totalPages: 0 };
      }

      // Build query for staff members
      let query = supabase
        .from('memberships')
        .select('*, profiles:user_id(name, email, phone_number, member_id, avatar_url, created_at)', { count: 'exact' })
        .in('user_id', staffUserIds);

      // Apply search filter
      if (filter.search?.trim()) {
        const searchTerm = `%${filter.search.trim()}%`;
        query = query.or(`profiles.name.ilike.${searchTerm},profiles.email.ilike.${searchTerm},profiles.member_id.ilike.${searchTerm}`);
      }

      // Apply sorting
      if (sortKey.startsWith('profiles.')) {
        const orderColumn = sortKey.replace('profiles.', '');
        query = query.order(orderColumn, { ascending: sortDirection === 'asc', referencedTable: 'profiles' });
      } else {
        query = query.order(sortKey, { ascending: sortDirection === 'asc' });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      let membersWithRoles = (data || []).map(m => ({
        ...m,
        user_role: roleMap[m.user_id] || 'staff'
      }));

      // Apply missing ID filter
      if (filter.missingIdOnly) {
        membersWithRoles = membersWithRoles.filter(m => !m.profiles?.member_id);
      }

      return {
        members: membersWithRoles,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    // For active/expired tabs
    let orderColumn = sortKey;
    let orderForeignTable: string | undefined;
    
    if (sortKey.startsWith('profiles.')) {
      orderForeignTable = 'profiles';
      orderColumn = sortKey.replace('profiles.', '');
    }

    // First, get staff user IDs to exclude
    const { data: staffRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['staff', 'admin', 'it_admin']);

    const staffUserIds = (staffRoles || []).map(r => r.user_id);

    // Build base query for data
    let query = supabase
      .from('memberships')
      .select('*, profiles:user_id(name, email, phone_number, member_id, avatar_url, created_at)', { count: 'exact' })
      .not('status', 'in', '("pending_approval","rejected")');

    // Exclude staff users
    if (staffUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${staffUserIds.join(',')})`);
    }

    // Build filter conditions
    const filterConditions: string[] = [];
    
    // Apply tab-specific filters
    if (filter.tab === 'active') {
      // Active = status is 'active' AND (expiry_date >= today OR null) AND (valid_from <= today OR null)
      query = query.eq('status', 'active');
      filterConditions.push(`expiry_date.gte.${today},expiry_date.is.null`);
      filterConditions.push(`valid_from.lte.${today},valid_from.is.null`);
    } else if (filter.tab === 'expired') {
      query = query.lt('expiry_date', today);
    } else if (filter.tab === 'scheduled') {
      // Scheduled = status is 'active' AND valid_from > today (future-dated Day Passes)
      query = query.eq('status', 'active').gt('valid_from', today);
    }

    // Apply date filters first (these use OR internally but must all pass)
    for (const condition of filterConditions) {
      query = query.or(condition);
    }

    // Apply sorting
    if (orderForeignTable) {
      query = query.order(orderColumn, { ascending: sortDirection === 'asc', referencedTable: orderForeignTable });
    } else {
      query = query.order(orderColumn, { ascending: sortDirection === 'asc' });
    }

    // For search, we need to fetch more data and filter client-side to avoid query conflicts
    // When searching, fetch larger dataset and filter
    const searchTerm = filter.search?.trim().toLowerCase();
    
    if (searchTerm) {
      // Fetch a larger set for client-side filtering when searching
      query = query.range(0, 500);
    } else {
      // Apply pagination only when not searching
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;

    // Fetch roles for display (coach, vendor, member)
    const userIds = (data || []).map(m => m.user_id);
    let roleMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolePriority = ['it_admin', 'admin', 'coach', 'staff', 'vendor', 'member'];
      rolesData?.forEach(r => {
        const existing = roleMap[r.user_id];
        if (!existing || rolePriority.indexOf(r.role) < rolePriority.indexOf(existing)) {
          roleMap[r.user_id] = r.role;
        }
      });
    }

    // Map roles to members
    let membersWithRoles = (data || []).map(m => ({
      ...m,
      user_role: roleMap[m.user_id] || 'member'
    }));

    // Apply client-side search filter - search across all relevant fields
    if (searchTerm) {
      membersWithRoles = membersWithRoles.filter(m => {
        const name = m.profiles?.name?.toLowerCase() || '';
        const email = m.profiles?.email?.toLowerCase() || '';
        const memberId = m.profiles?.member_id?.toLowerCase() || '';
        const phone = m.profiles?.phone_number?.toLowerCase() || '';
        const planType = m.plan_type?.toLowerCase() || '';
        const role = m.user_role?.toLowerCase() || '';
        return (
          name.includes(searchTerm) || 
          email.includes(searchTerm) || 
          memberId.includes(searchTerm) || 
          phone.includes(searchTerm) ||
          planType.includes(searchTerm) ||
          role.includes(searchTerm)
        );
      });
    }

    // Apply missing ID filter
    if (filter.missingIdOnly) {
      membersWithRoles = membersWithRoles.filter(m => !m.profiles?.member_id);
    }

    // Apply client-side sorting for fields that can't be sorted at DB level
    if (sortKey === 'user_role' || sortKey === 'status') {
      membersWithRoles.sort((a, b) => {
        const aVal = sortKey === 'user_role' ? a.user_role : a.status;
        const bVal = sortKey === 'user_role' ? b.user_role : b.status;
        const cmp = (aVal || '').localeCompare(bVal || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    // Calculate pagination for filtered results
    const filteredTotal = membersWithRoles.length;
    const paginatedMembers = searchTerm 
      ? membersWithRoles.slice(from, from + pageSize)
      : membersWithRoles;

    return {
      members: paginatedMembers,
      totalCount: searchTerm ? filteredTotal : (count || 0),
      totalPages: Math.ceil((searchTerm ? filteredTotal : (count || 0)) / pageSize)
    };
  };

  const queryResult = useQuery({
    queryKey: ['paginated-members', filter, page, pageSize, sortKey, sortDirection],
    queryFn: () => fetchMembers({ filter, page, pageSize, sortKey, sortDirection }),
    staleTime: 30000, // 30 seconds
    placeholderData: (prev) => prev, // Keep previous data while loading
  });

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setPage(1); // Reset to first page on sort change
  }, [sortKey]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['paginated-members'] });
  }, [queryClient]);

  return {
    members: queryResult.data?.members || [],
    totalCount: queryResult.data?.totalCount || 0,
    totalPages: queryResult.data?.totalPages || 1,
    page,
    setPage,
    pageSize,
    sortKey,
    sortDirection,
    handleSort,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    refresh,
  };
}

// Helper to get optimized thumbnail URL from Supabase Storage
export function getAvatarThumbnail(avatarUrl: string | null, width: number = 50): string | null {
  if (!avatarUrl) return null;
  
  // Check if it's a Supabase storage URL
  if (avatarUrl.includes('supabase.co/storage') || avatarUrl.includes('/storage/v1/object/public/')) {
    // Extract the base URL and add transformation params
    const transformed = avatarUrl.replace(
      '/storage/v1/object/public/',
      `/storage/v1/render/image/public/`
    ) + `?width=${width}&resize=contain`;
    
    return transformed;
  }
  
  // Return original URL if not Supabase storage
  return avatarUrl;
}
