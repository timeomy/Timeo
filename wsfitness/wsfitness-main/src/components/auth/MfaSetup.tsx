import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Shield, ShieldCheck, ShieldOff, QrCode } from 'lucide-react';

interface MfaSetupProps {
  onComplete?: () => void;
}

export function MfaSetup({ onComplete }: MfaSetupProps) {
  const { enrollMfa, verifyMfa, unenrollMfa, getMfaFactors, role } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [enrolledFactors, setEnrolledFactors] = useState<any[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const isPrivilegedUser = role === 'admin' || role === 'it_admin';

  useEffect(() => {
    if (isPrivilegedUser) {
      loadFactors();
    }
  }, [isPrivilegedUser]);

  const loadFactors = async () => {
    const { factors } = await getMfaFactors();
    setEnrolledFactors(factors);
  };

  const handleEnrollMfa = async () => {
    setIsLoading(true);
    const { data, error } = await enrollMfa();
    setIsLoading(false);

    if (error) {
      toast.error('Failed to start MFA enrollment');
      return;
    }

    if (data && data.type === 'totp') {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setIsEnrolling(true);
    }
  };

  const handleVerifyMfa = async () => {
    if (!factorId || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    const { error } = await verifyMfa(verificationCode, factorId);
    setIsLoading(false);

    if (error) {
      toast.error('Invalid verification code');
      return;
    }

    toast.success('2FA enabled successfully!');
    setIsEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerificationCode('');
    await loadFactors();
    onComplete?.();
  };

  const handleRemoveMfa = async (id: string) => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setIsLoading(true);
    const { error } = await unenrollMfa(id);
    setIsLoading(false);

    if (error) {
      toast.error('Failed to disable 2FA');
      return;
    }

    toast.success('2FA disabled');
    await loadFactors();
  };

  if (!isPrivilegedUser) {
    return null;
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrolledFactors.length > 0 && !isEnrolling ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-500">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">2FA is enabled</span>
            </div>
            {enrolledFactors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{factor.friendly_name || 'Authenticator App'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMfa(factor.id)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <ShieldOff className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : isEnrolling ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCode && (
                <div className="flex justify-center mb-4">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg bg-white p-2" />
                </div>
              )}
              {secret && (
                <div className="bg-muted/50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                  <code className="text-sm font-mono break-all">{secret}</code>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter 6-digit code from app</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEnrolling(false);
                  setQrCode(null);
                  setSecret(null);
                  setFactorId(null);
                  setVerificationCode('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyMfa}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleEnrollMfa} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Enable 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}