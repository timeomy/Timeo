import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers - allows both custom domain and wildcard for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gate-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ENCRYPTION_KEY = 'wsfitness_secret';
const QR_VALIDITY_SECONDS = 120; // QR codes valid for 2 minutes

// Helper: Validate 8-char hex member ID
function isValidHexId(id: string): boolean {
  return /^[0-9A-Fa-f]{8}$/.test(id);
}

// Helper: Validate 32-char encrypted hex
function isValidEncryptedHex(id: string): boolean {
  return /^[0-9A-Fa-f]{32}$/.test(id);
}

// Helper: Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// AES-128-ECB decryption using Web Crypto API
async function decryptAES128ECB(hexCiphertext: string, keyString: string): Promise<string> {
  const cipherBytes = hexToBytes(hexCiphertext);
  const keyBytes = new TextEncoder().encode(keyString);

  // Import key for AES-ECB (simulate with CBC + no IV chaining)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  // ECB mode: decrypt each 16-byte block with zero IV
  const zeroIV = new Uint8Array(16);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: zeroIV },
    cryptoKey,
    cipherBytes.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ code: 405, msg: 'Method not allowed', data: { open: false } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate gate secret
    const gateSecret = req.headers.get('x-gate-secret');
    const expectedSecret = Deno.env.get('GATE_SECRET');

    if (!expectedSecret) {
      console.error('GATE_SECRET not configured');
      return new Response(
        JSON.stringify({ code: 500, msg: 'Server configuration error', data: { open: false } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gateSecret !== expectedSecret) {
      console.warn('Invalid gate secret provided');
      return new Response(
        JSON.stringify({ code: 401, msg: 'Unauthorized', data: { open: false } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const qrData = body.qr_data?.trim();

    if (!qrData) {
      return new Response(
        JSON.stringify({ code: 400, msg: 'Missing qr_data', data: { open: false } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing QR data: ${qrData.substring(0, 8)}...`);

    let memberId: string;
    let timestampSeconds: number | null = null;

    // Determine if encrypted (32 hex) or plain (8 hex)
    if (isValidEncryptedHex(qrData)) {
      // Decrypt the QR payload
      try {
        const decrypted = await decryptAES128ECB(qrData, ENCRYPTION_KEY);
        console.log(`Decrypted payload: ${decrypted}`);

        // Format: MEMBERID (8 chars) + TIMESTAMP (8 hex chars)
        if (decrypted.length !== 16) {
          return new Response(
            JSON.stringify({ code: 400, msg: 'Invalid QR format', data: { open: false } }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        memberId = decrypted.substring(0, 8).replace(/0+$/, '').toUpperCase();
        if (memberId.length === 0) memberId = decrypted.substring(0, 8).toUpperCase();
        
        const timestampHex = decrypted.substring(8, 16);
        timestampSeconds = parseInt(timestampHex, 16);

        // Validate timestamp (not expired)
        const now = Math.floor(Date.now() / 1000);
        const age = now - timestampSeconds;

        if (age > QR_VALIDITY_SECONDS || age < -30) {
          console.warn(`QR expired: age=${age}s, timestamp=${timestampSeconds}, now=${now}`);
          return new Response(
            JSON.stringify({ code: 401, msg: 'QR code expired', data: { open: false } }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Extracted memberId: ${memberId}, timestamp age: ${age}s`);
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        return new Response(
          JSON.stringify({ code: 400, msg: 'Invalid encrypted QR', data: { open: false } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (isValidHexId(qrData)) {
      // Legacy plain member ID
      memberId = qrData.toUpperCase();
      console.log(`Legacy plain memberId: ${memberId}`);
    } else {
      return new Response(
        JSON.stringify({ code: 400, msg: 'Invalid QR format', data: { open: false } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find profile by member_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, member_id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ code: 500, msg: 'Database error', data: { open: false } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.warn(`Member not found: ${memberId}`);
      return new Response(
        JSON.stringify({ code: 404, msg: 'Member not found', data: { open: false } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has member role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .in('role', ['member', 'staff']);

    if (!roleData || roleData.length === 0) {
      console.warn(`User ${profile.id} has no member/staff role`);
      return new Response(
        JSON.stringify({ code: 403, msg: 'Not a member', data: { open: false } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is staff (staff always has access, no expiry check needed)
    const isStaff = roleData.some(r => r.role === 'staff');

    if (!isStaff) {
      // Check membership status
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('status, expiry_date')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Membership lookup error:', membershipError);
        return new Response(
          JSON.stringify({ code: 500, msg: 'Database error', data: { open: false } }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!membership) {
        console.warn(`No membership found for user ${profile.id}`);
        return new Response(
          JSON.stringify({ code: 403, msg: 'No active membership', data: { open: false } }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check status
      if (membership.status !== 'active') {
        console.warn(`Membership not active: ${membership.status}`);
        return new Response(
          JSON.stringify({ code: 403, msg: `Membership ${membership.status}`, data: { open: false } }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (membership.expiry_date) {
        const expiryDate = new Date(membership.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (expiryDate < today) {
          console.warn(`Membership expired: ${membership.expiry_date}`);
          return new Response(
            JSON.stringify({ code: 403, msg: 'Membership expired', data: { open: false } }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Record check-in
    const { error: checkInError } = await supabase
      .from('check_ins')
      .insert({
        member_id: profile.id,
        location: 'Gate API',
        notes: isStaff ? 'Staff access' : 'Member access',
      });

    if (checkInError) {
      console.error('Check-in insert error:', checkInError);
      // Don't fail the access, just log
    }

    console.log(`Access granted for ${profile.name} (${memberId})`);

    return new Response(
      JSON.stringify({
        code: 0,
        msg: 'Success',
        data: {
          open: true,
          name: profile.name,
          member_id: profile.member_id,
          type: isStaff ? 'staff' : 'member',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ code: 500, msg: 'Internal server error', data: { open: false } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
