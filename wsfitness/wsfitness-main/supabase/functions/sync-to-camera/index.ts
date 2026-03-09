import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileRecord {
  id: string;
  name: string;
  avatar_url: string | null;
  member_id: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: ProfileRecord;
  old_record: ProfileRecord | null;
}

const MAX_SIZE = 640;
const MAX_BYTES = 200 * 1024; // 200KB
const INITIAL_QUALITY = 80;
const MIN_QUALITY = 30;

/**
 * Compress image to JPEG, resize to max 640x640, and ensure under 200KB
 */
async function compressImage(imageData: Uint8Array): Promise<Uint8Array> {
  try {
    // Decode the image
    const image = await Image.decode(imageData);
    
    // Calculate new dimensions maintaining aspect ratio
    let width = image.width;
    let height = image.height;
    
    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width > height) {
        height = Math.round((height / width) * MAX_SIZE);
        width = MAX_SIZE;
      } else {
        width = Math.round((width / height) * MAX_SIZE);
        height = MAX_SIZE;
      }
    }
    
    // Resize if needed
    const resized = (width !== image.width || height !== image.height) 
      ? image.resize(width, height) 
      : image;
    
    console.log(`[sync-to-camera] Resized to ${width}x${height}`);
    
    // Encode as JPEG with quality reduction until under MAX_BYTES
    let quality = INITIAL_QUALITY;
    let encoded = await resized.encodeJPEG(quality);
    
    while (encoded.length > MAX_BYTES && quality > MIN_QUALITY) {
      quality -= 10;
      encoded = await resized.encodeJPEG(quality);
      console.log(`[sync-to-camera] Quality ${quality}, size: ${encoded.length} bytes`);
    }
    
    console.log(`[sync-to-camera] Final size: ${encoded.length} bytes (quality: ${quality})`);
    return encoded;
  } catch (error) {
    console.error('[sync-to-camera] Image compression failed:', error);
    throw error;
  }
}

/**
 * Fetch image from URL, compress, and convert to raw Base64 string
 */
async function fetchImageAsBase64(supabase: any, avatarUrl: string): Promise<string | null> {
  try {
    console.log('[sync-to-camera] Processing image:', avatarUrl);
    
    let imageData: Uint8Array;
    
    // Handle Supabase storage URLs
    if (avatarUrl.includes('/storage/v1/object/')) {
      const pathMatch = avatarUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/(.+)/);
      if (pathMatch) {
        const fullPath = pathMatch[1];
        const [bucket, ...filePathParts] = fullPath.split('/');
        const filePath = filePathParts.join('/');
        
        console.log(`[sync-to-camera] Downloading from bucket: ${bucket}, path: ${filePath}`);
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(filePath);
        
        if (error) {
          console.error('[sync-to-camera] Storage download error:', error);
          return null;
        }
        
        if (data) {
          const arrayBuffer = await data.arrayBuffer();
          imageData = new Uint8Array(arrayBuffer);
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      // Handle external URLs
      console.log('[sync-to-camera] Fetching external image URL');
      const response = await fetch(avatarUrl);
      
      if (!response.ok) {
        console.error('[sync-to-camera] Failed to fetch image:', response.status);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      imageData = new Uint8Array(arrayBuffer);
    }
    
    // Compress the image (always outputs JPEG)
    const compressedData = await compressImage(imageData);
    
    // Convert to raw Base64 string (no data URI prefix)
    let binary = '';
    for (let i = 0; i < compressedData.length; i++) {
      binary += String.fromCharCode(compressedData[i]);
    }
    let base64 = btoa(binary);
    
    // CRITICAL: Strip any data URI prefix if present - device requires raw base64 starting with /9j/
    base64 = base64
      .replace(/^data:image\/jpeg;base64,/i, '')
      .replace(/^data:image\/png;base64,/i, '')
      .replace(/^data:image\/[^;]+;base64,/i, '');
    
    // Verify it starts with JPEG magic bytes (/9j/ in base64)
    if (!base64.startsWith('/9j/')) {
      console.warn(`[sync-to-camera] Warning: Base64 does not start with /9j/ (JPEG magic). Got: ${base64.substring(0, 10)}...`);
    }
    
    console.log(`[sync-to-camera] Final Base64 length: ${base64.length}, starts with: ${base64.substring(0, 4)}`);
    return base64;
    
  } catch (error) {
    console.error('[sync-to-camera] Image processing error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-to-camera] Function invoked');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const turnstileSecret = Deno.env.get('TURNSTILE_SHARED_SECRET');
    
    if (!turnstileSecret) {
      console.error('[sync-to-camera] TURNSTILE_SHARED_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'TURNSTILE_SHARED_SECRET not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    console.log('[sync-to-camera] Webhook payload:', JSON.stringify({
      type: payload.type,
      table: payload.table,
      record_id: payload.record?.id
    }));
    
    // Skip DELETE events
    if (payload.type === 'DELETE') {
      console.log('[sync-to-camera] Skipping DELETE event');
      return new Response(
        JSON.stringify({ success: true, message: 'DELETE event skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const record = payload.record;
    
    // Skip if no avatar URL
    if (!record.avatar_url) {
      console.log('[sync-to-camera] No avatar_url, skipping sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No avatar, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // On UPDATE, check if avatar actually changed
    if (payload.type === 'UPDATE' && payload.old_record) {
      if (record.avatar_url === payload.old_record.avatar_url && 
          record.name === payload.old_record.name) {
        console.log('[sync-to-camera] No relevant changes, skipping');
        return new Response(
          JSON.stringify({ success: true, message: 'No changes to sync' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Fetch and convert image to raw Base64
    const base64Image = await fetchImageAsBase64(supabase, record.avatar_url);
    
    if (!base64Image) {
      console.error('[sync-to-camera] Failed to process image');
      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Sanitize UUID: remove dashes and limit to 16 characters (device requirement)
    const cleanId = record.id.replace(/-/g, '').substring(0, 16);
    
    // Build the camera payload
    const cameraPayload = {
      cmd: 'upload person',
      id: cleanId,
      name: record.name || '',
      role: 1,
      reg_image: base64Image,
      upload_mode: 0
    };
    
    console.log('[sync-to-camera] Sending to camera bridge:', {
      cmd: cameraPayload.cmd,
      id: cameraPayload.id,
      name: cameraPayload.name,
      role: cameraPayload.role,
      upload_mode: cameraPayload.upload_mode,
      reg_image_length: base64Image.length
    });
    
    // Send to Cloudflare Bridge
    const bridgeResponse = await fetch('https://gate.wsfitness.my/turnstile/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${turnstileSecret}`
      },
      body: JSON.stringify(cameraPayload)
    });
    
    const bridgeResult = await bridgeResponse.text();
    console.log('[sync-to-camera] Bridge response:', bridgeResponse.status, bridgeResult);
    
    if (!bridgeResponse.ok) {
      // If the bridge is reachable but reports the camera is disconnected, return a 200 so
      // client-side manual sync can show a friendly message without treating it as a hard failure.
      const isCameraDisconnected =
        bridgeResponse.status === 503 &&
        typeof bridgeResult === 'string' &&
        bridgeResult.includes('Camera disconnected');

      const responseBody = {
        success: false,
        error: 'Bridge request failed',
        status: bridgeResponse.status,
        response: bridgeResult,
        camera_disconnected: isCameraDisconnected,
      };

      return new Response(JSON.stringify(responseBody), {
        status: isCameraDisconnected ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Parse bridge response
    let responseData;
    try {
      responseData = JSON.parse(bridgeResult);
    } catch {
      responseData = { raw: bridgeResult };
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Synced to camera',
        user_id: record.id,
        clean_id: cleanId,
        bridge_response: responseData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-to-camera] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
