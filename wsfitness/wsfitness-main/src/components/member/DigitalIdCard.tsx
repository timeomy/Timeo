import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, XCircle, RefreshCw, CreditCard, Shield, Lock } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface DigitalIdCardProps {
  memberId: string;
  userName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  membershipStatus: 'active' | 'expired';
  expiryDate?: string | null;
  planType?: string;
}

// AES-128 encryption key (must be exactly 16 chars)
const ENCRYPTION_KEY = 'wsfitness_secret';

/**
 * Generate encrypted QR payload:
 * - MemberID (8 chars, padded with '0' if needed) + Timestamp (8 hex chars) = 16 chars
 * - AES-128-ECB encrypted with NoPadding → exactly 32 hex chars output
 */
function generateEncryptedPayload(memberId: string): string {
  // Strip WS- prefix if present, then ensure exactly 8 chars
  const strippedId = memberId.toUpperCase().replace(/^WS-/, '');
  const cleanId = strippedId.padEnd(8, '0').slice(0, 8);
  
  // Get current timestamp in seconds, convert to 8-char hex
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const timestampHex = timestampSeconds.toString(16).toUpperCase().padStart(8, '0').slice(-8);
  
  // Combine: 8 + 8 = 16 chars (exactly 128 bits / 16 bytes for AES-128 block)
  const plaintext = cleanId + timestampHex;
  
  // Parse key as UTF-8 (must be exactly 16 chars for AES-128)
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  
  // Parse plaintext as UTF-8 for encryption
  const plaintextBytes = CryptoJS.enc.Utf8.parse(plaintext);
  
  // Encrypt with AES-128-ECB, NoPadding (input is exactly 16 bytes)
  const encrypted = CryptoJS.AES.encrypt(plaintextBytes, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  });
  
  // Convert to hex string (exactly 32 chars for 16-byte input with no padding)
  const hexOutput = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
  
  return hexOutput;
}

export function DigitalIdCard({
  memberId,
  userName,
  phoneNumber,
  avatarUrl,
  membershipStatus,
  expiryDate,
  planType = 'Standard',
}: DigitalIdCardProps) {
  const navigate = useNavigate();
  const isActive = membershipStatus === 'active';
  const [qrPayload, setQrPayload] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check if membership is actually expired based on expiry date
  const isExpired = useMemo(() => {
    if (!expiryDate) return membershipStatus === 'expired';
    const expiry = new Date(expiryDate);
    const now = new Date();
    // Set both to start of day for accurate comparison
    expiry.setHours(23, 59, 59, 999);
    return now > expiry;
  }, [expiryDate, membershipStatus]);

  // Generate encrypted QR payload and refresh every 30 seconds
  useEffect(() => {
    const generatePayload = () => {
      // Only generate if we have a valid member ID (at least 1 char) AND not expired
      if (memberId && memberId.trim().length > 0 && !isExpired) {
        const encrypted = generateEncryptedPayload(memberId);
        setQrPayload(encrypted);
        setLastRefresh(new Date());
      } else {
        // No member ID or expired - keep payload empty
        setQrPayload('');
      }
    };

    // Initial generation
    generatePayload();

    // Refresh every 30 seconds (only if active)
    if (!isExpired) {
      const interval = setInterval(generatePayload, 30000);
      return () => clearInterval(interval);
    }
  }, [memberId, isExpired]);

  const handleExpiredClick = () => {
    navigate('/member/profile?tab=billing');
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card to-muted border-0">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <CardContent className="p-6">
        {/* Header with status */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Member ID
          </span>
          {!isExpired ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          )}
        </div>

        {/* Profile section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-primary/50">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {!isExpired && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-display tracking-wide text-foreground">{userName}</h2>
            <p className="text-sm text-muted-foreground">{planType} Member</p>
          </div>
        </div>

        {/* Member ID Display - Hidden for expired members */}
        <div className="flex flex-col items-center mb-4">
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <CreditCard className="h-3 w-3" /> Member ID
          </span>
          {isExpired ? (
            <p className="font-mono text-lg font-medium text-muted-foreground tracking-wider">
              ••••••••
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-primary tracking-wider">
              {memberId || 'Not assigned'}
            </p>
          )}
        </div>

        {/* QR Code - Encrypted secure token ONLY */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className={`relative p-4 bg-[hsl(var(--qr-bg))] rounded-2xl ${isExpired ? 'cursor-pointer' : ''}`}
            onClick={isExpired ? handleExpiredClick : undefined}
          >
            <div className={isExpired ? 'filter blur-[12px] opacity-60' : ''}>
              {qrPayload && !isExpired ? (
                <QRCodeSVG
                  value={qrPayload}
                  size={140}
                  level="H"
                  includeMargin={false}
                  bgColor="hsl(var(--qr-bg))"
                  fgColor="hsl(var(--qr-fg))"
                />
              ) : (
                <div className="w-[140px] h-[140px] flex flex-col items-center justify-center gap-2 bg-muted/50">
                  {isExpired ? (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                  ) : (
                    <>
                      <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                      <span className="text-xs text-muted-foreground">Securing ID...</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Secure token label */}
          {!isExpired && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-emerald-500" />
              <span>Secure Dynamic ID (Updates every 30s)</span>
            </div>
          )}
        </div>

        {/* Expiry info */}
        {expiryDate && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {!isExpired ? 'Valid until' : 'Expired on'}
            </p>
            <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
              {new Date(expiryDate).toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Renew button for expired */}
        {isExpired && (
          <Button 
            className="w-full mt-4 bg-gradient-neon hover:opacity-90"
            onClick={handleExpiredClick}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Renew Membership
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
