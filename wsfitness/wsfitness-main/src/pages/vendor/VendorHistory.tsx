import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavVendor } from '@/components/vendor/MobileNavVendor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, CheckCircle, Gift, User } from 'lucide-react';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface RedemptionLog {
  id: string;
  redeemed_at: string;
  voucher: {
    title: string;
    code: string;
    value: number;
  } | null;
  member_id: string | null;
  member_display: string | null; // masked member_id from profiles
}

export default function VendorHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RedemptionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        setLoading(false);
        return;
      }

      // Get redemption logs for this vendor
      const { data: redemptions, error } = await supabase
        .from('redemption_logs')
        .select('id, redeemed_at, member_id, voucher_id')
        .eq('vendor_id', vendor.id)
        .order('redeemed_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching redemptions:', error);
        setLoading(false);
        return;
      }

      if (!redemptions || redemptions.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Fetch voucher details
      const voucherIds = [...new Set(redemptions.map(r => r.voucher_id))];
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('id, title, code, value')
        .in('id', voucherIds);

      const vouchersMap = new Map(vouchersData?.map(v => [v.id, v]) || []);

      // Fetch member_id (masked) from profiles for members who have one
      const memberIds = [...new Set(redemptions.filter(r => r.member_id).map(r => r.member_id!))];
      let memberIdMap = new Map<string, string>();
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, member_id')
          .in('id', memberIds);
        memberIdMap = new Map(profilesData?.map(p => [p.id, p.member_id]) || []);
      }

      const enriched: RedemptionLog[] = redemptions.map(r => ({
        id: r.id,
        redeemed_at: r.redeemed_at,
        voucher: vouchersMap.get(r.voucher_id) || null,
        member_id: r.member_id,
        member_display: r.member_id ? (memberIdMap.get(r.member_id) || 'Member') : null,
      }));

      setLogs(enriched);
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
                HISTORY
              </h1>
              <p className="text-xs text-muted-foreground">Redemption history</p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-secondary/20">
            <History className="h-5 w-5 text-secondary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        {logs.length === 0 ? (
          <Card className="border-secondary/20">
            <CardContent className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No redemptions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Redeemed vouchers will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="border-secondary/20 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{log.voucher?.title || 'Unknown Voucher'}</h3>
                    <p className="text-sm font-mono text-primary mt-1">{log.voucher?.code || '—'}</p>
                    <p className="text-lg font-display text-secondary mt-2">RM{log.voucher?.value ?? 0}</p>
                    
                    {log.member_display && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="font-mono">{log.member_display}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Redeemed
                    </Badge>
                    
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Redeemed at:</p>
                      <p className="text-xs font-medium text-foreground">
                        {formatDateTime(log.redeemed_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <MobileNavVendor />
    </div>
  );
}
