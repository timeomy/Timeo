import { useMemo } from 'react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Gift, Store, Award } from 'lucide-react';

interface VendorAnalyticsProps {
  vendors: any[];
  vouchers: any[];
  redemptions: any[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function VendorAnalytics({ vendors, vouchers, redemptions }: VendorAnalyticsProps) {
  // Redemption trends over the last 30 days
  const redemptionTrends = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const count = redemptions.filter(r => {
        const redeemedAt = new Date(r.redeemed_at);
        return redeemedAt >= dayStart && redeemedAt < dayEnd;
      }).length;
      
      return {
        date: format(day, 'MMM d'),
        redemptions: count,
      };
    });
  }, [redemptions]);

  // Vendor comparison data
  const vendorComparison = useMemo(() => {
    return vendors.map(vendor => {
      const vendorRedemptions = redemptions.filter(r => r.vendor_id === vendor.id).length;
      const vendorVouchers = vouchers.filter(v => v.vendor_id === vendor.id);
      const activeVouchers = vendorVouchers.filter(v => v.status === 'valid').length;
      const totalValue = vendorVouchers.reduce((sum, v) => sum + (v.value || 0), 0);
      
      return {
        name: vendor.business_name?.substring(0, 15) || 'Unknown',
        fullName: vendor.business_name,
        redemptions: vendorRedemptions,
        vouchers: vendorVouchers.length,
        activeVouchers,
        totalValue,
      };
    }).sort((a, b) => b.redemptions - a.redemptions);
  }, [vendors, vouchers, redemptions]);

  // Voucher status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts = vouchers.reduce((acc, v) => {
      const status = v.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [vouchers]);

  // Weekly comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const thisWeekStart = subDays(now, 7);
    const lastWeekStart = subDays(now, 14);
    
    const thisWeekRedemptions = redemptions.filter(r => new Date(r.redeemed_at) >= thisWeekStart).length;
    const lastWeekRedemptions = redemptions.filter(r => {
      const date = new Date(r.redeemed_at);
      return date >= lastWeekStart && date < thisWeekStart;
    }).length;
    
    const percentChange = lastWeekRedemptions > 0 
      ? ((thisWeekRedemptions - lastWeekRedemptions) / lastWeekRedemptions * 100).toFixed(1)
      : thisWeekRedemptions > 0 ? '+100' : '0';
    
    return { thisWeek: thisWeekRedemptions, lastWeek: lastWeekRedemptions, percentChange };
  }, [redemptions]);

  // Top performers
  const topPerformers = vendorComparison.slice(0, 5);

  if (vendors.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-primary">{weeklyComparison.thisWeek}</p>
                <p className={`text-xs ${Number(weeklyComparison.percentChange) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {Number(weeklyComparison.percentChange) >= 0 ? '+' : ''}{weeklyComparison.percentChange}% from last week
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-2xl font-bold text-foreground">{vendors.length}</p>
              </div>
              <Store className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Vouchers</p>
                <p className="text-2xl font-bold text-emerald-500">{vouchers.filter(v => v.status === 'valid').length}</p>
              </div>
              <Gift className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All-time Redemptions</p>
                <p className="text-2xl font-bold text-amber-500">{redemptions.length}</p>
              </div>
              <Award className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redemption Trends Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display">Redemption Trends (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={redemptionTrends}>
                <defs>
                  <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="redemptions"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRedemptions)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor Comparison Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display">Vendor Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => [value, name === 'redemptions' ? 'Redemptions' : name]}
                />
                <Bar dataKey="redemptions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voucher Status Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display">Voucher Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers List */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Performing Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((vendor, index) => (
                <div key={vendor.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-500' :
                      index === 1 ? 'bg-slate-400/20 text-slate-400' :
                      index === 2 ? 'bg-amber-700/20 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{vendor.fullName}</p>
                      <p className="text-xs text-muted-foreground">{vendor.vouchers} vouchers • RM{vendor.totalValue} total value</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{vendor.redemptions}</p>
                    <p className="text-xs text-muted-foreground">redemptions</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No vendor data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
