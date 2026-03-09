import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GymHours {
  session1_start: string;
  session1_end: string;
  session2_start: string;
  session2_end: string;
  staff_early_minutes: number;
  loading: boolean;
}

const DEFAULT_SESSION1_START = '07:30';
const DEFAULT_SESSION1_END = '12:00';
const DEFAULT_SESSION2_START = '14:00';
const DEFAULT_SESSION2_END = '22:00';
const DEFAULT_STAFF_EARLY = 30;

/**
 * Hook to fetch gym operating hours from company settings (split shift format)
 */
export function useGymHours(): GymHours {
  const [hours, setHours] = useState<GymHours>({
    session1_start: DEFAULT_SESSION1_START,
    session1_end: DEFAULT_SESSION1_END,
    session2_start: DEFAULT_SESSION2_START,
    session2_end: DEFAULT_SESSION2_END,
    staff_early_minutes: DEFAULT_STAFF_EARLY,
    loading: true,
  });

  useEffect(() => {
    const fetchHours = async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('session1_start, session1_end, session2_start, session2_end, staff_early_minutes')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setHours({
          session1_start: data.session1_start ?? DEFAULT_SESSION1_START,
          session1_end: data.session1_end ?? DEFAULT_SESSION1_END,
          session2_start: data.session2_start ?? DEFAULT_SESSION2_START,
          session2_end: data.session2_end ?? DEFAULT_SESSION2_END,
          staff_early_minutes: data.staff_early_minutes ?? DEFAULT_STAFF_EARLY,
          loading: false,
        });
      } else {
        setHours(prev => ({ ...prev, loading: false }));
      }
    };

    fetchHours();
  }, []);

  return hours;
}

/**
 * Parse time string (HH:MM) to total minutes
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Check if staff can check in early based on configurable hours
 */
export function canStaffCheckInEarlyWithHours(
  session1Start: string,
  staffEarlyMinutes: number
): { canCheckIn: boolean; message: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinutes;
  
  const session1StartMinutes = parseTimeToMinutes(session1Start);
  const staffEarlyTime = session1StartMinutes - staffEarlyMinutes;
  
  if (currentTotalMinutes >= staffEarlyTime) {
    return { canCheckIn: true, message: 'Staff early access granted' };
  }
  
  const waitMinutes = staffEarlyTime - currentTotalMinutes;
  const waitHours = Math.floor(waitMinutes / 60);
  const waitMins = waitMinutes % 60;
  
  const earlyHour = Math.floor(staffEarlyTime / 60);
  const earlyMin = staffEarlyTime % 60;
  const earlyTimeStr = formatTime24To12(`${earlyHour}:${earlyMin.toString().padStart(2, '0')}`);
  
  return { 
    canCheckIn: false, 
    message: `Staff early check-in starts at ${earlyTimeStr} (${waitHours > 0 ? `${waitHours}h ` : ''}${waitMins}m remaining)` 
  };
}

/**
 * Check if regular members can check in based on split shift hours
 */
export function canMemberCheckInWithHours(
  session1Start: string,
  session1End: string,
  session2Start: string,
  session2End: string
): { canCheckIn: boolean; message: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinutes;
  
  const s1Start = parseTimeToMinutes(session1Start);
  const s1End = parseTimeToMinutes(session1End);
  const s2Start = parseTimeToMinutes(session2Start);
  const s2End = parseTimeToMinutes(session2End);
  
  // Check if in session 1
  if (currentTotalMinutes >= s1Start && currentTotalMinutes < s1End) {
    return { canCheckIn: true, message: 'Gym is open (Morning session)' };
  }
  
  // Check if in session 2
  if (currentTotalMinutes >= s2Start && currentTotalMinutes < s2End) {
    return { canCheckIn: true, message: 'Gym is open (Afternoon session)' };
  }
  
  // In rest period between sessions
  if (currentTotalMinutes >= s1End && currentTotalMinutes < s2Start) {
    return { 
      canCheckIn: false, 
      message: `Rest period. Afternoon session starts at ${formatTime24To12(session2Start)}` 
    };
  }
  
  // Before opening
  if (currentTotalMinutes < s1Start) {
    return { canCheckIn: false, message: `Gym opens at ${formatTime24To12(session1Start)}` };
  }
  
  // After closing
  return { canCheckIn: false, message: 'Gym is closed for today' };
}

/**
 * Check if a time slot is during the rest period
 */
export function isRestPeriod(
  timeSlot: string,
  session1End: string,
  session2Start: string
): boolean {
  const slotMinutes = parseTimeToMinutes(timeSlot);
  const s1End = parseTimeToMinutes(session1End);
  const s2Start = parseTimeToMinutes(session2Start);
  
  return slotMinutes >= s1End && slotMinutes < s2Start;
}

/**
 * Format 24h time string to 12h format with AM/PM
 */
export function formatTime24To12(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
}

/**
 * Format hour to 12h format with AM/PM (legacy support)
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}
