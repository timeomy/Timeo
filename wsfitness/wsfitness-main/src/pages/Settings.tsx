import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { GymLayout } from '@/components/layout/GymLayout';
import { MfaSetup } from '@/components/auth/MfaSetup';
import { BulkIdMigration } from '@/components/admin/BulkIdMigration';
import { GymHoursSettings } from '@/components/admin/GymHoursSettings';
import { StaffCheckInAnalytics } from '@/components/admin/StaffCheckInAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Shield, Wrench, Building2, Users, ChevronRight, Globe, Bell, Save, Server, Copy, Check } from 'lucide-react';

interface CompanySettings {
  id: string;
  company_name: string;
  address: string | null;
  tax_id: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  turnstile_device_ip: string | null;
}

export default function Settings() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [turnstileDeviceIp, setTurnstileDeviceIp] = useState('192.168.1.201');
  const [savingTurnstileIp, setSavingTurnstileIp] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    address: '',
    tax_id: '',
    logo_url: '',
    phone: '',
    email: '',
    registration_number: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCompanySettings();
    }
  }, [user]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCompanySettings(data as CompanySettings);
        setCompanyForm({
          company_name: data.company_name || '',
          address: data.address || '',
          tax_id: data.tax_id || '',
          logo_url: data.logo_url || '',
          phone: data.phone || '',
          email: data.email || '',
          registration_number: data.registration_number || '',
        });
        setTurnstileDeviceIp((data as CompanySettings).turnstile_device_ip || '192.168.1.201');
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      if (companySettings) {
        // Update existing
        const { error } = await supabase
          .from('company_settings')
          .update({
            company_name: companyForm.company_name,
            address: companyForm.address || null,
            tax_id: companyForm.tax_id || null,
            logo_url: companyForm.logo_url || null,
            phone: companyForm.phone || null,
            email: companyForm.email || null,
            registration_number: companyForm.registration_number || null,
          })
          .eq('id', companySettings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_name: companyForm.company_name,
            address: companyForm.address || null,
            tax_id: companyForm.tax_id || null,
            logo_url: companyForm.logo_url || null,
            phone: companyForm.phone || null,
            email: companyForm.email || null,
            registration_number: companyForm.registration_number || null,
          });

        if (error) throw error;
      }
      
      toast.success('Company settings saved');
      fetchCompanySettings();
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveTurnstileIp = async () => {
    setSavingTurnstileIp(true);
    try {
      if (companySettings) {
        const { error } = await supabase
          .from('company_settings')
          .update({ turnstile_device_ip: turnstileDeviceIp })
          .eq('id', companySettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ turnstile_device_ip: turnstileDeviceIp });

        if (error) throw error;
      }
      
      toast.success('Turnstile device IP saved');
      fetchCompanySettings();
    } catch (error) {
      console.error('Error saving turnstile IP:', error);
      toast.error('Failed to save turnstile IP');
    } finally {
      setSavingTurnstileIp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPrivilegedUser = role === 'admin' || role === 'it_admin';

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const settingsMenu = [
    { title: 'Staff Access', description: 'Manage user permissions and roles', icon: Users, href: '/users' },
    { title: 'Notifications', description: 'Email and push notification settings', icon: Bell, href: '#' },
    { title: 'Website', description: 'Public website and booking page', icon: Globe, href: '#' },
  ];

  // Branded gate URL for hardware integration (forever URL via CNAME proxy)
  const VERIFY_ACCESS_URL = 'https://gate.wsfitness.my/functions/v1/verify-access';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <GymLayout title="Settings" subtitle="Manage your account and gym settings">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display tracking-wide">Settings</h2>
          <p className="text-muted-foreground text-sm">Manage your account and gym settings</p>
        </div>

        {/* Account Card */}
        <Card className="ios-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Account</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{role?.replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Company Settings (Admin Only) */}
        {isPrivilegedUser && (
          <Card className="ios-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Company Details</CardTitle>
              </div>
              <CardDescription>These details will appear on your e-Invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    placeholder="My Gym Sdn Bhd"
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Business Registration No.</Label>
                  <Input
                    id="registration_number"
                    placeholder="202001012345"
                    value={companyForm.registration_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax Identification No. (TIN)</Label>
                  <Input
                    id="tax_id"
                    placeholder="C12345678901"
                    value={companyForm.tax_id}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+60123456789"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="billing@mygym.com"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    placeholder="https://..."
                    value={companyForm.logo_url}
                    onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="No. 123, Jalan Fitness, 50000 Kuala Lumpur"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleSaveCompany} disabled={savingCompany}>
                {savingCompany ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Company Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Gym Hours Settings (Admin Only) */}
        {isPrivilegedUser && <GymHoursSettings />}

        {/* Staff Check-In Analytics (Admin Only) */}
        {isPrivilegedUser && <StaffCheckInAnalytics />}

        {/* Settings Menu (Admin Only) */}
        {isPrivilegedUser && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Gym Settings
            </h3>
            <div className="grid gap-2">
              {settingsMenu.map((item) => (
                <Link key={item.title} to={item.href}>
                  <Card className="ios-card hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                          <item.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Gate & API Documentation */}
        {isPrivilegedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Gate & API</h3>
            </div>

            {/* ZAH Hardware Settings Panel */}
            <Card className="ios-card border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  ZAH Hardware Settings
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">NEW v3.5</Badge>
                </CardTitle>
                <CardDescription>
                  Configure these values in your ZAH turnstile board settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Server IP/Domain</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted/50 px-3 py-2 rounded-md text-sm font-mono">
                        gate.wsfitness.my
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard('gate.wsfitness.my', 'zah-domain')}
                      >
                        {copiedField === 'zah-domain' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Server Port</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted/50 px-3 py-2 rounded-md text-sm font-mono">
                        443
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard('443', 'zah-port')}
                      >
                        {copiedField === 'zah-port' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Use 80 if device doesn't support SSL</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Request Address</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted/50 px-3 py-2 rounded-md text-sm font-mono">
                        /api/tCheck
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard('/api/tCheck', 'zah-path')}
                      >
                        {copiedField === 'zah-path' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">ZAH default path (hardcoded)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Encryption Key</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted/50 px-3 py-2 rounded-md text-sm font-mono">
                        _Zah
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard('_Zah', 'zah-key')}
                      >
                        {copiedField === 'zah-key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Default ZAH encryption key</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Face Turnstile LAN Settings */}
            <Card className="ios-card border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Face Turnstile LAN Sync
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Direct Sync</Badge>
                </CardTitle>
                <CardDescription>
                  Configure the IP address of your face recognition turnstile device for direct LAN syncing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="turnstile_ip" className="text-sm font-medium">Device IP Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="turnstile_ip"
                      placeholder="192.168.1.201"
                      value={turnstileDeviceIp}
                      onChange={(e) => setTurnstileDeviceIp(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSaveTurnstileIp}
                      disabled={savingTurnstileIp}
                    >
                      {savingTurnstileIp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This IP is used when syncing member photos directly from the browser to the turnstile device.
                    Ensure you are on the same network as the device.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  ⚠️ Cloudflare Configuration Required
                </CardTitle>
                <CardDescription>
                  You MUST set up a URL rewrite rule in Cloudflare for the ZAH hardware to work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Create a Transform Rule:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Incoming Path:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">gate.wsfitness.my/api/tCheck</code>
                    </div>
                    <div className="flex items-center gap-2 my-2">
                      <span className="text-muted-foreground">→</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Rewrite To:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">gate.wsfitness.my/functions/v1/zah-gate</code>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Reason:</strong> The ZAH hardware is hardcoded to use <code className="bg-muted px-1 rounded">/api/tCheck</code> as its endpoint.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Original Developer Guide */}
            <Card className="ios-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Hardware Developer Guide
                  <Badge variant="outline" className="text-xs">Custom Integration</Badge>
                </CardTitle>
                <CardDescription>
                  Use this API to verify member access from your gate/turnstile hardware
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Endpoint */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">API Endpoint</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted/50 px-3 py-2 rounded-md text-sm font-mono break-all">
                      {VERIFY_ACCESS_URL}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(VERIFY_ACCESS_URL, 'url')}
                    >
                      {copiedField === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Method</Label>
                  <Badge>POST</Badge>
                </div>

                {/* Headers */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Required Headers</Label>
                  <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm space-y-1">
                    <p><span className="text-primary">x-gate-secret:</span> [YOUR_GATE_SECRET]</p>
                    <p><span className="text-primary">Content-Type:</span> application/json</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The GATE_SECRET is configured in your backend secrets
                  </p>
                </div>

                {/* Request Body */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Request Body</Label>
                  <pre className="bg-muted/30 rounded-lg p-3 font-mono text-sm overflow-x-auto">
{`{
  "qr_data": "[SCANNED_QR_STRING]"
}`}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    The qr_data is the raw string scanned from the member's QR code (32-char encrypted hex)
                  </p>
                </div>

                {/* Success Response */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Success Response
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">200 OK</Badge>
                  </Label>
                  <pre className="bg-muted/30 rounded-lg p-3 font-mono text-sm overflow-x-auto">
{`{
  "code": 0,
  "msg": "Success",
  "data": {
    "open": true,
    "name": "John Doe",
    "member_id": "A1B2C3D4",
    "type": "member"
  }
}`}
                  </pre>
                </div>

                {/* Error Response */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Error Responses
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">4xx/5xx</Badge>
                  </Label>
                  <pre className="bg-muted/30 rounded-lg p-3 font-mono text-sm overflow-x-auto">
{`// Expired QR (401)
{ "code": 401, "msg": "QR code expired", "data": { "open": false } }

// Expired membership (403)
{ "code": 403, "msg": "Membership expired", "data": { "open": false } }

// Invalid secret (401)
{ "code": 401, "msg": "Unauthorized", "data": { "open": false } }

// Member not found (404)
{ "code": 404, "msg": "Member not found", "data": { "open": false } }`}
                  </pre>
                </div>

                {/* Integration Notes */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-primary">Integration Notes</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>QR codes are encrypted and valid for <strong>2 minutes</strong></li>
                    <li>Check <code className="bg-muted px-1 rounded">data.open</code> to determine gate action</li>
                    <li>Staff members have unlimited access (no expiry check)</li>
                    <li>Each successful scan creates a check-in record</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Section */}
        {isPrivilegedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Security</h3>
            </div>
            <MfaSetup />
          </div>
        )}

        {/* Maintenance Tools */}
        {isPrivilegedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Maintenance Tools</h3>
            </div>
            <BulkIdMigration />
          </div>
        )}
      </div>
    </GymLayout>
  );
}