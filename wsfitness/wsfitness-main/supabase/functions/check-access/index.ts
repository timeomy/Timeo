import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES-128 encryption key (must match frontend)
const ENCRYPTION_KEY = "wsfitness_secret";

// Validate 8-digit hexadecimal ID format
function isValidHexId(id: string): boolean {
  return /^[0-9A-Fa-f]{8}$/.test(id);
}

// Validate 32-char encrypted hex format
function isValidEncryptedHex(id: string): boolean {
  return /^[0-9A-Fa-f]{32}$/.test(id);
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// AES-128-ECB decryption using Web Crypto API (NoPadding mode)
async function decryptAES128ECB(hexCiphertext: string, keyString: string): Promise<string> {
  // Convert hex ciphertext to Uint8Array (should be exactly 16 bytes for 32-char hex)
  const cipherBytes = hexToBytes(hexCiphertext.toLowerCase());
  
  if (cipherBytes.length !== 16) {
    throw new Error(`Invalid ciphertext length: expected 16 bytes, got ${cipherBytes.length}`);
  }
  
  // Convert key string to bytes (must be 16 bytes for AES-128)
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyString.slice(0, 16));
  
  // Import key for AES decryption
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC", length: 128 },
    false,
    ["decrypt"]
  );
  
  // For ECB mode simulation with CBC: use zero IV
  const zeroIV = new Uint8Array(16);
  
  try {
    // For NoPadding, we need to append a dummy block that will be removed
    // Web Crypto API requires PKCS7 padding, so we add it manually for decryption
    const paddedCipher = new Uint8Array(32);
    paddedCipher.set(cipherBytes, 0);
    // Add a second block of 16 bytes of padding value 16 (PKCS7)
    for (let i = 16; i < 32; i++) {
      paddedCipher[i] = 16;
    }
    
    // We can't use this approach directly - instead decrypt the single block manually
    // For a single 16-byte block with no padding, we use raw-aes-key mode
    
    // Create a copy to avoid SharedArrayBuffer issues
    const cipherBuffer = new ArrayBuffer(cipherBytes.length);
    const cipherView = new Uint8Array(cipherBuffer);
    cipherView.set(cipherBytes);
    
    // Use AES-CTR with counter 0 to effectively do ECB for single block
    const cryptoKeyCtr = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CTR", length: 128 },
      false,
      ["decrypt"]
    );
    
    // Counter of all zeros - for single block this gives us ECB behavior
    const counter = new Uint8Array(16);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CTR", counter: counter, length: 128 },
      cryptoKeyCtr,
      cipherBuffer
    );
    
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decrypted);
    
    console.log("check-access: decrypted plaintext:", plaintext, "length:", plaintext.length);
    
    // No padding removal needed - NoPadding mode gives us exact 16 chars
    return plaintext;
  } catch (error) {
    console.error("AES decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get member ID from query params or body
    let inputId: string | null = null;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      inputId = url.searchParams.get("id");
    } else if (req.method === "POST") {
      const body = await req.json();
      inputId = body.id || body.member_id;
    }

    if (!inputId) {
      console.log("check-access: missing member ID");
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Missing member ID",
        code: "MISSING_ID"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize input
    inputId = inputId.toUpperCase().trim();
    
    let memberId: string;
    let isEncrypted = false;

    // Check if this is an encrypted 32-char hex payload or plain 8-char ID
    if (isValidEncryptedHex(inputId)) {
      isEncrypted = true;
      console.log("check-access: received encrypted payload, attempting decryption");
      
      try {
        // Decrypt the payload
        const decrypted = await decryptAES128ECB(inputId, ENCRYPTION_KEY);
        console.log("check-access: decrypted payload length:", decrypted.length);
        
        // Extract member ID (first 8 chars) and timestamp (last 8 chars)
        if (decrypted.length < 16) {
          throw new Error("Decrypted payload too short");
        }
        
        memberId = decrypted.slice(0, 8).toUpperCase();
        const timestampHex = decrypted.slice(8, 16);
        
        console.log("check-access: extracted memberId:", memberId, "timestampHex:", timestampHex);
        
        // Validate timestamp (must be within 120 seconds / 2 minutes)
        const qrTimestamp = parseInt(timestampHex, 16);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(currentTimestamp - qrTimestamp);
        
        console.log("check-access: qrTimestamp:", qrTimestamp, "currentTimestamp:", currentTimestamp, "diff:", timeDiff);
        
        if (timeDiff > 120) {
          console.log("check-access: QR code expired, time diff:", timeDiff, "seconds");
          return new Response(JSON.stringify({ 
            access: false, 
            error: "QR code expired. Please refresh your digital ID.",
            code: "QR_EXPIRED",
            time_diff: timeDiff
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
      } catch (decryptError) {
        console.error("check-access: decryption failed", decryptError);
        return new Response(JSON.stringify({ 
          access: false, 
          error: "Invalid QR code format",
          code: "DECRYPT_FAILED"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (isValidHexId(inputId)) {
      // Plain 8-char hex ID (legacy support)
      memberId = inputId;
      console.log("check-access: received plain member ID (legacy mode)");
    } else {
      console.log("check-access: invalid ID format", inputId);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Invalid ID format. Expected 8-digit hex or 32-char encrypted token.",
        code: "INVALID_FORMAT"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate extracted member ID format
    if (!isValidHexId(memberId)) {
      console.log("check-access: extracted member ID invalid format", memberId);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Invalid member ID format after decryption",
        code: "INVALID_MEMBER_ID"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("check-access: checking member", memberId, isEncrypted ? "(encrypted)" : "(plain)");

    // Look up member by member_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, avatar_url, member_id")
      .eq("member_id", memberId)
      .maybeSingle();

    if (profileError) {
      console.error("check-access: profile lookup failed", profileError);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Database error",
        code: "DB_ERROR"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      console.log("check-access: member not found", memberId);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Member not found",
        code: "NOT_FOUND"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has member role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .eq("role", "member")
      .maybeSingle();

    if (roleError) {
      console.error("check-access: role lookup failed", roleError);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Role verification failed",
        code: "ROLE_ERROR"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleData) {
      console.log("check-access: not a member role", memberId);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Not a valid member",
        code: "NOT_MEMBER"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check membership status and expiry
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("memberships")
      .select("status, expiry_date, plan_type")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (membershipError) {
      console.error("check-access: membership lookup failed", membershipError);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Membership verification failed",
        code: "MEMBERSHIP_ERROR"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!membership) {
      console.log("check-access: no membership found", memberId);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "No membership record",
        code: "NO_MEMBERSHIP"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if membership is active
    if (membership.status !== "active") {
      console.log("check-access: membership not active", memberId, membership.status);
      return new Response(JSON.stringify({ 
        access: false, 
        error: "Membership not active",
        code: "INACTIVE",
        status: membership.status
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if membership is expired
    if (membership.expiry_date) {
      const expiryDate = new Date(membership.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate < today) {
        console.log("check-access: membership expired", memberId, membership.expiry_date);
        return new Response(JSON.stringify({ 
          access: false, 
          error: "Membership expired",
          code: "EXPIRED",
          expiry_date: membership.expiry_date
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Record the check-in
    const { error: checkInError } = await supabaseAdmin
      .from("check_ins")
      .insert({
        member_id: profile.id,
        location: "Gate",
        notes: `Auto check-in via gate scan (ID: ${memberId}${isEncrypted ? ', encrypted' : ''})`
      });

    if (checkInError) {
      console.error("check-access: check-in recording failed", checkInError);
      // Don't fail the access check, just log the error
    } else {
      console.log("check-access: check-in recorded for", memberId);
    }

    // Access granted!
    console.log("check-access: ACCESS GRANTED", memberId, profile.name);
    
    return new Response(JSON.stringify({ 
      access: true,
      member: {
        id: memberId,
        name: profile.name,
        avatar_url: profile.avatar_url,
        plan_type: membership.plan_type,
        expiry_date: membership.expiry_date
      },
      encrypted: isEncrypted,
      message: "Access granted"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("check-access: unexpected error", message);
    return new Response(JSON.stringify({ 
      access: false, 
      error: message,
      code: "INTERNAL_ERROR"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
