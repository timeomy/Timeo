import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MobileNavVendor } from '@/components/vendor/MobileNavVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Store, Save } from 'lucide-react';
import { toast } from 'sonner';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';

interface VendorData {
  id: string;
  business_name: string;
}

interface ProfileData {
  name: string;
  email: string | null;
  phone_number: string | null;
}

export default function VendorProfile() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [vendorRes, profileRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, business_name')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('name, email, phone_number')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (vendorRes.data) setVendor(vendorRes.data);
      if (profileRes.data) {
        setProfile(profileRes.data);
        setFormData({
          name: profileRes.data.name || '',
          phone_number: profileRes.data.phone_number || '',
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        phone_number: formData.phone_number,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
    }
    setSaving(false);
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
                PROFILE
              </h1>
              <p className="text-xs text-muted-foreground">Vendor settings</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Business Card */}
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-secondary/20">
                <Store className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-display">{vendor?.business_name}</h2>
                <p className="text-sm text-muted-foreground">Partner Vendor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-muted border-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted/50 border-0 text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="+60 12-345 6789"
                className="bg-muted border-0"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full bg-gradient-purple hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </main>

      <MobileNavVendor />
    </div>
  );
}
