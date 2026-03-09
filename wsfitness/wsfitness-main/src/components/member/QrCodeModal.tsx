import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, RefreshCw, CheckCircle, XCircle, Lock } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  userName: string;
  membershipStatus: 'active' | 'expired';
  expiryDate?: string | null;
  validFrom?: string | null;
  isStaff?: boolean;
  isStudio?: boolean;
}

const ENCRYPTION_KEY = 'wsfitness_secret';

function generateEncryptedPayload(memberId: string): string {
  const cleanId = memberId.toUpperCase().padEnd(8, '0').slice(0, 8);
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const timestampHex = timestampSeconds.toString(16).toUpperCase().padStart(8, '0').slice(-8);
  const plaintext = cleanId + timestampHex;
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  const plaintextBytes = CryptoJS.enc.Utf8.parse(plaintext);
  const encrypted = CryptoJS.AES.encrypt(plaintextBytes, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
}

export function QrCodeModal({
  open,
  onOpenChange,
  memberId,
  userName,
  membershipStatus,
  expiryDate,
  validFrom,
  isStaff = false,
  isStudio = false,
}: QrCodeModalProps) {
  const navigate = useNavigate();
  const [qrPayload, setQrPayload] = useState<string>('');
  
  // Either staff or studio gets special access (no expiry)
  const hasSpecialAccess = isStaff || isStudio;

  // Check if membership has started (for future day passes)
  const hasStarted = useMemo(() => {
    if (hasSpecialAccess) return true;
    if (!validFrom) return true; // No valid_from means already active
    
    const startDate = new Date(validFrom);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today >= startDate;
  }, [validFrom, hasSpecialAccess]);

  // CRITICAL: Check expiry by comparing actual date, not just status string
  const isExpired = useMemo(() => {
    // Staff/Studio are never expired
    if (hasSpecialAccess) return false;
    
    // Check actual expiry date first (most reliable)
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      // Set expiry to end of day for fair comparison
      expiry.setHours(23, 59, 59, 999);
      return now > expiry;
    }
    
    // Fallback to status string only if no expiry date
    return membershipStatus === 'expired';
  }, [expiryDate, membershipStatus, hasSpecialAccess]);

  // Not valid if not started OR expired
  const isNotValid = !hasStarted || isExpired;

  const isActive = hasStarted && !isExpired;

  useEffect(() => {
    if (!open) return;

    const generatePayload = () => {
      // Don't generate QR for expired OR not-yet-started users
      if (isNotValid) {
        setQrPayload('');
        return;
      }
      
      if (memberId && memberId.trim().length > 0) {
        const encrypted = generateEncryptedPayload(memberId);
        setQrPayload(encrypted);
      } else {
        setQrPayload('');
      }
    };

    generatePayload();
    
    // Only refresh if valid
    if (!isNotValid) {
      const interval = setInterval(generatePayload, 30000);
      return () => clearInterval(interval);
    }
  }, [memberId, open, isNotValid]);

  const handleRenew = () => {
    onOpenChange(false);
    navigate('/member/profile?tab=billing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl tracking-wide">
            Your Member ID
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          {/* Status Badge */}
          {isStudio ? (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Studio Instructor
            </Badge>
          ) : isStaff ? (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Shield className="h-3 w-3 mr-1" />
              Staff Member
            </Badge>
          ) : !hasStarted ? (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Scheduled
            </Badge>
          ) : isActive ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active Member
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          )}

          {/* Member ID Display - Hidden for expired/not-started members */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <CreditCard className="h-3 w-3" /> Member ID
            </span>
            {isNotValid ? (
              <p className="font-mono text-2xl font-medium text-muted-foreground tracking-wider">
                ••••••••
              </p>
            ) : (
              <p className="font-mono text-2xl font-bold text-primary tracking-wider">
                {memberId || 'Not assigned'}
              </p>
            )}
          </div>

          {/* QR Code with Blur for Expired or Not Started */}
          <div 
            className={`p-5 bg-[hsl(var(--qr-bg))] rounded-2xl shadow-[0_0_30px_hsl(var(--primary)/0.3)] ${isNotValid ? 'cursor-pointer' : ''}`}
            onClick={isNotValid && isExpired ? handleRenew : undefined}
          >
            <div className={isNotValid ? 'filter blur-[12px] opacity-60' : ''}>
              {qrPayload && !isNotValid ? (
                <QRCodeSVG
                  value={qrPayload}
                  size={180}
                  level="H"
                  includeMargin={false}
                  bgColor="hsl(var(--qr-bg))"
                  fgColor="hsl(var(--qr-fg))"
                />
              ) : (
                <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-2">
                  {isNotValid ? (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                  ) : (
                    <>
                      <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                      <span className="text-sm text-muted-foreground">Securing ID...</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Secure token label - only show when active */}
          {isActive && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secure Dynamic ID • Refreshes every 30s</span>
            </div>
          )}

          {/* Info for scheduled passes */}
          {!hasStarted && validFrom && (
            <div className="text-center space-y-2">
              <p className="text-sm text-amber-400">
                Your Day Pass is scheduled for
              </p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(validFrom).toLocaleDateString('en-MY', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Your QR code will activate on this date
              </p>
            </div>
          )}

          {/* Renew Button for Expired */}
          {isExpired ? (
            <Button 
              className="w-full bg-gradient-neon hover:opacity-90"
              onClick={handleRenew}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Renew Membership
            </Button>
          ) : isActive ? (
            <p className="text-xs text-center text-muted-foreground max-w-xs">
              Show this QR code at the gym entrance for quick access
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
