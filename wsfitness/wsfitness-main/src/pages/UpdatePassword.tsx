import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // MFA states
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isMfaLoading, setIsMfaLoading] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | WSFitness';

    let resolved = false;
    let cancelled = false;

    const resolveSession = (isValid: boolean) => {
      if (cancelled || resolved) return;
      resolved = true;
      setIsValidSession(isValid);
    };

    const cleanRecoveryParamsFromUrl = () => {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('token_hash');
      cleanUrl.searchParams.delete('type');
      cleanUrl.searchParams.delete('code');
      cleanUrl.hash = '';
      window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}`);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        resolveSession(true);
      }
    });

    const initializeRecoverySession = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
      const queryParams = url.searchParams;

      const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      const recoveryType = queryParams.get('type') || hashParams.get('type');
      const code = queryParams.get('code') || hashParams.get('code');

      if (tokenHash && recoveryType === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });

        if (error) {
          console.error('[UpdatePassword] verifyOtp failed:', error.message);
          resolveSession(false);
          return;
        }

        cleanRecoveryParamsFromUrl();
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[UpdatePassword] exchangeCodeForSession failed:', error.message);
          resolveSession(false);
          return;
        }

        cleanRecoveryParamsFromUrl();
      }

      const { data: { session } } = await supabase.auth.getSession();
      resolveSession(!!session);
    };

    initializeRecoverySession().catch((error) => {
      console.error('[UpdatePassword] initializeRecoverySession error:', error);
      resolveSession(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = passwordSchema.safeParse(newPassword);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsLoading(false);
      setIsValidSession(false);
      toast.error('Your recovery session is invalid or expired. Please request a new reset link.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setIsLoading(false);

    if (error) {
      // Check if AAL2 (MFA) is required
      if (error.message?.includes('AAL2') || error.code === 'insufficient_aal') {
        setShowMfaInput(true);
        toast.info('2FA verification required');
      } else {
        toast.error(error.message || 'Error updating password. Please try again.');
      }
    } else {
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }, 2000);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsMfaLoading(true);

    try {
      // Get MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError || !factorsData?.totp?.length) {
        toast.error('Could not retrieve MFA factors');
        setIsMfaLoading(false);
        return;
      }

      const factorId = factorsData.totp[0].id;

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      
      if (challengeError || !challengeData) {
        toast.error('Could not create MFA challenge');
        setIsMfaLoading(false);
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast.error('Invalid verification code');
        setMfaCode('');
        setIsMfaLoading(false);
        return;
      }

      // Now retry the password update with AAL2 session
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        toast.error(updateError.message || 'Error updating password');
        setIsMfaLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Password updated successfully!');
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }, 2000);

    } catch (err) {
      toast.error('An unexpected error occurred');
      setIsMfaLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm mt-3">Verifying reset link…</p>
      </div>
    );
  }

  // Invalid/expired session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
            <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-8 pb-6 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display tracking-wide">Invalid or Expired Link</h2>
                <p className="text-muted-foreground">
                  This password reset link is invalid or has expired. Please request a new reset link.
                </p>
              </div>

              <Button onClick={() => navigate('/auth')} className="w-full" size="lg">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
            <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-8 pb-6 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display tracking-wide">Password Updated!</h2>
                <p className="text-muted-foreground">
                  Your password has been successfully updated. Redirecting to login...
                </p>
              </div>

              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // MFA verification form
  if (showMfaInput) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
            <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
          </div>

          <Card className="glass border-border/50">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display tracking-wide">2FA Verification Required</CardTitle>
              <CardDescription className="text-muted-foreground">
                This account is protected by 2FA. Please enter your code from your Authenticator App to confirm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">Verification Code</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isMfaLoading || mfaCode.length !== 6}
                >
                  {isMfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Update Password'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowMfaInput(false);
                    setMfaCode('');
                  }}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password update form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
          <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-display tracking-wide">Reset Your Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter a new password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
