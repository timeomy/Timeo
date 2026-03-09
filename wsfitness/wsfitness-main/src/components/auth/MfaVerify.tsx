import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface MfaVerifyProps {
  onSuccess: () => void;
}

export function MfaVerify({ onSuccess }: MfaVerifyProps) {
  const { verifyMfa, getMfaFactors, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    loadFactor();
  }, []);

  const loadFactor = async () => {
    const { factors } = await getMfaFactors();
    if (factors.length > 0) {
      setFactorId(factors[0].id);
    }
  };

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    const { error } = await verifyMfa(code, factorId);
    setIsLoading(false);

    if (error) {
      toast.error('Invalid verification code');
      setCode('');
      return;
    }

    toast.success('Verified successfully!');
    onSuccess();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={wsfitnessLogo} alt="WS Fitness" className="h-12 w-12 rounded-xl" />
          <h1 className="text-4xl font-display text-gradient">WS FITNESS</h1>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display tracking-wide">Verify Your Identity</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign out and use a different account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}