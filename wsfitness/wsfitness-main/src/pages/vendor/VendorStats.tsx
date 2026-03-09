import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavVendor } from '@/components/vendor/MobileNavVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface VendorStats {
  total_redeemed: number;
  today_redeemed: number;
  this_month_redeemed: number;
}

export default function VendorStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats>({
    total_redeemed: 0,
    today_redeemed: 0,
    this_month_redeemed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      // Get vendor info
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, total_redeemed_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        setLoading(false);
        return;
      }

      // Get today's redemptions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from('vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'redeemed')
        .gte('redeemed_at', today.toISOString());

      // Get this month's redemptions
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { count: monthCount } = await supabase
        .from('vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'redeemed')
        .gte('redeemed_at', monthStart.toISOString());

      setStats({
        total_redeemed: vendor.total_redeemed_count,
        today_redeemed: todayCount || 0,
        this_month_redeemed: monthCount || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Redeemed',
      value: stats.total_redeemed,
      icon: CheckCircle,
      gradient: 'from-secondary/20 to-secondary/5',
    },
    {
      label: 'Today',
      value: stats.today_redeemed,
      icon: Calendar,
      gradient: 'from-primary/20 to-primary/5',
    },
    {
      label: 'This Month',
      value: stats.this_month_redeemed,
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 to-emerald-500/5',
    },
  ];

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
                STATISTICS
              </h1>
              <p className="text-xs text-muted-foreground">Redemption analytics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={`bg-gradient-to-br ${stat.gradient} border-secondary/20`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-4xl font-display text-foreground">{stat.value}</p>
                </div>
                <div className="p-3 rounded-2xl bg-card/50">
                  <stat.icon className="h-8 w-8 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>

      <MobileNavVendor />
    </div>
  );
}
