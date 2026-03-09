import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthMFAEnrollResponse, AuthMFAChallengeResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAuthEvent } from './authEventLogger';

function withTimeout<T>(promiseLike: PromiseLike<T> | Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: number | undefined;

  // Supabase query builders are thenables (PromiseLike) but not real Promises.
  // Promise.resolve() converts them into a real Promise so we can safely use finally().
  const promise = Promise.resolve(promiseLike as any) as Promise<T>;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms: ${label}`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

type AppRole = 'admin' | 'coach' | 'it_admin' | 'member' | 'vendor' | 'staff' | 'studio' | 'day_pass' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  isItAdmin: boolean;
  isAdmin: boolean; // true for both admin and it_admin
  requiresMfa: boolean;
  mfaVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresMfa?: boolean; isPendingApproval?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enrollMfa: () => Promise<{ data: AuthMFAEnrollResponse['data']; error: Error | null }>;
  verifyMfa: (code: string, factorId: string) => Promise<{ error: Error | null }>;
  unenrollMfa: (factorId: string) => Promise<{ error: Error | null }>;
  getMfaFactors: () => Promise<{ factors: any[]; error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [isItAdmin, setIsItAdmin] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  // IT Admin has all Admin permissions, so isAdmin = true for both admin and it_admin
  const isAdmin = role === 'admin' || role === 'it_admin';

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await withTimeout(
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId),
      6000,
      'fetchUserRoles',
    );
    
    if (error) {
      console.error('Error fetching roles:', error);
      return { role: null, isItAdmin: false };
    }
    
    const roles = data?.map(r => r.role) || [];
    const hasItAdmin = roles.includes('it_admin');
    const hasAdmin = roles.includes('admin');
    const hasStaff = roles.includes('staff');
    const hasCoach = roles.includes('coach');
    const hasStudio = roles.includes('studio');
    const hasVendor = roles.includes('vendor');
    const hasMember = roles.includes('member');
    const hasDayPass = roles.includes('day_pass');
    // Priority: it_admin > admin > coach > studio > staff > vendor > member > day_pass
    const primaryRole = hasItAdmin ? 'it_admin' : hasAdmin ? 'admin' : hasCoach ? 'coach' : hasStudio ? 'studio' : hasStaff ? 'staff' : hasVendor ? 'vendor' : hasMember ? 'member' : hasDayPass ? 'day_pass' : null;
    
    return { role: primaryRole as AppRole, isItAdmin: hasItAdmin, hasAdmin: hasAdmin || hasItAdmin };
  };

  const checkMfaRequired = async () => {
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (factorsError || aalError) {
        console.warn('MFA check error:', factorsError || aalError);
        return { needsVerification: false, isVerified: false, hasEnrolledFactors: false };
      }

      const hasEnrolledFactors = !!(factors?.totp && factors.totp.length > 0);
      const needsVerification = hasEnrolledFactors && aal?.currentLevel !== 'aal2';
      const isVerified = aal?.currentLevel === 'aal2';

      return { needsVerification, isVerified, hasEnrolledFactors };
    } catch (e) {
      console.warn('MFA check exception:', e);
      return { needsVerification: false, isVerified: false, hasEnrolledFactors: false };
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;
    // Track the current user ID to prevent duplicate processing
    let currentProcessedUserId: string | null = null;
    // Track if we're currently processing to prevent race conditions
    let isProcessing = false;
    // Store the current role to prevent clearing on transient errors
    let cachedRole: AppRole = null;
    let cachedIsItAdmin = false;

    const applySession = async (nextSession: Session | null, isInitialLoad = false) => {
      // Prevent concurrent processing which causes flicker
      if (isProcessing && !isInitialLoad) {
        return;
      }
      
      const nextUserId = nextSession?.user?.id ?? null;
      
      // Skip if we've already processed this exact user (prevents duplicate work)
      if (!isInitialLoad && initialLoadDone && currentProcessedUserId === nextUserId && nextUserId !== null) {
        // Just update session object silently - don't refetch roles
        if (mounted) setSession(nextSession);
        return;
      }

      isProcessing = true;
      
      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (!nextSession?.user) {
          setRole(null);
          setIsItAdmin(false);
          setRequiresMfa(false);
          setMfaVerified(false);
          currentProcessedUserId = null;
          cachedRole = null;
          cachedIsItAdmin = false;
          return;
        }

        currentProcessedUserId = nextSession.user.id;

        const { role: userRole, isItAdmin: userIsItAdmin } = await withTimeout(
          fetchUserRoles(nextSession.user.id),
          6500,
          'fetchUserRoles(applySession)',
        );
        if (!mounted) return;

        // Cache the role for error recovery
        cachedRole = userRole;
        cachedIsItAdmin = userIsItAdmin;

        setRole(userRole);
        setIsItAdmin(userIsItAdmin);

        // MFA check only for admin/it_admin
        if (userRole === 'admin' || userRole === 'it_admin') {
          const { needsVerification, isVerified } = await withTimeout(
            checkMfaRequired(),
            6500,
            'checkMfaRequired',
          );
          if (!mounted) return;
          setRequiresMfa(needsVerification);
          setMfaVerified(isVerified);
        } else {
          setRequiresMfa(false);
          setMfaVerified(false);
        }
      } catch (e) {
        console.error('Auth init/applySession error:', e);
        // On error, preserve cached role if we have one (prevents logout on transient errors)
        // Only clear role if this is initial load or we have no cached role
        if (isInitialLoad || !cachedRole) {
          setRole(null);
          setIsItAdmin(false);
          setRequiresMfa(false);
          setMfaVerified(false);
        }
        // If we have a cached role, keep using it - don't log the user out on transient errors
      } finally {
        isProcessing = false;
        if (mounted && isInitialLoad) {
          setLoading(false);
          initialLoadDone = true;
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        // Ignore these events entirely to prevent flicker and unwanted logouts
        // TOKEN_REFRESHED: Background token renewal
        // INITIAL_SESSION: Fires after getSession, causes duplicate processing
        // USER_UPDATED: Fires when ANY user is updated (including other users), not relevant to current session
        // PASSWORD_RECOVERY: Only relevant for password reset flow
        if (
          event === 'TOKEN_REFRESHED' || 
          event === 'INITIAL_SESSION' || 
          event === 'USER_UPDATED' ||
          event === 'PASSWORD_RECOVERY'
        ) {
          // Just update session silently without full reprocessing
          if (mounted && nextSession) {
            setSession(nextSession);
          }
          return;
        }
        
        // For SIGNED_OUT, clear state immediately without async operations
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setIsItAdmin(false);
            setRequiresMfa(false);
            setMfaVerified(false);
            currentProcessedUserId = null;
            cachedRole = null;
            cachedIsItAdmin = false;
          }
          return;
        }

        // For SIGNED_IN after initial load, only process if user actually changed
        if (event === 'SIGNED_IN' && initialLoadDone) {
          const nextUserId = nextSession?.user?.id;
          if (nextUserId && currentProcessedUserId === nextUserId) {
            // Same user signing in again - just update session, don't refetch roles
            if (mounted) setSession(nextSession);
            return;
          }
        }
        
        await applySession(nextSession, !initialLoadDone);
      }
    );

    // THEN check for existing session
    withTimeout(supabase.auth.getSession(), 6500, 'getSession')
      .then(async ({ data: { session: existing } }) => {
        await applySession(existing, true);
      })
      .catch((e) => {
        console.error('getSession error:', e);
        if (mounted) setLoading(false);
        initialLoadDone = true;
      });

    // Handle browser/tab close for session-only logins
    const handleBeforeUnload = () => {
      const isSessionOnly = sessionStorage.getItem('ws_session_only') === 'true';
      if (isSessionOnly) {
        // Clear the stored session so it won't persist
        localStorage.removeItem('sb-vbeygycoopxwmvjtxdyp-auth-token');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Clear any stale MFA state before attempting a new login.
    // Otherwise a previous admin login can leave the app stuck redirecting to /auth.
    setRequiresMfa(false);
    setMfaVerified(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // Log failed login attempt
      logAuthEvent({
        email,
        eventType: 'login_failed',
        reason: error.message,
      });
      return { error };
    }

    let isAdminRoleForThisLogin = false;
    let userRole: string | null = null;
    
    if (data.user) {
      // Fetch role and membership status in parallel for faster login
      const [roleResult, membershipResult] = await Promise.all([
        fetchUserRoles(data.user.id),
        supabase
          .from('memberships')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle()
      ]);
      
      userRole = roleResult.role;
      isAdminRoleForThisLogin = userRole === 'admin' || userRole === 'it_admin';
      
      // Check if this is a member or day_pass with rejected status
      if (userRole === 'member' || userRole === 'day_pass') {
        if (membershipResult.data?.status === 'rejected') {
          // Log rejected membership
          logAuthEvent({
            userId: data.user.id,
            email,
            eventType: 'membership_rejected',
            reason: 'Membership application was rejected',
            metadata: { role: userRole, status: 'rejected' },
          });
          await supabase.auth.signOut({ scope: 'local' });
          return { 
            error: new Error('Your membership application has been rejected. Please contact management for more information.')
          };
        }
      }
      
      // Log the login in background (don't await - fire and forget)
      supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .maybeSingle()
        .then(({ data: profileData }) => {
          supabase.from('login_logs').insert({
            user_id: data.user!.id,
            user_name: profileData?.name || email,
            role: userRole || 'unknown',
          });
        });
    }
    
    // Check if MFA is required
    // IMPORTANT: MFA gating is only enforced for admin/it_admin.
    // If we set requiresMfa for non-admins, ProtectedRoute will bounce them back to /auth
    // immediately after login, which looks like an automatic logout.
    if (data.session && isAdminRoleForThisLogin) {
      const { needsVerification } = await checkMfaRequired();
      if (needsVerification) {
        // Log MFA required event
        logAuthEvent({
          userId: data.user?.id,
          email,
          eventType: 'mfa_required',
          reason: 'Admin/IT Admin login requires MFA verification',
          metadata: { role: userRole },
        });
        setRequiresMfa(true);
        return { error: null, requiresMfa: true };
      }
    }

    // Log successful login
    logAuthEvent({
      userId: data.user?.id,
      email,
      eventType: 'login_success',
      metadata: { role: userRole || 'unknown' },
    });
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error };
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    const currentEmail = user?.email;
    
    // Clear local state FIRST so UI updates immediately
    setSession(null);
    setUser(null);
    setRole(null);
    setIsItAdmin(false);
    setRequiresMfa(false);
    setMfaVerified(false);

    // Log logout event (before clearing session)
    if (currentUserId) {
      logAuthEvent({
        userId: currentUserId,
        email: currentEmail,
        eventType: 'logout',
        reason: 'User initiated logout',
      });
    }

    try {
      // Try global signout first, fall back to local if it fails
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        // If global fails, try local signout
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (e) {
      // If all signout attempts fail, still keep state cleared
      console.error('Signout error:', e);
    }
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App'
    });
    return { data, error };
  };

  const verifyMfa = async (code: string, factorId: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId
    });
    
    if (challengeError) return { error: challengeError };
    
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });
    
    if (!verifyError) {
      setMfaVerified(true);
      setRequiresMfa(false);
      
      // Log successful MFA verification
      logAuthEvent({
        userId: user?.id,
        email: user?.email,
        eventType: 'mfa_verified',
        reason: 'MFA verification successful',
      });
    }
    
    return { error: verifyError };
  };

  const unenrollMfa = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (!error) {
      setMfaVerified(false);
    }
    return { error };
  };

  const getMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    return { factors: data?.totp || [], error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      loading, 
      isItAdmin, 
      isAdmin,
      requiresMfa,
      mfaVerified,
      signIn, 
      signUp, 
      signOut,
      enrollMfa,
      verifyMfa,
      unenrollMfa,
      getMfaFactors
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
