import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scan, CheckCircle, XCircle, Loader2, Camera, Keyboard } from 'lucide-react';
import { QRScanner } from './QRScanner';

interface VoucherScannerProps {
  vendorId: string;
  onRedemption?: () => void;
}

export function VoucherScanner({ vendorId, onRedemption }: VoucherScannerProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [scannerKey, setScannerKey] = useState(0); // Key for resetting scanner

  const processCode = async (voucherCode: string) => {
    if (!voucherCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Check if voucher exists and is valid
      const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.trim().toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!voucher) {
        setResult('error');
        setResultMessage('Invalid voucher code. Please check and try again.');
        return;
      }

      if (voucher.status === 'redeemed') {
        setResult('error');
        setResultMessage('This voucher has already been redeemed.');
        return;
      }

      if (voucher.status === 'expired') {
        setResult('error');
        setResultMessage('This voucher has expired.');
        return;
      }

      // Check quantity limit
      if (voucher.max_redemptions !== null && voucher.current_redemptions >= voucher.max_redemptions) {
        setResult('error');
        setResultMessage('Voucher limit reached. This voucher is no longer available.');
        return;
      }

      // Check validity period
      const now = new Date();
      if (voucher.valid_from && new Date(voucher.valid_from) > now) {
        setResult('error');
        setResultMessage(`This voucher is not yet valid. Available from ${new Date(voucher.valid_from).toLocaleDateString()}.`);
        return;
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < now) {
        setResult('error');
        setResultMessage('This voucher has expired.');
        return;
      }

      // Determine if this should set status to 'redeemed' (single-use) or just increment counter
      const isSingleUse = voucher.max_redemptions === null || voucher.max_redemptions === 1;
      const isLastRedemption = voucher.max_redemptions !== null && voucher.current_redemptions + 1 >= voucher.max_redemptions;
      const newStatus = isSingleUse || isLastRedemption ? 'redeemed' : 'valid';

      // Update voucher
      const { error: updateError } = await supabase
        .from('vouchers')
        .update({
          status: newStatus,
          current_redemptions: voucher.current_redemptions + 1,
          redeemed_at: isSingleUse || isLastRedemption ? new Date().toISOString() : voucher.redeemed_at,
        })
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      // Insert redemption log
      await supabase.from('redemption_logs').insert({
        voucher_id: voucher.id,
        member_id: voucher.member_id ?? null,
        vendor_id: vendorId,
      });

      // Increment vendor's redeemed count
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('total_redeemed_count')
        .eq('id', vendorId)
        .maybeSingle();
      
      if (vendorData) {
        await supabase
          .from('vendors')
          .update({ total_redeemed_count: vendorData.total_redeemed_count + 1 })
          .eq('id', vendorId);
      }

      // Send notification to vendor (fire and forget)
      const remainingRedemptions = voucher.max_redemptions 
        ? voucher.max_redemptions - voucher.current_redemptions - 1 
        : undefined;
      
      supabase.functions.invoke('notify-vendor-redemption', {
        body: {
          vendorId: voucher.vendor_id,
          voucherTitle: voucher.title,
          voucherCode: voucher.code,
          voucherValue: voucher.value,
          remainingRedemptions,
        },
      }).catch(err => console.error('Notification error:', err));

      const remainingInfo = voucher.max_redemptions && !isLastRedemption
        ? ` (${voucher.max_redemptions - voucher.current_redemptions - 1} remaining)`
        : '';

      setResult('success');
      setResultMessage(`Successfully redeemed! Voucher value: RM${voucher.value}${remainingInfo}`);
      setCode('');
      onRedemption?.();
      
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      setResult('error');
      setResultMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = () => processCode(code);
  
  const handleQRScan = (scannedCode: string) => {
    setCode(scannedCode);
    toast.info(`Scanned: ${scannedCode}`);
    processCode(scannedCode);
  };

  const handleQRError = (error: string) => {
    toast.error(error);
  };

  const resetScanner = () => {
    setCode('');
    setResult(null);
    setResultMessage('');
    setScannerKey(prev => prev + 1); // Force scanner component to reset
  };

  return (
    <Card className="border-secondary/30">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-2xl flex items-center gap-2">
          <Scan className="h-6 w-6 text-secondary" />
          Scan Voucher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result === null ? (
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="camera" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Keyboard className="h-4 w-4 mr-2" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-0">
              <QRScanner key={scannerKey} onScan={handleQRScan} onError={handleQRError} />
              <p className="text-xs text-center text-muted-foreground mt-3">
                Point your camera at the member's QR code
              </p>
            </TabsContent>

            <TabsContent value="manual" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voucher-code">Enter Voucher Code</Label>
                <Input
                  id="voucher-code"
                  placeholder="XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-wider h-14 bg-muted border-secondary/30 focus:border-secondary"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleManualScan}
                disabled={loading || !code.trim()}
                className="w-full h-14 text-lg bg-gradient-purple hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Scan className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Verifying...' : 'Redeem Voucher'}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center space-y-4 py-4">
            {result === 'success' ? (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-display text-emerald-500">SUCCESS!</h3>
                <p className="text-muted-foreground">{resultMessage}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-xl font-display text-destructive">FAILED</h3>
                <p className="text-muted-foreground">{resultMessage}</p>
              </div>
            )}
            <Button onClick={resetScanner} variant="outline" className="mt-4">
              Scan Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
