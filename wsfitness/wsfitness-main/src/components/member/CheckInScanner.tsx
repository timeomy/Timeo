import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { useStaffStatus } from '@/hooks/useStaffStatus';
import { useGymHours, canStaffCheckInEarlyWithHours, canMemberCheckInWithHours } from '@/hooks/useGymHours';
import { toast } from 'sonner';
import { QrCode, CheckCircle2, X, Loader2, Camera, Clock, Shield } from 'lucide-react';

interface CheckInScannerProps {
  onCheckInSuccess?: () => void;
}

export function CheckInScanner({ onCheckInSuccess }: CheckInScannerProps) {
  const { user } = useAuth();
  const { memberRole, loading: roleLoading } = useUserRole();
  const { isStaff, loading: staffLoading } = useStaffStatus();
  const { 
    session1_start, session1_end, session2_start, session2_end, 
    staff_early_minutes, loading: hoursLoading 
  } = useGymHours();
  const [scanning, setScanning] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Determine if user can use manual check-in (Admin/Coach only)
  const canManualCheckIn = memberRole === 'admin' || memberRole === 'it_admin' || memberRole === 'coach';
  // Members don't see the scanner at all - they get scanned by the gate
  const isMemberOnly = memberRole === 'member' && !isStaff;

  useEffect(() => {
    // Check for today's check-in
    const checkTodayCheckIn = async () => {
      if (!user) return;
      
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('member_id', user.id)
        .gte('checked_in_at', `${today}T00:00:00`)
        .order('checked_in_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setLastCheckIn(data[0].checked_in_at);
      }
    };
    
    checkTodayCheckIn();
  }, [user]);

  // Start camera with explicit user interaction (fixes iOS permission issues)
  const startCamera = async () => {
    try {
      // Request camera permission explicitly
      await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraReady(true);
      setScanning(true);
    } catch (error) {
      toast.error('Camera permission denied. Please allow camera access.');
    }
  };

  useEffect(() => {
    if (scanning && cameraReady) {
      const scannerId = 'check-in-qr-reader';
      
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
          // Expect QR format: "WSFITNESS_CHECKIN_{location}"
          if (decodedText.startsWith('WSFITNESS_CHECKIN_')) {
            const location = decodedText.replace('WSFITNESS_CHECKIN_', '');
            await handleCheckIn(location);
            stopScanner();
          } else {
            toast.error('Invalid check-in QR code');
          }
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
  }, [scanning, cameraReady, isStaff]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
    setCameraReady(false);
  };

  const handleCheckIn = async (location: string = 'Main Entrance') => {
    if (!user) {
      toast.error('Please log in to check in');
      return;
    }

    // Check if user can check in based on time
    if (isStaff) {
      const { canCheckIn, message } = canStaffCheckInEarlyWithHours(session1_start, staff_early_minutes);
      if (!canCheckIn) {
        toast.error(message);
        return;
      }
    } else {
      const { canCheckIn, message } = canMemberCheckInWithHours(session1_start, session1_end, session2_start, session2_end);
      if (!canCheckIn) {
        toast.error(message);
        return;
      }
    }

    setCheckingIn(true);
    try {
      const { error } = await supabase.from('check_ins').insert({
        member_id: user.id,
        location,
        notes: isStaff ? 'Staff early check-in' : null,
      });

      if (error) throw error;

      toast.success(isStaff ? 'Staff check-in successful!' : 'Check-in successful! Welcome to the gym!');
      setLastCheckIn(new Date().toISOString());
      onCheckInSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  // Quick check-in without QR (for testing/fallback)
  const handleQuickCheckIn = () => handleCheckIn('Main Entrance');

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (roleLoading || staffLoading || hoursLoading) {
    return (
      <Card className="ios-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Get current check-in status message
  const getCheckInStatus = () => {
    if (isStaff) {
      const { canCheckIn, message } = canStaffCheckInEarlyWithHours(session1_start, staff_early_minutes);
      return { canCheckIn, message, isEarly: true };
    }
    const { canCheckIn, message } = canMemberCheckInWithHours(session1_start, session1_end, session2_start, session2_end);
    return { canCheckIn, message, isEarly: false };
  };

  const checkInStatus = getCheckInStatus();

  // Members ONLY see their check-in status - NO scanner, NO quick check-in
  if (isMemberOnly) {
    return (
      <Card className="ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Gym Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastCheckIn ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Checked in today!</p>
                <p className="text-xs text-muted-foreground">at {formatTime(lastCheckIn)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <QrCode className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Present your QR code at the gate</p>
              <p className="text-xs mt-1 opacity-75">Your Digital ID Card contains your unique QR code</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Staff view with early check-in info
  if (isStaff && !canManualCheckIn) {
    return (
      <Card className="ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Staff Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastCheckIn ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Checked in today!</p>
                <p className="text-xs text-muted-foreground">at {formatTime(lastCheckIn)}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Early Check-in Status */}
              <div className={`flex items-center gap-2 p-3 rounded-lg ${checkInStatus.canCheckIn ? 'bg-primary/10 border border-primary/20' : 'bg-muted border border-border'}`}>
                <Clock className={`h-5 w-5 ${checkInStatus.canCheckIn ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{checkInStatus.canCheckIn ? 'Early Access Available' : 'Early Check-in'}</p>
                  <p className="text-xs text-muted-foreground">{checkInStatus.message}</p>
                </div>
              </div>

              <div className="text-center py-4 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Present your QR code at the gate</p>
                <p className="text-xs mt-1 opacity-75">Staff early access: 30 min before opening</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Admin/Coach view with scanner controls
  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Gym Check-In (Staff)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastCheckIn && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">Checked in today!</p>
              <p className="text-xs text-muted-foreground">at {formatTime(lastCheckIn)}</p>
            </div>
          </div>
        )}

        {scanning ? (
          <div className="space-y-3">
            {/* Hide scanner library watermarks aggressively */}
            <style>{`
              #check-in-qr-reader img[alt*="Info"],
              #check-in-qr-reader a,
              #check-in-qr-reader__dashboard_section_swaplink,
              #check-in-qr-reader__dashboard_section_csr span:last-child,
              [class*="html5-qrcode"] a,
              #check-in-qr-reader footer,
              #check-in-qr-reader__header_message,
              #check-in-qr-reader [style*="powered"],
              #check-in-qr-reader__dashboard_section_csr,
              #check-in-qr-reader img[src*="scanapp"],
              a[href*="scanapp"],
              a[href*="github.com/mebjas"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
              }
            `}</style>
            <div id="check-in-qr-reader" className="rounded-lg overflow-hidden [&_video]:!object-cover" />
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
          <div className="space-y-2">
            <Button
              className="w-full bg-gradient-neon"
              onClick={startCamera}
              disabled={checkingIn}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera to Scan
            </Button>
            {canManualCheckIn && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleQuickCheckIn}
                disabled={checkingIn}
              >
                {checkingIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Quick Check-In (Staff Only)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
