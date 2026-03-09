import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuthEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'mfa_required'
  | 'mfa_verified'
  | 'membership_rejected'
  | 'membership_pending'
  | 'session_expired'
  | 'password_reset_requested'
  | 'signup_success';

interface LogAuthEventParams {
  userId?: string | null;
  email?: string;
  eventType: AuthEventType;
  reason?: string;
  metadata?: Json;
}

export async function logAuthEvent({
  userId,
  email,
  eventType,
  reason,
  metadata = {}
}: LogAuthEventParams): Promise<void> {
  try {
    await supabase.from('auth_events').insert([{
      user_id: userId || null,
      email: email || null,
      event_type: eventType,
      reason: reason || null,
      metadata,
      user_agent: navigator.userAgent,
    }]);
  } catch (error) {
    // Don't throw - logging should never break the auth flow
    console.error('Failed to log auth event:', error);
  }
}
