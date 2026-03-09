import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, DoorOpen, FileJson, Settings, Shield, Zap } from 'lucide-react';

export function ZahGateConfigExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch company settings for any relevant config
      const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, turnstile_device_ip')
        .single();

      const config = {
        exported_at: new Date().toISOString(),
        integration_name: 'ZAH2 Door Controller Integration',
        version: '1.0',
        description: 'Configuration for the ZAH2 magnetic door controller used as the primary gym entry gate. Members scan a dynamic QR code or tap an NFC card to gain access.',

        company: {
          name: settings?.company_name || 'WSFitness',
          gate_device_ip: settings?.turnstile_device_ip || '(set in company settings)',
        },

        endpoint: {
          description: 'Your backend edge function URL that the ZAH2 device POSTs to',
          method: 'POST',
          content_type: 'application/json',
          note: 'Deploy the zah-gate edge function and point the ZAH2 device to this URL',
          function_name: 'zah-gate',
        },

        device_protocol: {
          description: 'ZAH2 hardware sends JSON POST requests to your endpoint',
          heartbeat: {
            trigger: 'Device sends cmd=0 periodically to verify server is alive',
            request: { cmd: 0, eventNo: 12345 },
            expected_response: {
              result: 0,
              cmd: 0,
              description: 'Heartbeat OK',
              eventNo: 12345,
              time: 'YYYY-MM-DD HH:mm:ss',
            },
          },
          card_scan: {
            trigger: 'Member scans QR code or taps NFC card',
            request: { cmd: 1, cardNo: '<QR_or_NFC_value>', eventNo: 12346 },
            response_granted: {
              result: 0,
              cmd: 1,
              eventNo: 12346,
              openCount: 1,
              voiceIndex: 2,
              isIn: 1,
              description: "<h1>Welcome</h1><p>Member Name</p><font color='green'>Authorized</font>",
            },
            response_denied: {
              result: 0,
              cmd: 1,
              eventNo: 12346,
              openCount: 0,
              voiceIndex: 5,
              isIn: 1,
              description: "<h1>STOP</h1><font color='red'>Reason</font>",
            },
          },
          response_headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        },

        qr_code_encryption: {
          description: 'Dynamic QR codes are AES-128-ECB encrypted and expire after 5 minutes',
          algorithm: 'AES-128-ECB',
          padding: 'NoPadding',
          key_length: '16 characters (128-bit)',
          key_source: 'Environment variable: QR_ENCRYPTION_KEY (also stored as ENCRYPTION_KEY in edge function)',
          payload_format: {
            description: '16-character plaintext = 8-char MemberID + 8-char Unix timestamp (hex)',
            example_plaintext: 'A1B2C3D4' + Math.floor(Date.now() / 1000).toString(16).toUpperCase().slice(-8),
            output: '32 hex character encrypted string',
          },
          validation: {
            timestamp_tolerance_seconds: 300,
            note: 'QR codes older than 5 minutes are rejected to prevent replay attacks',
          },
          frontend_library: 'crypto-js@4.2.0',
          frontend_function: 'generateEncryptedQrPayload(memberId: string): string — in src/lib/memberQr.ts',
        },

        nfc_card_support: {
          description: 'Members can also use physical NFC cards instead of QR codes',
          card_id_format: '8 hex characters (e.g. 3B40249B)',
          byte_order_handling: 'Both normal and byte-reversed order are checked (some readers reverse byte order: 3B40249B ↔ 9B24403B)',
          storage: 'nfc_card_id column in profiles table',
        },

        member_id_format: {
          description: 'Member IDs are 8 uppercase hex characters used as the QR payload base',
          example: 'A1B2C3D4',
          storage: 'member_id column in profiles table',
          generation: 'generate_member_id() database function — random hex, collision-checked',
        },

        access_control_logic: {
          checks_performed_in_order: [
            '1. Decrypt QR payload (AES-128-ECB) and validate timestamp is within 5 minutes',
            '2. If 8-char hex: check nfc_card_id match first, fallback to member_id lookup',
            '3. Look up member profile by member_id (case-insensitive)',
            '4. Check membership valid_from — reject if pass not started yet',
            '5. Check membership expiry_date — reject if expired (compared at end of day)',
            '6. Check membership status === "active" — reject if inactive',
            '7. Grant access and log check-in',
          ],
          no_membership_record: 'Access is GRANTED if no membership record exists (allows staff/admin accounts)',
          null_expiry_date: 'Access is GRANTED — null expiry = unlimited (staff, lifetime members)',
        },

        check_in_logging: {
          table: 'check_ins',
          columns: {
            member_id: 'UUID of the member (profiles.id)',
            location: 'ZAH Gate',
            notes: 'e.g. "QR access: A1B2C3D4" or "NFC card access: 3B40249B" or "REJECTED - Expired membership"',
          },
          note: 'Both granted AND denied access attempts are logged',
        },

        database_tables_required: [
          {
            table: 'profiles',
            columns_used: ['id', 'name', 'member_id', 'nfc_card_id'],
          },
          {
            table: 'memberships',
            columns_used: ['user_id', 'status', 'expiry_date', 'valid_from', 'plan_type'],
          },
          {
            table: 'check_ins',
            columns_used: ['member_id', 'location', 'notes', 'checked_in_at'],
          },
        ],

        environment_variables_required: [
          { name: 'SUPABASE_URL', description: 'Your Supabase project URL' },
          { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service role key for DB access (bypass RLS)' },
          { name: 'QR_ENCRYPTION_KEY', description: '16-character AES encryption key — MUST match the frontend key exactly' },
        ],

        setup_checklist: [
          '1. Deploy the zah-gate edge function to your backend',
          '2. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and QR_ENCRYPTION_KEY environment variables',
          '3. Configure the ZAH2 device to POST to your edge function URL',
          '4. Ensure the ZAH2 device uses cmd=0 for heartbeat and cmd=1 for card scans',
          '5. In the frontend, use generateEncryptedQrPayload(memberId) from memberQr.ts to generate QR values',
          '6. Members with 8-char hex member_id in their profile will have working QR access',
          '7. Assign nfc_card_id in profiles for NFC card access',
        ],
      };

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zah_gate_configuration_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('ZAH Gate configuration exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          ZAH Gate — Integration Config
        </CardTitle>
        <CardDescription>
          Export the full technical specification of how the magnetic door gate integration works, so you can replicate it in any app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Settings className="h-3.5 w-3.5" />
            What's included in the export
          </div>
          <ul className="space-y-1 list-disc list-inside">
            <li>ZAH2 device protocol (heartbeat + card scan request/response format)</li>
            <li>QR code encryption spec (AES-128-ECB, key format, payload structure)</li>
            <li>NFC card lookup logic including byte-order reversal handling</li>
            <li>Access control validation order (start date, expiry, status)</li>
            <li>Database tables &amp; columns required</li>
            <li>Environment variables needed</li>
            <li>Step-by-step setup checklist</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs gap-1"><Shield className="h-3 w-3" />AES-128-ECB QR</Badge>
          <Badge variant="secondary" className="text-xs gap-1"><Zap className="h-3 w-3" />NFC Support</Badge>
          <Badge variant="secondary" className="text-xs gap-1"><Settings className="h-3 w-3" />Full Protocol Spec</Badge>
        </div>

        <Button onClick={handleExport} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          Export ZAH Gate Config (JSON)
        </Button>
      </CardContent>
    </Card>
  );
}
