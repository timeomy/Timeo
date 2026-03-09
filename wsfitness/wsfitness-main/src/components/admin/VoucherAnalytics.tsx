import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, TrendingUp, Store, Clock, CheckCircle, XCircle } from 'lucide-react';

interface VoucherAnalyticsProps {
  vouchers: any[];
}

export function VoucherAnalytics({ vouchers }: VoucherAnalyticsProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    
    // Status counts
    const active = vouchers.filter(v => v.status === 'valid' && (!v.expires_at || new Date(v.expires_at) >= now)).length;
    const redeemed = vouchers.filter(v => v.status === 'redeemed').length;
    const expired = vouchers.filter(v => v.expires_at && new Date(v.expires_at) < now).length;
    const inactive = vouchers.filter(v => v.status === 'inactive').length;
    
    // Redemption stats
    const totalRedemptions = vouchers.reduce((sum, v) => sum + (v.current_redemptions || 0), 0);
    const totalMaxRedemptions = vouchers.reduce((sum, v) => sum + (v.max_redemptions || 0), 0);
    const redemptionRate = totalMaxRedemptions > 0 ? (totalRedemptions / totalMaxRedemptions) * 100 : 0;
    
    // Value stats
    const totalValue = vouchers.reduce((sum, v) => sum + (v.value || 0), 0);
    const avgValue = vouchers.length > 0 ? totalValue / vouchers.length : 0;
    
    // Vendor stats
    const vendorStats: Record<string, { count: number; redeemed: number; value: number }> = {};
    vouchers.forEach(v => {
      const vendorName = v.vendors?.business_name || 'Unassigned';
      if (!vendorStats[vendorName]) {
        vendorStats[vendorName] = { count: 0, redeemed: 0, value: 0 };
      }
      vendorStats[vendorName].count++;
      vendorStats[vendorName].redeemed += v.current_redemptions || 0;
      vendorStats[vendorName].value += v.value || 0;
    });
    
    const topVendors = Object.entries(vendorStats)
      .sort((a, b) => b[1].redeemed - a[1].redeemed)
      .slice(0, 5);
    
    // Expiry trends (next 30 days)
    const expiringIn7Days = vouchers.filter(v => {
      if (!v.expires_at || v.status === 'redeemed') return false;
      const expiry = new Date(v.expires_at);
      const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil >= 0 && daysUntil <= 7;
    }).length;
    
    const expiringIn30Days = vouchers.filter(v => {
      if (!v.expires_at || v.status === 'redeemed') return false;
      const expiry = new Date(v.expires_at);
      const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil >= 0 && daysUntil <= 30;
    }).length;
    
    return {
      total: vouchers.length,
      active,
      redeemed,
      expired,
      inactive,
      totalRedemptions,
      redemptionRate,
      totalValue,
      avgValue,
      topVendors,
      expiringIn7Days,
      expiringIn30Days,
    };
  }, [vouchers]);

  if (vouchers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-500">{analytics.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Redeemed</p>
                <p className="text-2xl font-bold text-blue-500">{analytics.redeemed}</p>
              </div>
              <Gift className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-500">{analytics.expiringIn7Days}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Within 7 days</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-500">{analytics.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Redemption Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Redemption Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Redemptions</span>
              <span className="font-medium">{analytics.totalRedemptions}</span>
            </div>
            {analytics.redemptionRate > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Usage Rate</span>
                  <span>{analytics.redemptionRate.toFixed(1)}%</span>
                </div>
                <Progress value={analytics.redemptionRate} className="h-2" />
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-medium text-primary">RM {analytics.totalValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Value/Voucher</span>
              <span className="font-medium">RM {analytics.avgValue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Top Vendors by Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topVendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No vendor data</p>
            ) : (
              <div className="space-y-2">
                {analytics.topVendors.map(([name, stats], idx) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0 w-6 h-6 flex items-center justify-center text-xs">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm truncate">{name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{stats.count} vouchers</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {stats.redeemed} redeemed
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
