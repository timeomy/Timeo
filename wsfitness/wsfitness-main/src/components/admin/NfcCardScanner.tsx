import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Wifi, WifiOff, Loader2, CheckCircle, Info, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface NfcCardScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardScanned: (cardId: string) => void;
  currentCardId?: string | null;
}

export function NfcCardScanner({ open, onOpenChange, onCardScanned, currentCardId }: NfcCardScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [manualId, setManualId] = useState('');
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcReader, setNfcReader] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Check NFC support on mount
  useEffect(() => {
    const checkNfcSupport = () => {
      if ('NDEFReader' in window) {
        setNfcSupported(true);
      } else {
        setNfcSupported(false);
      }
    };
    checkNfcSupport();
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopScanning();
      setScannedId('');
      setManualId('');
    }
  }, [open]);

  const startScanning = async () => {
    if (!nfcSupported) {
      toast.error('NFC is not supported on this device');
      return;
    }

    try {
      const controller = new AbortController();
      setAbortController(controller);
      
      // @ts-ignore - NDEFReader is not in TypeScript types yet
      const reader = new window.NDEFReader();
      setNfcReader(reader);
      
      await reader.scan({ signal: controller.signal });
      setScanning(true);
      toast.info('Hold the NFC card near your device...');

      reader.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        // Convert serial number to uppercase hex format
        const cardId = serialNumber.replace(/:/g, '').toUpperCase();
        setScannedId(cardId);
        setScanning(false);
        toast.success(`Card detected: ${cardId}`);
        
        // Stop scanning after successful read
        controller.abort();
      });

      reader.addEventListener('readingerror', () => {
        toast.error('Error reading NFC card. Try again.');
      });

    } catch (error: any) {
      console.error('NFC scan error:', error);
      setScanning(false);
      
      if (error.name === 'NotAllowedError') {
        toast.error('NFC permission denied. Please allow NFC access.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('NFC is not supported on this device.');
        setNfcSupported(false);
      } else {
        toast.error(error.message || 'Failed to start NFC scan');
      }
    }
  };

  const stopScanning = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setScanning(false);
  };

  const handleConfirm = () => {
    const cardId = scannedId || manualId.trim().toUpperCase();
    if (!cardId) {
      toast.error('Please scan or enter a card ID');
      return;
    }
    onCardScanned(cardId);
    onOpenChange(false);
  };

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Scan NFC Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* NFC Status */}
          {nfcSupported === true && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-400">
                NFC is available on this device
              </AlertDescription>
            </Alert>
          )}

          {nfcSupported === false && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <WifiOff className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-400">
                {isIOS ? (
                  <>
                    <strong>iOS limitation:</strong> Web NFC is not supported on Safari. 
                    Use an NFC reader app (like "NFC Tools") to read the card ID, then enter it manually below.
                  </>
                ) : (
                  <>
                    NFC scanning is not available in this browser. 
                    {isAndroid && ' Try using Chrome on Android.'}
                    {' '}Enter the card ID manually below.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Current Card ID */}
          {currentCardId && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground">Current NFC Card ID</Label>
              <p className="font-mono text-sm mt-1">{currentCardId}</p>
            </div>
          )}

          {/* Scan Button */}
          {nfcSupported && (
            <div className="text-center py-4">
              {scanning ? (
                <div className="space-y-3">
                  <div className="relative mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wifi className="h-10 w-10 text-primary animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                  </div>
                  <p className="text-sm text-muted-foreground">Hold the NFC card near your device...</p>
                  <Button variant="outline" size="sm" onClick={stopScanning}>
                    Cancel Scan
                  </Button>
                </div>
              ) : scannedId ? (
                <div className="space-y-3">
                  <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Card detected:</p>
                    <p className="font-mono text-lg font-semibold text-foreground">{scannedId}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setScannedId(''); startScanning(); }}>
                    Scan Again
                  </Button>
                </div>
              ) : (
                <Button onClick={startScanning} className="gap-2">
                  <Wifi className="h-4 w-4" />
                  Start NFC Scan
                </Button>
              )}
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              {nfcSupported ? 'Or enter manually:' : 'Enter Card ID manually:'}
            </Label>
            <Input
              value={scannedId || manualId}
              onChange={(e) => {
                setManualId(e.target.value.toUpperCase());
                setScannedId('');
              }}
              placeholder="e.g., A1B2C3D4"
              className="font-mono"
              disabled={scanning}
            />
            <p className="text-xs text-muted-foreground">
              {isIOS && (
                <>Use an app like "NFC Tools" to read the card's serial number.</>
              )}
            </p>
          </div>

          {/* Help Info */}
          <Alert className="bg-muted/30 border-border/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              The NFC card ID is usually printed on the card or can be read using an NFC reader app.
              Common formats: 8-character hex code (e.g., A1B2C3D4).
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!scannedId && !manualId.trim()}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Assign Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
