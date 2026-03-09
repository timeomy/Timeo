import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type MemberRole = 'admin' | 'coach' | 'it_admin' | 'member' | 'vendor' | 'staff' | 'studio' | 'day_pass';

export function useUserRole() {
  const { user, role: existingRole, isAdmin, isItAdmin } = useAuth();
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberRole = async () => {
      if (!user) {
        setMemberRole(null);
        setLoading(false);
        return;
      }

      // Check for member/vendor roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roleList = roles?.map(r => r.role) || [];
      
      // Priority: it_admin > admin > coach > studio > vendor > member
      if (roleList.includes('it_admin')) {
        setMemberRole('it_admin');
      } else if (roleList.includes('admin')) {
        setMemberRole('admin');
      } else if (roleList.includes('coach')) {
        setMemberRole('coach');
      } else if (roleList.includes('studio')) {
        setMemberRole('studio');
      } else if (roleList.includes('vendor')) {
        setMemberRole('vendor');
      } else if (roleList.includes('member')) {
        setMemberRole('member');
      } else {
        setMemberRole(null);
      }
      
      setLoading(false);
    };

    fetchMemberRole();
  }, [user]);

  const isMember = memberRole === 'member' || memberRole === 'staff' || memberRole === 'studio'; // Staff and studio treated as members
  const isVendor = memberRole === 'vendor';
  const hasAdminAccess = memberRole === 'admin' || memberRole === 'it_admin'; // Staff/studio should NOT have admin access

  return {
    memberRole,
    loading,
    isMember,
    isVendor,
    hasAdminAccess,
    isCoach: memberRole === 'coach',
    isStaff: memberRole === 'staff',
    isStudio: memberRole === 'studio',
  };
}
