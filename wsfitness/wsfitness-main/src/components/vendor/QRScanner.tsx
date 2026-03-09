import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { validateMemberIdFormat } from '@/lib/memberIdValidation';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  validateAsMemberId?: boolean; // Enable member ID format validation
}

export function QRScanner({ onScan, onError, validateAsMemberId = false }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerIdRef = useRef(`qr-reader-${Date.now()}`);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        scannerRef.current = null; // Clear ref first to prevent double calls
        
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (error) {
        console.warn('Error stopping scanner (non-critical):', error);
      }
    }
    if (isMountedRef.current) {
      setIsScanning(false);
      setIsInitializing(false);
    }
  }, []);

  const startScanning = async () => {
    if (isProcessingRef.current) return;
    
    setScannerError(null);
    setIsInitializing(true);
    isProcessingRef.current = true;

    try {
      // Check for camera permissions
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setHasCamera(false);
        onError?.('No camera found on this device');
        setIsInitializing(false);
        isProcessingRef.current = false;
        return;
      }

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const containerElement = document.getElementById(containerIdRef.current);
      if (!containerElement) {
        throw new Error('Scanner container not found');
      }

      const scanner = new Html5Qrcode(containerIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText: string) => {
          // Prevent multiple scans
          if (!isMountedRef.current || !scannerRef.current) return;
          
          // Validate format if required
          if (validateAsMemberId) {
            const validation = validateMemberIdFormat(decodedText);
            if (!validation.valid) {
              onError?.(validation.message);
              return; // Don't proceed, don't stop scanner - let them try again
            }
          }
          
          // Stop scanner first before callback
          await stopScanning();
          
          // Delay slightly to ensure UI has cleaned up
          setTimeout(() => {
            if (isMountedRef.current) {
              onScan(decodedText);
            }
          }, 50);
        },
        () => {
          // Ignore QR not found errors (they happen constantly while scanning)
        }
      );

      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (error: any) {
      console.error('QR Scanner error:', error);
      
      if (!isMountedRef.current) return;
      
      let errorMessage = 'Failed to start camera. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (error.message?.includes('container')) {
        errorMessage = 'Scanner initialization failed. Please refresh and try again.';
      }
      
      setScannerError(errorMessage);
      onError?.(errorMessage);
      await stopScanning();
    } finally {
      if (isMountedRef.current) {
        setIsInitializing(false);
      }
      isProcessingRef.current = false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  if (!hasCamera) {
    return (
      <div className="text-center py-8">
        <CameraOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No camera available</p>
        <p className="text-sm text-muted-foreground/70">Use manual code entry below</p>
      </div>
    );
  }

  if (scannerError) {
    return (
      <div className="text-center py-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{scannerError}</p>
        <Button 
          onClick={() => {
            setScannerError(null);
            startScanning();
          }} 
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scanner viewport */}
      <div
        id={containerIdRef.current}
        className={`relative overflow-hidden rounded-xl bg-muted transition-all duration-200 ${
          isScanning ? 'min-h-[300px]' : 'min-h-0'
        }`}
      >
        {!isScanning && !isInitializing && (
          <div className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-secondary mb-3" />
            <p className="text-sm text-muted-foreground">Tap below to start scanning</p>
          </div>
        )}
        {isInitializing && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary mb-3" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <Button
        onClick={isScanning ? stopScanning : startScanning}
        disabled={isInitializing}
        variant={isScanning ? 'destructive' : 'default'}
        className={`w-full h-12 ${!isScanning ? 'bg-gradient-purple hover:opacity-90' : ''}`}
      >
        {isInitializing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Starting Camera...
          </>
        ) : isScanning ? (
          <>
            <CameraOff className="h-5 w-5 mr-2" />
            Stop Camera
          </>
        ) : (
          <>
            <Camera className="h-5 w-5 mr-2" />
            Scan QR Code
          </>
        )}
      </Button>
    </div>
  );
}
