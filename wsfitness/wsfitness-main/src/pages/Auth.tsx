import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, KeyRound, ArrowLeft, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';
import { MfaVerify } from '@/components/auth/MfaVerify';
import { PostLoginTransition } from '@/components/auth/PostLoginTransition';
import { getPortalRouteForRoles } from '@/lib/portalRouting';
import { SYSTEM_VERSION } from '@/lib/version';

const WAIVER_TEXT = `I confirm that I am the participant, or the parent/legal guardian of the participant, and that the participant is physically and mentally fit to participate in fitness activities, including the use of gym facilities, group classes, and personal training. Any relevant medical conditions have been disclosed to the trainers. I voluntarily accept all risks associated with exercise and agree to release and hold harmless WORKOUT STATION FITNESS, its directors, management, and employees from any liability for injury, loss, or damage. I accept full responsibility for any injury or damage suffered by the participant or caused to others and agree to indemnify the gym against any related claims. By proceeding, I confirm that I am at least 18 years old and legally authorized to accept this waiver on my own behalf or on behalf of the minor participant.`;

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  inviteCode: z.string().min(1, 'Invite code is required').max(50, 'Invalid invite code'),
  waiverAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the waiver to continue' }) }),
  signatureName: z.string().min(2, 'Please type your full name to sign'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading, requiresMfa } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    inviteCode: '',
    waiverAccepted: false,
    signatureName: ''
  });

  useEffect(() => {
    document.title = 'Login | WSFitness';
  }, []);

  const routeUserToPortal = useCallback(async (userId?: string) => {
    const id = userId ?? user?.id;

    if (!id) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id);

    const roleList = roles?.map((r) => r.role) || [];
    const target = getPortalRouteForRoles(roleList, { fallbackToAdmin: true });
    navigate(target, { replace: true });
  }, [navigate, user?.id]);

  useEffect(() => {
    if (user && !requiresMfa && !showRegistrationSuccess) {
      routeUserToPortal(user.id);
    }
  }, [user, requiresMfa, routeUserToPortal, showRegistrationSuccess]);

  // Show transition screen while routing after successful login
  if (isTransitioning) {
    return <PostLoginTransition />;
  }

  if (user && requiresMfa) {
    return <MfaVerify onSuccess={() => routeUserToPortal(user.id)} />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    
    // Store remember me preference before login
    if (!rememberMe) {
      // When "Remember me" is unchecked, session should expire on browser close
      // We'll clear the session from localStorage after login and rely on the in-memory session
      sessionStorage.setItem('ws_session_only', 'true');
    } else {
      sessionStorage.removeItem('ws_session_only');
    }
    
    const { error, requiresMfa: needsMfa } = await signIn(loginData.email, loginData.password);

    if (error) {
      setIsLoading(false);
      toast.error(error.message);
      return;
    }

    // If MFA is required, stop here - the useEffect will handle MFA screen
    if (needsMfa) {
      setIsLoading(false);
      return;
    }

    // Show transition screen while we resolve roles and route
    setIsTransitioning(true);
    setIsLoading(false);

    // Get user directly from supabase to ensure we have the latest data
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    if (userId) {
      toast.success('Welcome back!');
      await routeUserToPortal(userId);
    } else {
      // Fallback: wait briefly for auth state to propagate
      toast.success('Welcome back!');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 800);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    // Validate invite code first
    const { data: isValidCode, error: codeError } = await supabase
      .rpc('use_invite_code', { input_code: signupData.inviteCode });

    if (codeError || !isValidCode) {
      setIsLoading(false);
      toast.error('Invalid or expired invite code');
      return;
    }

    const { error } = await signUp(signupData.email, signupData.password, signupData.name);

    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Wait a brief moment for auth state to stabilize before updating profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with waiver data
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from('profiles')
        .update({
          waiver_signed_at: new Date().toISOString(),
          waiver_signature_name: signupData.signatureName
        })
        .eq('id', userData.user.id);
    }

    setIsLoading(false);
    // Show success screen - this prevents the automatic routing
    setShowRegistrationSuccess(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!normalizedEmail || !z.string().email().safeParse(normalizedEmail).success) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use custom backend function for branded password reset emails
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: normalizedEmail,
          redirectTo: `${window.location.origin}/update-password`,
        }
      });

      if (error) {
        // Handle rate limiting
        if (error.message?.toLowerCase().includes('rate limit')) {
          toast.error('Please wait 60 seconds before trying again.');
        } else {
          toast.error(error.message || 'Failed to send reset email');
        }
      } else if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        toast.error((data as { message?: string }).message || 'Failed to send reset email');
      } else {
        toast.success('If an account exists for this email, you will receive a reset link shortly. Please check your Spam/Junk folder.', {
          duration: 6000,
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    setShowRegistrationSuccess(false);
    setSignupData({ email: '', password: '', name: '', inviteCode: '', waiverAccepted: false, signatureName: '' });
  };

  const isSignupDisabled = isLoading || !signupData.waiverAccepted || !signupData.signatureName.trim();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img src={wsfitnessLogo} alt="WS Fitness" className="h-16 w-16 rounded-xl" />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Registration Success Screen
  if (showRegistrationSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
            <div className="flex flex-col items-center">
              <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
              <span className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase">powered by WS | OXLOZ</span>
            </div>
          </div>
          <Card className="glass border-border/50">
            <CardContent className="pt-8 pb-6 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display tracking-wide">Registration Complete!</h2>
                <p className="text-muted-foreground">
                  Thank you for signing the waiver. Your account is now <span className="text-primary font-semibold">Active</span>! You can now log in and purchase a membership plan.
                </p>
              </div>

              <Button onClick={handleBackToLogin} className="w-full" size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Login Now
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            WSFitness Ecosystem {SYSTEM_VERSION}
          </p>
        </div>
      </div>
    );
  }

  // Forgot Password Screen
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
            <div className="flex flex-col items-center">
              <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
              <span className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase">powered by WS | OXLOZ</span>
            </div>
          </div>
          <Card className="glass border-border/50">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-display tracking-wide">Reset Password</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your email to receive a reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            WSFitness Ecosystem {SYSTEM_VERSION}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      {/* Background glow effect - z-index -1 ensures it's behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
            <span className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase">powered by WS | OXLOZ</span>
          </div>
        </div>
        <Card className="glass border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-display tracking-wide">Welcome</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try {
                        // Sign out any stale session
                        await supabase.auth.signOut({ scope: 'local' });
                        // Clear all local/session storage
                        localStorage.clear();
                        sessionStorage.clear();
                        toast.success('Cache cleared. Please try logging in again.');
                        // Reload to reset all in-memory state
                        window.location.reload();
                      } catch {
                        toast.error('Failed to clear cache');
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Clear Cache & Fix Login Issues
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-invite" className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Invite Code
                    </Label>
                    <Input
                      id="signup-invite"
                      type="text"
                      placeholder="Enter your invite code"
                      value={signupData.inviteCode}
                      onChange={(e) => setSignupData({ ...signupData, inviteCode: e.target.value.toUpperCase() })}
                      required
                      className="uppercase tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground">Contact your admin for an invite code</p>
                  </div>

                  {/* Waiver Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Waiver & Release of Liability
                    </div>
                    
                    <ScrollArea className="h-32 rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {WAIVER_TEXT}
                      </p>
                    </ScrollArea>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="waiver-accept"
                        checked={signupData.waiverAccepted}
                        onCheckedChange={(checked) => 
                          setSignupData({ ...signupData, waiverAccepted: checked === true })
                        }
                        className="mt-0.5"
                      />
                      <Label htmlFor="waiver-accept" className="text-sm leading-tight cursor-pointer">
                        I have read, understood, and agree to the Waiver & Release of Liability
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signature-name" className="text-sm">
                        Type Full Name to Sign
                      </Label>
                      <Input
                        id="signature-name"
                        type="text"
                        placeholder="Your full legal name"
                        value={signupData.signatureName}
                        onChange={(e) => setSignupData({ ...signupData, signatureName: e.target.value })}
                        className="font-medium italic"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSignupDisabled}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          WSFitness Ecosystem {SYSTEM_VERSION}
        </p>
      </div>
    </div>
  );
}
