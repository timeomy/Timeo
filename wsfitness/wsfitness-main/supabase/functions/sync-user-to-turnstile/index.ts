import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileRecord {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: ProfileRecord;
  old_record: ProfileRecord | null;
}

// CRC32 lookup table for generating numeric hashes
const CRC32_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/**
 * Generates a CRC32 hash of a string, returning it as a positive integer string.
 */
function crc32(str: string): string {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xFF;
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  const result = (crc ^ 0xFFFFFFFF) >>> 0; // Ensure positive unsigned integer
  return result.toString();
}

/**
 * Converts a user ID to a numeric string for device compatibility.
 * - Pure numeric: use as-is
 * - Valid hex: convert to decimal
 * - Otherwise: generate CRC32 hash (limited to 9 digits)
 */
function convertToNumericId(id: string): string {
  if (!id || typeof id !== 'string') {
    console.log('[ID] Invalid input, generating fallback hash');
    return crc32('invalid-' + Date.now());
  }

  const cleanId = id.trim();
  
  // Check if already pure numeric
  if (/^\d+$/.test(cleanId)) {
    console.log('[ID] Already numeric:', cleanId);
    return cleanId;
  }
  
  // Check if valid hexadecimal (only 0-9, a-f, A-F)
  if (/^[0-9a-fA-F]+$/.test(cleanId)) {
    try {
      // Convert hex to decimal
      const decimalValue = BigInt('0x' + cleanId);
      const numericId = decimalValue.toString();
      console.log('[ID] Hex converted:', cleanId, '->', numericId);
      return numericId;
    } catch (e) {
      console.log('[ID] Hex conversion failed, using CRC32 fallback');
    }
  }
  
  // Fallback: generate CRC32 hash for any other format (UUIDs, etc.)
  // Limit to 9 digits (under 1 billion) to avoid 32-bit integer overflow on device
  const crcResult = parseInt(crc32(cleanId), 10);
  const limitedId = (crcResult >>> 0) % 1000000000;
  const hashedId = limitedId.toString();
  console.log('[ID] CRC32 hash generated (limited):', cleanId.substring(0, 8) + '...', '->', hashedId);
  return hashedId;
}

async function downloadAndResizeImage(supabase: any, avatarUrl: string): Promise<string | null> {
  console.log('[IMAGE] Step 1: Starting image download and resize');
  console.log('[IMAGE] Avatar URL:', avatarUrl);
  
  try {
    // Extract the file path from the avatar URL
    // Avatar URLs are typically: https://xxx.supabase.co/storage/v1/object/public/avatars/path/to/file.jpg
    console.log('[IMAGE] Step 2: Parsing avatar URL');
    const urlParts = avatarUrl.split('/storage/v1/object/public/avatars/');
    if (urlParts.length !== 2) {
      console.error('[IMAGE] ERROR: Invalid avatar URL format - cannot extract file path');
      console.error('[IMAGE] URL parts found:', urlParts.length);
      return null;
    }
    
    const filePath = decodeURIComponent(urlParts[1]);
    console.log('[IMAGE] Step 3: Extracted file path:', filePath);
    
    // Download with Supabase's built-in image transformation
    console.log('[IMAGE] Step 4: Downloading with transform (640x640, 60% quality)');
    const { data, error } = await supabase.storage
      .from('avatars')
      .download(filePath, {
        transform: {
          width: 640,
          height: 640,
          quality: 60,
          resize: 'contain'
        }
      });
    
    if (error) {
      console.error('[IMAGE] Step 4 FAILED: Transform download error:', error.message);
      console.log('[IMAGE] Step 5: Attempting fallback download without transform');
      
      try {
        const fallbackResult = await supabase.storage
          .from('avatars')
          .download(filePath);
        
        if (fallbackResult.error) {
          console.error('[IMAGE] Step 5 FAILED: Fallback download error:', fallbackResult.error.message);
          return null;
        }
        
        if (!fallbackResult.data) {
          console.error('[IMAGE] Step 5 FAILED: No data from fallback download');
          return null;
        }
        
        console.log('[IMAGE] Step 5 SUCCESS: Fallback download succeeded, size:', fallbackResult.data.size, 'bytes');
        
        // Check if fallback image is too large
        if (fallbackResult.data.size > 200 * 1024) {
          console.error('[IMAGE] FAILED: Image too large:', fallbackResult.data.size, 'bytes (max 200KB)');
          return null;
        }
        
        console.log('[IMAGE] Step 6: Converting to base64');
        const base64 = await blobToBase64(fallbackResult.data, filePath);
        console.log('[IMAGE] Step 6 SUCCESS: Base64 conversion complete');
        return base64;
      } catch (fallbackError) {
        console.error('[IMAGE] Step 5 EXCEPTION:', fallbackError);
        return null;
      }
    }
    
    if (!data) {
      console.error('[IMAGE] Step 4 FAILED: No data returned from storage');
      return null;
    }
    
    console.log('[IMAGE] Step 4 SUCCESS: Transformed image size:', data.size, 'bytes');
    
    // Final check - device typically accepts under 200KB
    if (data.size > 200 * 1024) {
      console.error('[IMAGE] FAILED: Transformed image still too large:', data.size, 'bytes (max 200KB)');
      return null;
    }
    
    console.log('[IMAGE] Step 5: Converting to base64');
    const base64 = await blobToBase64(data, filePath);
    console.log('[IMAGE] Step 5 SUCCESS: Base64 conversion complete');
    return base64;
  } catch (error) {
    console.error('[IMAGE] CRITICAL EXCEPTION:', error);
    return null;
  }
}

async function blobToBase64(data: Blob, filePath: string): Promise<string> {
  const arrayBuffer = await data.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  
  const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
  
  console.log('[IMAGE] Base64 length:', base64.length, 'chars');
  
  return `data:${mimeType};base64,${base64}`;
}

Deno.serve(async (req) => {
  console.log('========================================');
  console.log('[SYNC] Edge function invoked at:', new Date().toISOString());
  console.log('========================================');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[SYNC] Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SYNC] Step 1: Loading environment variables');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[SYNC] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[SYNC] SERVICE_ROLE_KEY present:', !!serviceRoleKey);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[SYNC] CRITICAL: Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    console.log('[SYNC] Step 2: Creating Supabase client');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('[SYNC] Step 3: Parsing webhook payload');
    let payload: WebhookPayload;
    try {
      payload = await req.json();
      console.log('[SYNC] Payload type:', payload.type);
      console.log('[SYNC] Payload table:', payload.table);
      console.log('[SYNC] Record ID:', payload.record?.id);
      console.log('[SYNC] Record name:', payload.record?.name);
      console.log('[SYNC] Record avatar_url:', payload.record?.avatar_url ? 'present' : 'null');
    } catch (parseError) {
      console.error('[SYNC] Failed to parse JSON payload:', parseError);
      throw new Error('Invalid JSON payload');
    }

    // Only process INSERT and UPDATE
    if (payload.type === 'DELETE') {
      console.log('[SYNC] Skipping DELETE event');
      return new Response(JSON.stringify({ success: true, message: 'DELETE event skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const record = payload.record;
    
    console.log('[SYNC] Step 4: Processing user:', record.id, 'name:', record.name);

    // For UPDATE, check if avatar actually changed (only skip if avatar unchanged AND we have an old avatar)
    if (payload.type === 'UPDATE' && payload.old_record) {
      if (payload.old_record.avatar_url === record.avatar_url && !record.avatar_url) {
        console.log('[SYNC] Avatar unchanged and no avatar, skipping sync');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Avatar unchanged - sync skipped',
          user_id: record.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // DISABLED: Image processing temporarily disabled for testing
    // Testing data-only sync to verify device accepts user without image
    console.log('[SYNC] Step 5: SKIPPED - Image processing disabled for testing');

    // Convert user ID to numeric format for device compatibility
    console.log('[SYNC] Step 6: Converting ID to numeric format');
    console.log('[SYNC] Original ID:', record.id);
    const numericId = convertToNumericId(record.id);
    console.log('[SYNC] Numeric ID:', numericId);

    // Prepare device payload - FINAL HIGH COMPATIBILITY PROTOCOL FIX (per device firmware)
    // IMPORTANT: Keep this structure exactly to maximize compatibility.
    // - id: INTEGER (no quotes)
    // - person_id: STRING (use actual member ID)
    // - upload_mode: 0
    // - command_id: required for older firmware
    const testIdInt = 123456; // INTEGER
    const personIdStr = "1C88CB1C"; // STRING - actual Member ID
    const testName = "testtest";
    const commandId = Date.now().toString();

    console.log('[SYNC] Step 7: Preparing FINAL HIGH COMPATIBILITY payload');
    console.log('[SYNC] id (INTEGER):', testIdInt);
    console.log('[SYNC] person_id (STRING):', personIdStr);
    console.log('[SYNC] command_id (STRING):', commandId);

    // NOTE: Key order matters for some older firmware JSON parsers.
    const devicePayload: Record<string, any> = {
      cmd: "upload person",
      id: testIdInt,
      person_id: personIdStr,
      name: testName,
      role: 1,
      upload_mode: 0,
      total_count: 1,
      command_id: commandId,
      reg_image: "",
    };

    console.log('[SYNC] FINAL HIGH COMPAT Payload:', JSON.stringify(devicePayload));
    // HARDCODED: Use the exact device serial number
    const targetDeviceSn = '1122E2-AAD72B-61A9FF';
    console.log('[SYNC] Step 8: Using hardcoded device_sn:', targetDeviceSn);

    // INSERT command into queue instead of calling device directly
    console.log('[SYNC] Step 9: Inserting command into queue (piggyback approach)');
    const { data: queueEntry, error: queueError } = await supabase
      .from('turnstile_command_queue')
      .insert({
        device_sn: targetDeviceSn,
        command_json: devicePayload,
        status: 'pending'
      })
      .select('id')
      .single();

    if (queueError) {
      console.error('[SYNC] Failed to queue command:', queueError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to queue command',
        error: queueError.message,
        user_id: record.id,
        numeric_id: numericId
      }), {
        status: 200, // Don't fail the webhook
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SYNC] Command queued successfully, ID:', queueEntry?.id);

    // Update enrollment record with numeric ID
    console.log('[SYNC] Step 10: Updating enrollment record in database');
    try {
      const { error: enrollError } = await supabase
        .from('turnstile_face_enrollments')
        .upsert({
          user_id: record.id,
          device_sn: targetDeviceSn,
          person_id: numericId.substring(0, 19), // Store the numeric ID
          customer_text: numericId, // Store full numeric ID for reference
          enrolled_at: new Date().toISOString(),
          revoked_at: null
        }, {
          onConflict: 'device_sn,user_id'
        });

      if (enrollError) {
        console.warn('[SYNC] Step 10 WARNING: Could not update enrollment record:', enrollError.message);
      } else {
        console.log('[SYNC] Step 10 SUCCESS: Enrollment record updated with numeric ID:', numericId);
      }
    } catch (dbError) {
      console.warn('[SYNC] Step 10 EXCEPTION: Database update failed:', dbError);
    }

    console.log('========================================');
    console.log('[SYNC] COMPLETE: Command queued for user:', record.id, '-> numeric:', numericId);
    console.log('[SYNC] Mode: DATA ONLY (no image)');
    console.log('[SYNC] Queue ID:', queueEntry?.id);
    console.log('========================================');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Command queued for device (piggyback)',
      user_id: record.id,
      numeric_id: numericId,
      had_image: false, // Always false - image disabled for testing
      queue_id: queueEntry?.id,
      device_sn: targetDeviceSn
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('========================================');
    console.error('[SYNC] CRITICAL ERROR:', error);
    console.error('========================================');
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 200, // Don't fail the webhook to avoid retries
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
