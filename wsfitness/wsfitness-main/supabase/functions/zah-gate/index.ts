import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import CryptoJS from 'https://esm.sh/crypto-js@4.2.0';

/**
 * ZAH2 Door Controller Integration
 * 
 * Follows ZAH2 Hardware Manual specifications:
 * - Content-Type: text/html; charset=utf-8
 * - cmd=0: Heartbeat response
 * - cmd=1: Scan with decryption and database lookup
 * - HTML tags in description field for display
 * 
 * Security: Blocks expired members at gate level
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ZAH2 requires text/html content type
const zahHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/html; charset=utf-8',
};

// AES-128 encryption key (must match frontend exactly)
const ENCRYPTION_KEY = 'wsfitness_secret';

// Validate 8-digit hexadecimal ID format
function isValidHexId(id: string): boolean {
  return /^[0-9A-Fa-f]{8}$/.test(id);
}

// Some NFC readers report the 4 bytes of a 4-byte UID in reverse order.
// Example: 3B40249B -> 9B24403B
function reverseHexByteOrder(hex8: string): string {
  if (!isValidHexId(hex8)) return hex8;
  const bytes = hex8.match(/.{2}/g);
  if (!bytes || bytes.length !== 4) return hex8;
  return bytes.reverse().join('');
}

// Validate 32-char encrypted hex format
function isValidEncryptedHex(id: string): boolean {
  return /^[0-9A-Fa-f]{32}$/.test(id);
}

// Decrypt AES-128-ECB using CryptoJS (same library as frontend)
function decryptAES128ECB(hexCiphertext: string, keyString: string): string {
  // Parse the hex ciphertext to CryptoJS format
  const ciphertext = CryptoJS.enc.Hex.parse(hexCiphertext.toLowerCase());
  
  // Parse the key as UTF-8 (must be exactly 16 chars for AES-128)
  const key = CryptoJS.enc.Utf8.parse(keyString.slice(0, 16));
  
  // Decrypt with AES-ECB mode and NoPadding
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
    key,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding,
    }
  );
  
  // Convert to UTF-8 string
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Get formatted time for heartbeat (YYYY-MM-DD HH:mm:ss)
function getFormattedTime(): string {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

// Heartbeat response (cmd=0)
function createHeartbeatResponse(eventNo: number): Response {
  return new Response(JSON.stringify({
    result: 0,
    cmd: 0,
    description: "Heartbeat OK",
    eventNo: eventNo,
    time: getFormattedTime(),
  }), { headers: zahHeaders });
}

// Access denied response with HTML display
function createDeniedResponse(eventNo: number, reason = 'Access Denied'): Response {
  return new Response(JSON.stringify({
    result: 0,
    cmd: 1,
    eventNo: eventNo,
    openCount: 0,        // Door stays locked
    voiceIndex: 5,       // Error sound
    isIn: 1,
    description: `<h1>STOP</h1><font color='red'>${reason}</font>`,
  }), { headers: zahHeaders });
}

// Access granted response with HTML display
function createGrantedResponse(eventNo: number, userName: string): Response {
  return new Response(JSON.stringify({
    result: 0,
    cmd: 1,
    eventNo: eventNo,
    openCount: 1,        // Unlock door
    voiceIndex: 2,       // Success sound
    isIn: 1,
    description: `<h1>Welcome</h1><p>${userName}</p><font color='green'>Authorized</font>`,
  }), { headers: zahHeaders });
}

// Check if membership is expired
// Note: null expiry date = unlimited access (Staff, lifetime, etc.)
function isMembershipExpired(expiryDate: string | null): boolean {
  // No expiry date means unlimited access (Staff, lifetime members, etc.)
  if (!expiryDate) return false;
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  
  // Set expiry to end of day for fair comparison
  expiry.setHours(23, 59, 59, 999);
  
  return now > expiry;
}

// Check if membership has started (for Day Pass pre-booking)
// Returns: { started: boolean, startsOn: string | null }
function checkMembershipStart(validFrom: string | null): { started: boolean; startsOn: string | null } {
  // No valid_from means membership is already active
  if (!validFrom) return { started: true, startsOn: null };
  
  const startDate = new Date(validFrom);
  const now = new Date();
  
  // Compare dates only (ignore time for start date)
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (today < startDate) {
    return { 
      started: false, 
      startsOn: startDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  }
  
  return { started: true, startsOn: null };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return createDeniedResponse(0, 'Method Not Allowed');
  }

  let eventNo = 0;

  try {
    // Parse request body
    const body = await req.json();
    const { cmd, cardNo, eventNo: reqEventNo } = body;
    
    eventNo = reqEventNo || 0;

    // Log for debugging
    console.log(`ZAH2 Request: cmd=${cmd}, cardNo=${cardNo}, eventNo=${eventNo}`);

    // ========================================
    // HANDLE HEARTBEAT (cmd=0)
    // ========================================
    if (cmd === 0) {
      console.log('Heartbeat received');
      return createHeartbeatResponse(eventNo);
    }

    // ========================================
    // HANDLE SCAN (cmd=1)
    // ========================================
    if (cmd === 1) {
      // Validate cardNo exists
      if (!cardNo) {
        console.warn('No cardNo provided');
        return createDeniedResponse(eventNo, 'No Card Data');
      }

      const cardId = String(cardNo).trim().toUpperCase();
      console.log(`Processing cardNo: ${cardId} (length: ${cardId.length})`);

      // Initialize Supabase Client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let memberId: string | null = null;
      let isEncrypted = false;

      // ========================================
      // Determine if encrypted QR or plain NFC
      // ========================================
      if (isValidEncryptedHex(cardId)) {
        // Encrypted QR Code (32 hex chars)
        isEncrypted = true;
        console.log('=== DYNAMIC QR DECRYPTION ===');
        console.log(`Encrypted Input: ${cardId}`);
        
        try {
          const decrypted = decryptAES128ECB(cardId, ENCRYPTION_KEY);
          console.log(`Decryption Success: ${decrypted}`);
          
          if (!decrypted || decrypted.length < 16) {
            console.error(`Decrypted payload too short: length=${decrypted?.length || 0}`);
            return createDeniedResponse(eventNo, 'Invalid QR Code');
          }
          
          // Extract member ID (first 8 chars) and timestamp (last 8 chars)
          const rawMemberId = decrypted.slice(0, 8);
          const timestampHex = decrypted.slice(8, 16);
          
          // Store for lookup (uppercase)
          memberId = rawMemberId.toUpperCase();
          console.log(`Extracted ID: ${memberId} (raw: ${rawMemberId})`);
          console.log(`Timestamp Hex: ${timestampHex}`);
          
          // Validate timestamp (5 minutes = 300 seconds to account for time drift)
          const qrTimestamp = parseInt(timestampHex, 16);
          const currentTimestamp = Math.floor(Date.now() / 1000);
          const timeDiff = Math.abs(currentTimestamp - qrTimestamp);
          
          console.log(`Time Diff: ${timeDiff} seconds (QR: ${qrTimestamp}, Now: ${currentTimestamp})`);
          
          if (isNaN(qrTimestamp) || timeDiff > 300) {
            console.warn(`QR code expired or invalid timestamp (${timeDiff}s old, max 300s allowed)`);
            return createDeniedResponse(eventNo, 'QR Expired');
          }
          
        } catch (decryptError) {
          console.error('Decryption failed:', decryptError);
          return createDeniedResponse(eventNo, 'Invalid QR Code');
        }
      } else if (isValidHexId(cardId)) {
        // Plain 8-char hex - could be member_id OR nfc_card_id
        // First check if it's an NFC card
        console.log('Detected plain 8-char hex ID, checking NFC first...');

        // Door readers often send reversed byte order; check both.
        const reversedCardId = reverseHexByteOrder(cardId);
        if (reversedCardId !== cardId) {
          console.log(`NFC byte-order variant detected. raw=${cardId}, reversed=${reversedCardId}`);
        }
        
        const { data: nfcProfile, error: nfcError } = await supabase
          .from('profiles')
          .select('id, name, member_id')
          .in('nfc_card_id', [cardId, reversedCardId])
          .maybeSingle();
        
        if (!nfcError && nfcProfile) {
          console.log(`✅ NFC card matched to: ${nfcProfile.name} (member_id: ${nfcProfile.member_id})`);
          
          // Check membership status for NFC user
          const { data: nfcMembership } = await supabase
            .from('memberships')
            .select('status, expiry_date, valid_from')
            .eq('user_id', nfcProfile.id)
            .maybeSingle();
          
          // Check if membership has started yet
          if (nfcMembership) {
            const { started, startsOn } = checkMembershipStart(nfcMembership.valid_from);
            if (!started) {
              console.warn(`❌ ACCESS DENIED - NOT STARTED: ${nfcProfile.name}`);
              try {
                await supabase.from('check_ins').insert({
                  member_id: nfcProfile.id,
                  location: 'ZAH Gate',
                  notes: `REJECTED - Pass not valid yet. Starts ${startsOn}. NFC: ${cardId}`,
                });
              } catch (e) {
                console.error('Check-in log error:', e);
              }
              return createDeniedResponse(eventNo, `Starts ${startsOn}`);
            }
          }
          
          // Check if expired
          if (nfcMembership && isMembershipExpired(nfcMembership.expiry_date)) {
            console.warn(`❌ EXPIRED: ${nfcProfile.name} (expiry: ${nfcMembership.expiry_date})`);
            try {
              await supabase.from('check_ins').insert({
                member_id: nfcProfile.id,
                location: 'ZAH Gate',
                notes: `REJECTED - Expired membership. NFC: ${cardId}`,
              });
            } catch (e) {
              console.error('Check-in log error:', e);
            }
            return createDeniedResponse(eventNo, 'EXPIRED - Renew Now');
          }
          
          // Check if membership status is not active
          if (nfcMembership && nfcMembership.status !== 'active') {
            console.warn(`❌ ACCESS DENIED - Status not active: ${nfcMembership.status}`);
            try {
              await supabase.from('check_ins').insert({
                member_id: nfcProfile.id,
                location: 'ZAH Gate',
                notes: `REJECTED - Membership status: ${nfcMembership.status}. NFC: ${cardId}`,
              });
            } catch (e) {
              console.error('Check-in log error:', e);
            }
            return createDeniedResponse(eventNo, 'Membership Inactive');
          }
          
          // Record check-in for NFC
          try {
            await supabase.from('check_ins').insert({
              member_id: nfcProfile.id,
              location: 'ZAH Gate',
              notes: `NFC card access: ${cardId}`,
            });
          } catch (e) {
            console.error('Check-in insert error:', e);
          }
          
          return createGrantedResponse(eventNo, nfcProfile.name);
        }
        
        // If no NFC match, treat as member_id
        console.log('No NFC match, treating as member_id');
        memberId = cardId;
      } else {
        // Treat as NFC card ID (non-hex format)
        console.log('Treating as NFC card ID (non-hex), looking up by nfc_card_id...');
        
        const { data: nfcProfile, error: nfcError } = await supabase
          .from('profiles')
          .select('id, name, member_id')
          .eq('nfc_card_id', cardId)
          .maybeSingle();
        
        if (nfcError) {
          console.error('NFC lookup error:', nfcError);
          return createDeniedResponse(eventNo, 'Database Error');
        }
        
        if (nfcProfile) {
          console.log(`✅ NFC card matched to: ${nfcProfile.name} (member_id: ${nfcProfile.member_id})`);
          
          // Check membership status for NFC user
          const { data: nfcMembership } = await supabase
            .from('memberships')
            .select('status, expiry_date, valid_from')
            .eq('user_id', nfcProfile.id)
            .maybeSingle();
          
          // Check if membership has started yet
          if (nfcMembership) {
            const { started, startsOn } = checkMembershipStart(nfcMembership.valid_from);
            if (!started) {
              console.warn(`❌ ACCESS DENIED - NOT STARTED: ${nfcProfile.name}`);
              try {
                await supabase.from('check_ins').insert({
                  member_id: nfcProfile.id,
                  location: 'ZAH Gate',
                  notes: `REJECTED - Pass not valid yet. Starts ${startsOn}. NFC: ${cardId}`,
                });
              } catch (e) {
                console.error('Check-in log error:', e);
              }
              return createDeniedResponse(eventNo, `Starts ${startsOn}`);
            }
          }
          
          // Check if expired
          if (nfcMembership && isMembershipExpired(nfcMembership.expiry_date)) {
            console.warn(`❌ EXPIRED: ${nfcProfile.name} (expiry: ${nfcMembership.expiry_date})`);
            try {
              await supabase.from('check_ins').insert({
                member_id: nfcProfile.id,
                location: 'ZAH Gate',
                notes: `REJECTED - Expired membership. NFC: ${cardId}`,
              });
            } catch (e) {
              console.error('Check-in log error:', e);
            }
            return createDeniedResponse(eventNo, 'EXPIRED - Renew Now');
          }
          
          // Check if membership status is not active
          if (nfcMembership && nfcMembership.status !== 'active') {
            console.warn(`❌ ACCESS DENIED - Status not active: ${nfcMembership.status}`);
            try {
              await supabase.from('check_ins').insert({
                member_id: nfcProfile.id,
                location: 'ZAH Gate',
                notes: `REJECTED - Membership status: ${nfcMembership.status}. NFC: ${cardId}`,
              });
            } catch (e) {
              console.error('Check-in log error:', e);
            }
            return createDeniedResponse(eventNo, 'Membership Inactive');
          }
          
          // Record check-in for NFC
          try {
            await supabase.from('check_ins').insert({
              member_id: nfcProfile.id,
              location: 'ZAH Gate',
              notes: `NFC card access: ${cardId}`,
            });
          } catch (e) {
            console.error('Check-in insert error:', e);
          }
          
          return createGrantedResponse(eventNo, nfcProfile.name);
        } else {
          console.warn(`No NFC card match for: ${cardId}`);
          return createDeniedResponse(eventNo, 'Card Not Found');
        }
      }

      // ========================================
      // Validate extracted member ID format
      // ========================================
      if (!memberId || !isValidHexId(memberId)) {
        console.error(`Invalid member ID format: ${memberId}`);
        return createDeniedResponse(eventNo, 'Invalid ID');
      }

      // ========================================
      // Database Lookup - Case-insensitive search
      // ========================================
      console.log(`Looking up member_id: ${memberId} (trying both cases)`);
      
      // Try case-insensitive search first
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, member_id')
        .ilike('member_id', memberId)
        .maybeSingle();

      if (profileError) {
        console.error('Database error:', profileError);
        return createDeniedResponse(eventNo, 'Database Error');
      }

      // If not found with ilike, try exact lowercase match
      if (!profile) {
        console.log(`No match with ilike, trying lowercase: ${memberId.toLowerCase()}`);
        const { data: lowerProfile, error: lowerError } = await supabase
          .from('profiles')
          .select('id, name, member_id')
          .eq('member_id', memberId.toLowerCase())
          .maybeSingle();
        
        if (!lowerError && lowerProfile) {
          profile = lowerProfile;
        }
      }

      // User NOT FOUND
      if (!profile) {
        console.warn(`User not found for member_id: ${memberId} (tried both cases)`);
        return createDeniedResponse(eventNo, 'Access Denied');
      }

      // ========================================
      // SECURITY CHECK: Membership Expiry
      // ========================================
      console.log(`Checking membership status for user: ${profile.id}`);
      
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('status, expiry_date, plan_type, valid_from')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (membershipError) {
        console.error('Membership lookup error:', membershipError);
      }
      
      // Check if membership has started yet (Day Pass pre-booking)
      if (membership) {
        const { started, startsOn } = checkMembershipStart(membership.valid_from);
        if (!started) {
          console.warn(`❌ ACCESS DENIED - NOT STARTED: ${profile.name}`);
          console.warn(`   Starts On: ${startsOn}`);
          
          try {
            await supabase.from('check_ins').insert({
              member_id: profile.id,
              location: 'ZAH Gate',
              notes: `REJECTED - Pass not valid yet. Starts ${startsOn}. ${isEncrypted ? 'QR' : 'Card'}: ${memberId}`,
            });
          } catch (logError) {
            console.error('Failed to log rejected attempt:', logError);
          }
          
          return createDeniedResponse(eventNo, `Starts ${startsOn}`);
        }
      }
      
      // Check if membership is expired
      if (membership && isMembershipExpired(membership.expiry_date)) {
        console.warn(`❌ ACCESS DENIED - EXPIRED: ${profile.name}`);
        console.warn(`   Expiry Date: ${membership.expiry_date}`);
        console.warn(`   Status: ${membership.status}`);
        console.warn(`   Plan: ${membership.plan_type}`);
        
        // Log the rejected check-in attempt
        try {
          await supabase.from('check_ins').insert({
            member_id: profile.id,
            location: 'ZAH Gate',
            notes: `REJECTED - Expired membership (${membership.expiry_date}). ${isEncrypted ? 'QR' : 'Card'}: ${memberId}`,
          });
          console.log('Rejected check-in attempt logged');
        } catch (logError) {
          console.error('Failed to log rejected attempt:', logError);
        }
        
        return createDeniedResponse(eventNo, 'EXPIRED - Renew Now');
      }
      
      // Check if membership status is not active
      if (membership && membership.status !== 'active') {
        console.warn(`❌ ACCESS DENIED - Status not active: ${membership.status}`);
        
        // Log the rejected check-in attempt
        try {
          await supabase.from('check_ins').insert({
            member_id: profile.id,
            location: 'ZAH Gate',
            notes: `REJECTED - Membership status: ${membership.status}. ${isEncrypted ? 'QR' : 'Card'}: ${memberId}`,
          });
        } catch (logError) {
          console.error('Failed to log rejected attempt:', logError);
        }
        
        return createDeniedResponse(eventNo, 'Membership Inactive');
      }

      // ========================================
      // User FOUND & ACTIVE - Grant access
      // ========================================
      console.log(`✅ ACCESS GRANTED: ${profile.name} (ID: ${profile.id})`);
      
      // Record check-in
      try {
        await supabase.from('check_ins').insert({
          member_id: profile.id,
          location: 'ZAH Gate',
          notes: `${isEncrypted ? 'QR' : 'Card'} access: ${memberId}`,
        });
        console.log('Check-in recorded');
      } catch (checkInError) {
        console.error('Check-in insert error:', checkInError);
      }

      return createGrantedResponse(eventNo, profile.name);
    }

    // Unknown command - return denied
    console.warn(`Unknown cmd: ${cmd}`);
    return createDeniedResponse(eventNo, 'Unknown Command');

  } catch (error) {
    // Server error - still return valid response with openCount: 0
    console.error('ZAH2 Gate error:', error);
    return createDeniedResponse(eventNo, 'Server Error');
  }
});
