import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavMember } from '@/components/member/MobileNavMember';
import { MembershipBilling } from '@/components/member/MembershipBilling';
import { PaymentHistory } from '@/components/member/PaymentHistory';
import { ProfilePhotoUpload } from '@/components/member/ProfilePhotoUpload';
import { useStaffStatus } from '@/hooks/useStaffStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, User, Mail, Phone, Save, Edit2, X, AlertCircle, Shield, Clock, Sparkles, Infinity, Camera, MapPin, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface ProfileData {
  name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  member_id: string | null;
  address: string | null;
}

interface MembershipData {
  status: 'active' | 'expired';
  expiry_date: string | null;
  valid_from: string | null;
  plan_type: string;
}

export default function MemberProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isStaff, loading: staffLoading } = useStaffStatus();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [profileRes, membershipRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, email, phone_number, avatar_url, member_id, address')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('memberships')
          .select('status, expiry_date, valid_from, plan_type')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!profileRes.error && profileRes.data) {
        setProfile(profileRes.data);
        setFormData({
          name: profileRes.data.name || '',
          phone_number: profileRes.data.phone_number || '',
          email: profileRes.data.email || '',
          address: profileRes.data.address || '',
        });
      }

      if (!membershipRes.error && membershipRes.data) {
        setMembership(membershipRes.data as MembershipData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    
    try {
      const emailChanged = formData.email !== profile.email;
      
      if (emailChanged) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address');
          setSaving(false);
          return;
        }

        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (authError) {
          toast.error(authError.message);
          setSaving(false);
          return;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            phone_number: formData.phone_number,
            email: formData.email,
            address: formData.address,
          })
          .eq('id', user.id);

        if (profileError) {
          toast.error('Failed to update profile');
          setSaving(false);
          return;
        }

        toast.success('Profile updated! Check your new email to confirm the change.');
        setProfile(prev => prev ? { ...prev, ...formData } : null);
        setEditingEmail(false);
        setEditingAddress(false);
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            phone_number: formData.phone_number,
            address: formData.address,
          })
          .eq('id', user.id);

        if (error) {
          toast.error('Failed to update profile');
        } else {
          toast.success('Profile updated!');
          setProfile(prev => prev ? { ...prev, name: formData.name, phone_number: formData.phone_number, address: formData.address } : null);
          setEditingAddress(false);
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    }
    
    setSaving(false);
  };

  const handlePhotoUpdated = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  const hasAvatar = !!profile?.avatar_url;

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
              <h1 className="font-display text-lg tracking-wide text-gradient">PROFILE</h1>
              <p className="text-[11px] text-muted-foreground">Manage your account</p>
            </div>
          </div>
          {/* Logout Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign in again to continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await signOut();
                      navigate('/auth', { replace: true });
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to log out');
                    }
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Log out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-5 max-w-md mx-auto space-y-6">
        {/* Staff Benefits Banner - Compact */}
        {isStaff && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20">
            <div className="p-2 rounded-full bg-primary/20 shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Staff Benefits Active</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Early Access</span>
                <span className="flex items-center gap-1"><Infinity className="h-3 w-3" /> No Expiry</span>
              </div>
            </div>
          </div>
        )}

        {/* Profile Header Section */}
        <section className="flex flex-col items-center pt-2">
          {/* Photo with Camera Overlay */}
          <div className="relative mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/20"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-muted/50 flex items-center justify-center ring-4 ring-amber-500/20">
                <User className="h-14 w-14 text-muted-foreground/50" />
              </div>
            )}
            {/* Camera Overlay Button */}
            <div className="absolute bottom-0 right-0">
              {user && (
                <ProfilePhotoUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url || null}
                  onPhotoUpdated={handlePhotoUpdated}
                  required={!hasAvatar}
                  compact
                />
              )}
            </div>
          </div>

          {/* Name & Email */}
          <h2 className="text-xl font-display tracking-wide text-foreground">{profile?.name}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>

          {/* Photo Required Alert */}
          {!hasAvatar && (
            <div className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-500 font-medium">Please upload a profile photo</p>
            </div>
          )}
        </section>

        {/* Basic Information Section */}
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
            Basic Information
          </h3>
          
          <div className="space-y-0 bg-card/80 rounded-2xl overflow-hidden border border-border/30">
            {/* Full Name */}
            <div className="flex items-center gap-4 px-4 py-4 border-b border-border/20">
              <div className="p-2.5 rounded-full bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Full Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-7 px-0 border-0 bg-transparent text-foreground font-medium text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4 px-4 py-4 border-b border-border/20">
              <div className="p-2.5 rounded-full bg-muted/30">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Phone Number</label>
                <Input
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="h-7 px-0 border-0 bg-transparent text-foreground font-medium text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="+60 12-345 6789"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="p-2.5 rounded-full bg-muted/30">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Email Address</label>
                {editingEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-7 px-0 border-0 bg-transparent text-foreground font-medium text-base focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full"
                      onClick={() => {
                        setEditingEmail(false);
                        setFormData(prev => ({ ...prev, email: profile?.email || '' }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium text-base truncate">{profile?.email}</span>
                  </div>
                )}
              </div>
              {!editingEmail && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full border border-primary/50 hover:bg-primary/10"
                  onClick={() => setEditingEmail(true)}
                >
                  <Edit2 className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Address Section */}
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
            Address
          </h3>
          
          <div className="bg-card/80 rounded-2xl border border-border/30 overflow-hidden">
            {editingAddress ? (
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-muted/30 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
                      Home / Work Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your full address..."
                      rows={3}
                      className="w-full px-3 py-2.5 bg-muted/30 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setEditingAddress(false);
                      setFormData(prev => ({ ...prev, address: profile?.address || '' }));
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : formData.address ? (
              <button
                onClick={() => setEditingAddress(true)}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="p-2.5 rounded-full bg-muted/30 mt-0.5">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                  <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{formData.address}</p>
                </div>
                <Edit2 className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setEditingAddress(true)}
                className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="p-2.5 rounded-full bg-muted/30">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Add Address</p>
                  <p className="text-xs text-muted-foreground/60">Add your home or work address</p>
                </div>
                <Plus className="h-5 w-5 text-muted-foreground/50" />
              </button>
            )}
          </div>
        </section>

        {/* Save Button - Fixed at bottom area */}
        <div className="pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full h-12 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Membership & Billing Section */}
        <MembershipBilling
          status={isStaff ? 'active' : (membership?.status || 'expired')}
          expiryDate={isStaff ? null : membership?.expiry_date || null}
          planType={isStaff ? 'Staff Access' : membership?.plan_type}
          userId={user?.id}
          isStaff={isStaff}
        />

        {/* Payment History Section */}
        <PaymentHistory userName={profile?.name} />
      </main>

      <MobileNavMember />
    </div>
  );
}
