import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Copy, Check, Fingerprint, Camera, Shield, Database, FlaskConical, Image } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { AdminMemberScanner } from '@/components/admin/AdminMemberScanner';
import { BiometricGallery } from '@/components/admin/BiometricGallery';

const SUPABASE_PROJECT_ID = 'vbeygycoopxwmvjtxdyp';
// Branded gate domain for "forever URL" (proxied via CNAME to Supabase)
const GATE_DOMAIN = 'gate.wsfitness.my';

export default function GateIntegration() {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalMembers: 0, withPhoto: 0, withoutPhoto: 0, active: 0 });
  const [testingApi, setTestingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    document.title = 'Gate Integration | WSFitness';
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: members } = await supabase
        .from('memberships')
        .select('status, profiles:user_id(member_id, avatar_url)')
        .not('profiles.member_id', 'is', null);

      if (members) {
        const withPhoto = members.filter(m => m.profiles?.avatar_url).length;
        const active = members.filter(m => m.status === 'active').length;
        setStats({
          totalMembers: members.length,
          withPhoto,
          withoutPhoto: members.length - withPhoto,
          active,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleExportGateData = async () => {
    setExporting(true);
    try {
      // Fetch all members with member_id assigned
      const { data: members, error } = await supabase
        .from('memberships')
        .select('status, profiles:user_id(name, member_id, avatar_url)')
        .not('profiles.member_id', 'is', null);

      if (error) throw error;

      if (!members || members.length === 0) {
        toast.info('No members with assigned IDs found');
        setExporting(false);
        return;
      }

      // Format data for gate sync
      const gateData = members.map(m => ({
        member_id: m.profiles?.member_id || '',
        status: m.status || 'inactive',
        full_name: m.profiles?.name || 'Unknown',
        photo_url: m.profiles?.avatar_url || '',
      }));

      exportToCSV(gateData, 'gate_sync_data', [
        { key: 'member_id', header: 'Member ID' },
        { key: 'status', header: 'Status' },
        { key: 'full_name', header: 'Full Name' },
        { key: 'photo_url', header: 'Photo URL' },
      ]);

      toast.success(`Export Complete: gate_sync_data.csv (${gateData.length} members)`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export gate data');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const photoUrlPattern = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/avatars/{member_id}.jpg`;
  const statusCheckEndpoint = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/memberships?select=status&profiles.member_id=eq.{member_id}`;
  // Branded gate URLs for "forever URL" stability
  const gateSyncEndpoint = `https://${GATE_DOMAIN}/functions/v1/gate-sync`;
  const verifyAccessEndpoint = `https://${GATE_DOMAIN}/functions/v1/verify-access`;

  const handleTestApi = async () => {
    setTestingApi(true);
    setApiResponse(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('gate-sync', {
        body: { last_sync_timestamp: null }
      });

      if (error) throw error;

      // Truncate photo_base64 for display
      const displayData = {
        ...data,
        members: data.members?.map((m: any) => ({
          ...m,
          photo_base64: m.photo_base64 
            ? `${m.photo_base64.substring(0, 50)}...[truncated ${m.photo_base64.length} chars]`
            : null
        }))
      };

      setApiResponse(displayData);
      setTestDialogOpen(true);
      toast.success(`API returned ${data.member_count} members`);
    } catch (error: any) {
      console.error('API test error:', error);
      setApiResponse({ error: error.message });
      setTestDialogOpen(true);
      toast.error('API test failed');
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <AppLayout title="GATE INTEGRATION">
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Turnstile & Access Control</h2>
          <p className="text-sm text-muted-foreground">
            Manage the connection between the Web App and Physical Turnstiles
          </p>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display text-foreground">{stats.totalMembers}</p>
                  <p className="text-xs text-muted-foreground">Total Synced</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Shield className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-display text-foreground">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-secondary/20">
                  <Camera className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-display text-foreground">{stats.withPhoto}</p>
                  <p className="text-xs text-muted-foreground">With Photo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="ios-card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-colors"
            onClick={() => setGalleryOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Camera className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-display text-foreground">{stats.withoutPhoto}</p>
                  <p className="text-xs text-muted-foreground">Missing Photo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Member Scanner */}
        <AdminMemberScanner />

        {/* Gate Sync Export */}
        <Card className="ios-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Fingerprint className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Bulk Member Export</CardTitle>
                <CardDescription>Download member data for turnstile team integration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">CSV Export Includes:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><code className="text-xs bg-muted px-1 rounded">member_id</code> - Unique identifier (e.g., WS-2025-0041)</li>
                <li><code className="text-xs bg-muted px-1 rounded">status</code> - active/inactive (blocks expired members)</li>
                <li><code className="text-xs bg-muted px-1 rounded">full_name</code> - Member's display name</li>
                <li><code className="text-xs bg-muted px-1 rounded">photo_url</code> - Public link to profile picture</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Only members with assigned IDs are included. Members without IDs are excluded.
              </p>
            </div>

            <Button 
              onClick={handleExportGateData} 
              disabled={exporting}
              size="lg"
              className="w-full bg-gradient-neon"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Download Gate Sync File (CSV)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ZAH Hardware Settings Panel */}
        <Card className="ios-card border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Shield className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  ZAH Hardware Settings
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">v3.5</Badge>
                </CardTitle>
                <CardDescription>Configure these values in your ZAH turnstile board settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hardware Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Server IP/Domain</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted p-3 rounded-lg font-mono text-primary">
                    gate.wsfitness.my
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy('gate.wsfitness.my', 'zah-domain')}
                  >
                    {copied === 'zah-domain' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Server Port</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted p-3 rounded-lg font-mono text-primary">
                    443
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy('443', 'zah-port')}
                  >
                    {copied === 'zah-port' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Use 80 if device doesn't support SSL</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Request Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted p-3 rounded-lg font-mono text-primary">
                    /api/tCheck
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy('/api/tCheck', 'zah-path')}
                  >
                    {copied === 'zah-path' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">ZAH default path (hardcoded)</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Encryption Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted p-3 rounded-lg font-mono text-primary">
                    _Zah
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy('_Zah', 'zah-key')}
                  >
                    {copied === 'zah-key' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Default ZAH encryption key</p>
              </div>
            </div>

            {/* ZAH API Endpoint */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">ZAH Gate API Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-primary">
                  https://{GATE_DOMAIN}/functions/v1/zah-gate
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopy(`https://${GATE_DOMAIN}/functions/v1/zah-gate`, 'zah-gate')}
                >
                  {copied === 'zah-gate' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Cloudflare Warning */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                ⚠️ CRITICAL: Cloudflare Configuration Required
              </p>
              <p className="text-xs text-muted-foreground">
                You must set a <strong>Page Rule / Transform Rule</strong> in Cloudflare to rewrite the ZAH hardcoded path:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Incoming:</span>
                  <span className="text-foreground">gate.wsfitness.my/api/tCheck</span>
                </div>
                <div className="text-muted-foreground">↓ Rewrite To ↓</div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="text-foreground">gate.wsfitness.my/functions/v1/zah-gate</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Reason:</strong> The ZAH hardware is hardcoded to use <code className="bg-muted px-1 rounded">/api/tCheck</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Smart Gate Sync API */}
        <Card className="ios-card border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Fingerprint className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Smart Gate Sync API
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">NEW</Badge>
                  </CardTitle>
                  <CardDescription>Single endpoint for incremental member sync with photos</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTestApi}
                  disabled={testingApi}
                >
                  {testingApi ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <FlaskConical className="h-4 w-4 mr-1" />
                  )}
                  Test API
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGalleryOpen(true)}
                >
                  <Image className="h-4 w-4 mr-1" />
                  Gallery
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Endpoint URL */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">POST Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-primary">
                  {gateSyncEndpoint}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopy(gateSyncEndpoint, 'gate-sync')}
                >
                  {copied === 'gate-sync' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Request Body */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Request Body (Optional)</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground">
{`{
  "last_sync_timestamp": "2025-12-30T10:00:00Z"  // Optional: Get only members updated since this time
}`}
              </pre>
              <p className="text-xs text-muted-foreground">
                Send <code className="bg-muted px-1 rounded">null</code> or omit to get ALL members
              </p>
            </div>

            {/* Response Format */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Response Format</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-48">
{`{
  "sync_time": "2025-12-31T10:00:00Z",
  "member_count": 45,
  "members": [
    {
      "member_id": "B62CF7C2",
      "name": "Jabez Lim",
      "status": "active",
      "valid_from": "2025-01-01",
      "valid_until": "2026-01-01",
      "photo_base64": "data:image/jpeg;base64,/9j/4AAQ..."
    }
  ]
}`}
              </pre>
            </div>

            {/* Features */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">✨ Features</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Incremental sync - only fetch changed members</li>
                <li>Photos embedded as Base64 - no separate downloads needed</li>
                <li>Includes <code className="text-xs bg-muted px-1 rounded">valid_from</code> and <code className="text-xs bg-muted px-1 rounded">valid_until</code> dates</li>
                <li>Auto-calculates status based on expiry date</li>
                <li>Images capped at 1MB to prevent timeouts</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Developer Info Panel */}
        <Card className="ios-card border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-secondary/20">
                  <Camera className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle>Legacy API Integration</CardTitle>
                  <CardDescription>Manual photo URL and status check (older method)</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Legacy</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo URL Pattern */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Dynamic Photo URL Pattern</p>
              <p className="text-xs text-muted-foreground mb-2">
                To fetch a user's selfie, replace <code className="bg-muted px-1 rounded">{'{member_id}'}</code> with the scanned ID (e.g., WS-2025-0041)
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-primary">
                  {photoUrlPattern}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopy(photoUrlPattern, 'photo')}
                >
                  {copied === 'photo' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Status Check Endpoint */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Status Check Endpoint (Optional)</p>
              <p className="text-xs text-muted-foreground mb-2">
                Query this endpoint to verify if a member's status is active before granting access
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-primary">
                  {statusCheckEndpoint}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopy(statusCheckEndpoint, 'status')}
                >
                  {copied === 'status' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Integration Notes */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-500 mb-2">⚠️ Integration Notes</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Photos are stored in the <code className="bg-muted px-1 rounded">avatars</code> bucket</li>
                <li>Filename format: <code className="bg-muted px-1 rounded">{'{user_uuid}'}</code> (not member_id)</li>
                <li>For face matching, use the <code className="bg-muted px-1 rounded">photo_url</code> from the CSV export</li>
                <li>Status check requires API key authentication (contact IT admin)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* API Test Response Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Gate Sync API Response
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {apiResponse && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4 text-sm">
                  <div className="bg-muted rounded-lg p-3 flex-1">
                    <p className="text-muted-foreground">Sync Time</p>
                    <p className="font-mono text-foreground">{apiResponse.sync_time || 'N/A'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 flex-1">
                    <p className="text-muted-foreground">Members</p>
                    <p className="font-mono text-foreground">{apiResponse.member_count || 0}</p>
                  </div>
                </div>

                {/* JSON Response */}
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Biometric Gallery */}
      <BiometricGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
    </AppLayout>
  );
}
