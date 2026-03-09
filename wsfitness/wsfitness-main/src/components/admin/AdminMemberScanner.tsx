import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  X, 
  Loader2, 
  Camera, 
  User,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface MemberData {
  id: string;
  name: string;
  avatar_url: string | null;
  plan_type: string;
  expiry_date: string | null;
}

interface ScanResult {
  status: 'success' | 'denied' | 'error';
  member?: MemberData;
  message: string;
  code?: string;
}

export function AdminMemberScanner() {
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Start camera with explicit user interaction (fixes iOS permission issues)
  const startCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraReady(true);
      setScanning(true);
      setScanResult(null);
    } catch (error) {
      toast.error('Camera permission denied. Please allow camera access.');
    }
  };

  useEffect(() => {
    if (scanning && cameraReady) {
      const scannerId = 'admin-member-scanner';
      
      // Cleanup any existing scanner
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }

      scannerRef.current = new Html5Qrcode(scannerId);
      
      scannerRef.current.start(
        { facingMode: 'environment' },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Stop scanner first
          stopScanner();
          // Process the scanned code
          await handleScan(decodedText);
        },
        () => {
          // Ignore scan errors (no QR found)
        }
      ).catch((err) => {
        console.error('Scanner start error:', err);
        toast.error('Failed to start camera');
        setScanning(false);
        setCameraReady(false);
      });

      // Add playsinline attribute for iOS
      setTimeout(() => {
        const videoElement = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
        if (videoElement) {
          videoElement.setAttribute('playsinline', 'true');
          videoElement.setAttribute('webkit-playsinline', 'true');
        }
      }, 100);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning, cameraReady]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
    setCameraReady(false);
  };

  const handleScan = async (decodedText: string) => {
    const trimmedCode = decodedText.trim().toUpperCase();
    console.log('Admin scanner: received code', trimmedCode, 'length:', trimmedCode.length);
    
    setVerifying(true);

    try {
      // Check if it's a 32-char hex string (encrypted) or 8-char hex string (legacy)
      const isEncrypted = /^[0-9A-F]{32}$/.test(trimmedCode);
      const isLegacy = /^[0-9A-F]{8}$/.test(trimmedCode);

      if (isEncrypted || isLegacy) {
        // Call the check-access edge function
        console.log('Admin scanner: calling check-access API with', trimmedCode);
        
        const { data, error } = await supabase.functions.invoke('check-access', {
          body: { id: trimmedCode }
        });

        console.log('Admin scanner: API response', data, error);

        if (error) {
          throw new Error(error.message || 'API call failed');
        }

        if (data.access) {
          // Access granted
          setScanResult({
            status: 'success',
            member: data.member,
            message: `Welcome, ${data.member.name}!`,
          });
          toast.success(`Access Granted: ${data.member.name}`);
        } else {
          // Access denied
          setScanResult({
            status: 'denied',
            message: data.error || 'Access Denied',
            code: data.code,
          });
          toast.error(data.error || 'Access Denied');
        }
      } else {
        // Unknown format
        setScanResult({
          status: 'error',
          message: 'Invalid QR code format. Expected encrypted token or member ID.',
          code: 'INVALID_FORMAT',
        });
        toast.error('Invalid QR code format');
      }
    } catch (error: any) {
      console.error('Admin scanner error:', error);
      setScanResult({
        status: 'error',
        message: error.message || 'Failed to verify access',
        code: 'ERROR',
      });
      toast.error(error.message || 'Failed to verify access');
    } finally {
      setVerifying(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerifying(false);
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Member Access Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verifying ? (
          // Verifying state
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Verifying Secure Token...</p>
          </div>
        ) : scanResult ? (
          // Result display
          <div className="space-y-4">
            {scanResult.status === 'success' && scanResult.member ? (
              // Access Granted
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-emerald-500">
                      <AvatarImage src={scanResult.member.avatar_url || undefined} />
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-500">
                        <User className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <Badge className="bg-emerald-500 text-white mb-2">ACCESS GRANTED</Badge>
                  <h3 className="text-xl font-display text-foreground">{scanResult.member.name}</h3>
                  <p className="text-sm text-muted-foreground">{scanResult.member.plan_type} Member</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Valid until: {scanResult.member.expiry_date 
                      ? new Date(scanResult.member.expiry_date).toLocaleDateString('en-MY') 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              // Access Denied
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-destructive/20 rounded-full p-4">
                    <XCircle className="h-12 w-12 text-destructive" />
                  </div>
                </div>
                <div>
                  <Badge variant="destructive" className="mb-2">ACCESS DENIED</Badge>
                  <p className="text-lg font-medium text-foreground">{scanResult.message}</p>
                  {scanResult.code && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Error Code: {scanResult.code}
                    </p>
                  )}
                </div>
                {scanResult.code === 'QR_EXPIRED' && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Ask member to refresh their QR code</span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={resetScanner}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan Another
            </Button>
          </div>
        ) : scanning ? (
          // Scanner active
          <div className="space-y-3">
            {/* Hide scanner library watermarks */}
            <style>{`
              #admin-member-scanner img[alt*="Info"],
              #admin-member-scanner a,
              #admin-member-scanner__dashboard_section_swaplink,
              #admin-member-scanner__dashboard_section_csr span:last-child,
              [class*="html5-qrcode"] a,
              #admin-member-scanner footer,
              #admin-member-scanner__header_message,
              #admin-member-scanner [style*="powered"],
              #admin-member-scanner__dashboard_section_csr,
              #admin-member-scanner img[src*="scanapp"],
              a[href*="scanapp"],
              a[href*="github.com/mebjas"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
              }
            `}</style>
            <div id="admin-member-scanner" className="rounded-lg overflow-hidden [&_video]:!object-cover" />
            <p className="text-center text-sm text-muted-foreground">
              Scan member's Digital ID QR code
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={stopScanner}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Scan
            </Button>
          </div>
        ) : (
          // Ready state
          <div className="space-y-4">
            <div className="text-center py-6 text-muted-foreground">
              <QrCode className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Ready to Scan</p>
              <p className="text-xs mt-1 opacity-75">
                Scan encrypted QR codes from member's Digital ID
              </p>
            </div>
            <Button
              className="w-full bg-gradient-neon"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Scanner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
