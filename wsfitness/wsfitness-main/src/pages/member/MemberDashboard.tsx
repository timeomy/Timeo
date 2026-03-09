import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavMember } from '@/components/member/MobileNavMember';
import { MonthlyStats } from '@/components/member/MonthlyStats';
import { ExpiryAlert } from '@/components/member/ExpiryAlert';
import { QrFab } from '@/components/member/QrFab';
import { QrCodeModal } from '@/components/member/QrCodeModal';
import { UpcomingClassesToday } from '@/components/member/UpcomingClassesToday';
import { PhotoRequiredModal } from '@/components/member/PhotoRequiredModal';
import { StaffBadge } from '@/components/member/StaffBadge';
import { NotificationBell } from '@/components/member/NotificationBell';
import { PullToRefreshIndicator } from '@/components/member/PullToRefreshIndicator';
import { PTProgressPanel } from '@/components/member/PTProgressPanel';
import { useStaffStatus } from '@/hooks/useStaffStatus';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { DashboardSkeleton } from '@/components/member/DashboardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface MembershipData {
  status: 'active' | 'expired';
  expiry_date: string | null;
  valid_from: string | null;
  plan_type: string;
}

interface ProfileData {
  name: string;
  avatar_url: string | null;
  phone_number: string | null;
  member_id: string | null;
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { isStaff, isStudio, specialRole, loading: staffLoading } = useStaffStatus();
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Either staff or studio role gets special access
  const hasSpecialAccess = isStaff || isStudio;

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [membershipRes, profileRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('status, expiry_date, valid_from, plan_type')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('name, avatar_url, phone_number, member_id')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (membershipRes.data) {
      setMembership(membershipRes.data as MembershipData);
    }
    if (profileRes.data) {
      setProfile(profileRes.data);
    }

    setLoading(false);
  }, [user]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
    setRefreshKey(k => k + 1); // Trigger child components to refresh
  }, [fetchData]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced photo modal - only show after 1.5s delay and only on dashboard root
  useEffect(() => {
    if (location.pathname !== '/dashboard' && location.pathname !== '/member/dashboard') {
      setShowPhotoModal(false);
      return;
    }

    if (loading || !profile) {
      setShowPhotoModal(false);
      return;
    }

    if (profile.avatar_url) {
      setShowPhotoModal(false);
      return;
    }

    const timer = setTimeout(() => {
      if ((location.pathname === '/dashboard' || location.pathname === '/member/dashboard') && !profile.avatar_url) {
        setShowPhotoModal(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, profile, location.pathname]);

  const handlePhotoUpdated = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    setShowPhotoModal(false);
  };

  const isAccessActive = hasSpecialAccess || membership?.status === 'active';

  // Wait for staff status to load before rendering the badge
  if (loading || staffLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <img 
                src={wsfitnessLogo} 
                alt="WSFitness" 
                className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30"
              />
              <div>
                <h1 className="font-display text-lg tracking-wide text-gradient">WS FITNESS</h1>
                <p className="text-[11px] text-muted-foreground">Member Portal</p>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 max-w-md mx-auto">
          <DashboardSkeleton />
        </main>
        <MobileNavMember />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src={wsfitnessLogo} 
              alt="WSFitness" 
              className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg tracking-wide text-gradient">WS FITNESS</h1>
                {specialRole && <StaffBadge role={specialRole} />}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isStudio ? 'Studio Portal' : hasSpecialAccess ? 'Staff Portal' : 'Member Portal'}
              </p>
            </div>
          </div>
          
          <NotificationBell />
        </div>
      </header>

      {/* Pull to Refresh Container */}
      <div 
        ref={containerRef}
        className="relative h-[calc(100vh-64px-96px)] overflow-y-auto overscroll-contain"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Main Content */}
        <main className="px-4 py-5 max-w-md mx-auto space-y-5">
          {/* Welcome Section */}
          <div className="space-y-1">
            <h2 className="text-2xl font-display tracking-wide">
              Welcome back, <span className="text-gradient">{profile?.name?.split(' ')[0] || 'Member'}</span>
            </h2>
            
            {/* Access Status Card */}
            <Card className={`border-0 ${isAccessActive ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {isAccessActive ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${isAccessActive ? 'text-emerald-500' : 'text-destructive'}`}>
                    {isStudio 
                      ? 'Studio instructor access is always active'
                      : hasSpecialAccess 
                        ? 'Staff access is always active'
                        : isAccessActive 
                          ? 'Your membership is active' 
                          : 'Membership expired - Renew at the counter'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expiry Alert - Only show for non-staff/non-studio members */}
          {!hasSpecialAccess && (
            <ExpiryAlert 
              expiryDate={membership?.expiry_date || null} 
              status={membership?.status || 'expired'} 
            />
          )}

          {/* PT Progress Panel - Shows workout logs, sessions, expiry */}
          <PTProgressPanel key={`pt-${refreshKey}`} refreshKey={refreshKey} />

          {/* Upcoming Classes Today */}
          <UpcomingClassesToday key={`classes-${refreshKey}`} />

          {/* Monthly Stats */}
          <MonthlyStats key={`stats-${refreshKey}`} />
        </main>
      </div>

      {/* Floating QR Button */}
      <QrFab onClick={() => setQrModalOpen(true)} />

      {/* QR Code Modal */}
      <QrCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        memberId={profile?.member_id || ''}
        userName={profile?.name || 'Member'}
        membershipStatus={hasSpecialAccess ? 'active' : (membership?.status || 'expired')}
        expiryDate={membership?.expiry_date}
        validFrom={membership?.valid_from}
        isStaff={isStaff}
        isStudio={isStudio}
      />

      <MobileNavMember />

      {/* Photo Required Modal */}
      {user && (
        <PhotoRequiredModal
          open={showPhotoModal}
          userId={user.id}
          currentAvatarUrl={profile?.avatar_url || null}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
}
