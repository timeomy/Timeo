import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavVendor } from '@/components/vendor/MobileNavVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface DailyRedemption {
  date: string;
  count: number;
}

export default function VendorPerformance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyRedemption[]>([]);
  const [totalRevenueValue, setTotalRevenueValue] = useState(0);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!user) return;

      // Get vendor info
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        setLoading(false);
        return;
      }

      // Get last 30 days of redeemed vouchers
      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('redeemed_at, value, current_redemptions')
        .eq('vendor_id', vendor.id)
        .eq('status', 'redeemed')
        .gte('redeemed_at', thirtyDaysAgo.toISOString())
        .order('redeemed_at', { ascending: true });

      // Process daily redemptions
      const dailyMap = new Map<string, number>();
      
      // Initialize all 30 days with 0
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'MMM dd');
        dailyMap.set(date, 0);
      }

      // Count redemptions per day
      vouchers?.forEach((v) => {
        if (v.redeemed_at) {
          const date = format(new Date(v.redeemed_at), 'MMM dd');
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        }
      });

      // Convert map to array
      const chartData: DailyRedemption[] = [];
      dailyMap.forEach((count, date) => {
        chartData.push({ date, count });
      });

      setDailyData(chartData);

      // Calculate total revenue value
      const totalValue = vouchers?.reduce((sum, v) => sum + (v.value * (v.current_redemptions || 1)), 0) || 0;
      setTotalRevenueValue(totalValue);

      setLoading(false);
    };

    fetchPerformanceData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
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
                PERFORMANCE
              </h1>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-secondary/20">
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Total Revenue Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/20">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-4xl font-display text-foreground">
                  RM {totalRevenueValue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Revenue Value Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Vouchers Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval={'preserveStartEnd'}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Redeemed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>

      <MobileNavVendor />
    </div>
  );
}
