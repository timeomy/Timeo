import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type SpecialRole = 'staff' | 'studio' | null;

interface StaffStatus {
  isStaff: boolean;
  isStudio: boolean;
  specialRole: SpecialRole;
  loading: boolean;
}

// Gym opening hours in 24h format (e.g., 6 = 6:00 AM)
export const GYM_OPENING_HOUR = 6;
export const STAFF_EARLY_CHECK_IN_MINUTES = 30;

/**
 * Check if staff can check in early (30 minutes before opening)
 */
export function canStaffCheckInEarly(): { canCheckIn: boolean; message: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinutes;
  
  const openingTotalMinutes = GYM_OPENING_HOUR * 60;
  const staffEarlyMinutes = openingTotalMinutes - STAFF_EARLY_CHECK_IN_MINUTES;
  
  // Staff can check in 30 minutes before opening
  if (currentTotalMinutes >= staffEarlyMinutes) {
    return { canCheckIn: true, message: 'Staff early access granted' };
  }
  
  const waitMinutes = staffEarlyMinutes - currentTotalMinutes;
  const waitHours = Math.floor(waitMinutes / 60);
  const waitMins = waitMinutes % 60;
  
  return { 
    canCheckIn: false, 
    message: `Staff early check-in starts at ${GYM_OPENING_HOUR - 1}:30 AM (${waitHours > 0 ? `${waitHours}h ` : ''}${waitMins}m remaining)` 
  };
}

/**
 * Check if regular members can check in (gym is open)
 */
export function canMemberCheckIn(): { canCheckIn: boolean; message: string } {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Gym closes at 11 PM (23:00)
  const GYM_CLOSING_HOUR = 23;
  
  if (currentHour >= GYM_OPENING_HOUR && currentHour < GYM_CLOSING_HOUR) {
    return { canCheckIn: true, message: 'Gym is open' };
  }
  
  if (currentHour < GYM_OPENING_HOUR) {
    return { canCheckIn: false, message: `Gym opens at ${GYM_OPENING_HOUR}:00 AM` };
  }
  
  return { canCheckIn: false, message: 'Gym is closed for today' };
}

/**
 * Hook to check if the current user has staff or studio role.
 * Staff/Studio members get special privileges:
 * - No expiry date requirement (infinite access until disabled)
 * - Unlimited email changes
 * - Early check-in access (30 min before opening)
 * - Special perks
 * 
 * Studio users are class instructors.
 */
export function useStaffStatus(): StaffStatus {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [isStudio, setIsStudio] = useState(false);
  const [specialRole, setSpecialRole] = useState<SpecialRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user) {
        setIsStaff(false);
        setIsStudio(false);
        setSpecialRole(null);
        setLoading(false);
        return;
      }

      // Check for both staff and studio roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['staff', 'studio']);

      if (!error && data && data.length > 0) {
        const roles = data.map(r => r.role);
        const hasStaff = roles.includes('staff');
        const hasStudio = roles.includes('studio');
        
        setIsStaff(hasStaff);
        setIsStudio(hasStudio);
        
        // Priority: studio > staff for display purposes
        if (hasStudio) {
          setSpecialRole('studio');
        } else if (hasStaff) {
          setSpecialRole('staff');
        }
      } else {
        setIsStaff(false);
        setIsStudio(false);
        setSpecialRole(null);
      }
      setLoading(false);
    };

    checkStaffStatus();
  }, [user]);

  return { isStaff, isStudio, specialRole, loading };
}
