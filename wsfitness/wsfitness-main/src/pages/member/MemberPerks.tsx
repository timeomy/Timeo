import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { VoucherCard } from '@/components/member/VoucherCard';
import { MobileNavMember } from '@/components/member/MobileNavMember';
import { PhotoRequiredModal } from '@/components/member/PhotoRequiredModal';
import { useStaffStatus } from '@/hooks/useStaffStatus';
import { Loader2, Gift, Search, Shield, Clock, Sparkles, Infinity, Ticket, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';
import { cn } from '@/lib/utils';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  value: number;
  status: 'valid' | 'redeemed' | 'expired';
  vendor_id: string;
  vendors?: {
    business_name: string;
  };
}

interface ProfileData {
  avatar_url: string | null;
  member_id: string | null;
  name: string;
}

export default function MemberPerks() {
  const { user } = useAuth();
  const { isStaff } = useStaffStatus();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [membership, setMembership] = useState<{ status: string; expiry_date: string | null; valid_from: string | null } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const [profileRes, membershipRes] = await Promise.all([
        supabase.from('profiles').select('avatar_url, member_id, name').eq('id', user.id).maybeSingle(),
        supabase.from('memberships').select('status, expiry_date, valid_from').eq('user_id', user.id).maybeSingle(),
      ]);
      
      if (profileRes.data) setProfile(profileRes.data);
      if (membershipRes.data) setMembership(membershipRes.data);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user) return;

      const [directRes, assignedRes] = await Promise.all([
        supabase
          .from('vouchers')
          .select(`id, code, title, description, value, status, vendor_id, vendors (business_name)`)
          .or(`member_id.eq.${user.id},member_id.is.null`)
          .order('created_at', { ascending: false }),
        supabase
          .from('member_vouchers')
          .select(`voucher_id, status, vouchers (id, code, title, description, value, status, vendor_id, vendors (business_name))`)
          .eq('member_id', user.id),
      ]);

      const directVouchers = (directRes.data || []) as unknown as Voucher[];
      const assignedVouchers: Voucher[] = (assignedRes.data || [])
        .filter((mv: any) => mv.vouchers)
        .map((mv: any) => ({
          id: mv.vouchers.id,
          code: mv.vouchers.code,
          title: mv.vouchers.title,
          description: mv.vouchers.description,
          value: mv.vouchers.value,
          status: mv.status === 'used' ? 'redeemed' : mv.vouchers.status,
          vendor_id: mv.vouchers.vendor_id,
          vendors: mv.vouchers.vendors,
        }));

      const merged = new Map<string, Voucher>();
      [...directVouchers, ...assignedVouchers].forEach(v => merged.set(v.id, v));
      setVouchers(Array.from(merged.values()));
      setLoading(false);
    };

    fetchVouchers();
  }, [user]);

  const filteredVouchers = vouchers.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.vendors?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeVouchers = filteredVouchers.filter(v => v.status === 'valid');
  const pastVouchers = filteredVouchers.filter(v => v.status !== 'valid');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={wsfitnessLogo} alt="WSFitness" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <h1 className="font-display text-lg tracking-wide text-gradient">VOUCHERS</h1>
              <p className="text-[11px] text-muted-foreground">
                {isStaff ? 'Staff exclusive benefits' : 'Your exclusive perks'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-5 max-w-md mx-auto space-y-5">
        {/* Staff Benefits Card - Top */}
        {isStaff && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-full bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Staff Exclusive Benefits</p>
                  <p className="text-xs text-muted-foreground">Your special perks as a team member</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/50">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">Early Check-in</p>
                    <p className="text-[10px] text-muted-foreground">30min before opening</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background/50">
                  <Infinity className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">No Expiry</p>
                    <p className="text-[10px] text-muted-foreground">Unlimited access</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Perks Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Available Perks</h2>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vouchers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50"
            />
          </div>
        </section>

        {/* Segmented Toggle for Active/Past */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 h-11">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Ticket className="h-4 w-4" />
              Active ({activeVouchers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="data-[state=active]:bg-muted gap-2"
            >
              <History className="h-4 w-4" />
              Past ({pastVouchers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-0">
            {activeVouchers.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">No active vouchers</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for new offers!</p>
              </div>
            ) : (
              activeVouchers.map((voucher) => (
                <Card 
                  key={voucher.id}
                  className={cn(
                    "relative overflow-hidden border-l-4 border-l-primary",
                    "bg-card border-border/50",
                    "hover:shadow-lg hover:shadow-primary/10 transition-all active:scale-[0.98]"
                  )}
                >
                  <VoucherCard
                    id={voucher.id}
                    title={voucher.title}
                    description={voucher.description || undefined}
                    code={voucher.code}
                    value={voucher.value}
                    vendorName={voucher.vendors?.business_name}
                    status={voucher.status}
                  />
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-0">
            {pastVouchers.length === 0 ? (
              <div className="text-center py-14">
                <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No past vouchers</p>
              </div>
            ) : (
              pastVouchers.map((voucher) => (
                <div key={voucher.id} className="opacity-50">
                  <VoucherCard
                    id={voucher.id}
                    title={voucher.title}
                    description={voucher.description || undefined}
                    code={voucher.code}
                    value={voucher.value}
                    vendorName={voucher.vendors?.business_name}
                    status={voucher.status}
                  />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileNavMember />

      {/* Photo Required Modal */}
      {user && !loading && profile !== null && (
        <PhotoRequiredModal
          open={!profile.avatar_url}
          userId={user.id}
          currentAvatarUrl={profile.avatar_url}
          onPhotoUpdated={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
        />
      )}
    </div>
  );
}
