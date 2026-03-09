import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { VoucherScanner } from '@/components/vendor/VoucherScanner';
import { MobileNavVendor } from '@/components/vendor/MobileNavVendor';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Store, CheckCircle } from 'lucide-react';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface VendorData {
  id: string;
  business_name: string;
  total_redeemed_count: number;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVendor = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('vendors')
      .select('id, business_name, total_redeemed_count')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setVendor(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendor();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Store className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-display mb-2">Vendor Not Found</h2>
        <p className="text-muted-foreground text-center">
          Your vendor profile hasn't been set up yet. Please contact admin.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-secondary/30">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src={wsfitnessLogo} 
              alt="WSFitness" 
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-display text-xl tracking-wide bg-gradient-purple bg-clip-text text-transparent">
                {vendor.business_name.toUpperCase()}
              </h1>
              <p className="text-xs text-muted-foreground">Vendor Portal</p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-secondary/20">
            <Store className="h-5 w-5 text-secondary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Stats Card */}
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-secondary/20">
                <CheckCircle className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <p className="text-4xl font-display text-secondary">
                  {vendor.total_redeemed_count}
                </p>
                <p className="text-sm text-muted-foreground">Total Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scanner */}
        <VoucherScanner 
          vendorId={vendor.id} 
          onRedemption={fetchVendor}
        />
      </main>

      <MobileNavVendor />
    </div>
  );
}
