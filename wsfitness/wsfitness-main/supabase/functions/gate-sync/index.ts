import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert image URL to Base64
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`gate-sync: Failed to fetch image from ${imageUrl}: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    // Check size - skip if over 1MB to prevent timeouts
    if (arrayBuffer.byteLength > 1 * 1024 * 1024) {
      console.log(`gate-sync: Image too large (${arrayBuffer.byteLength} bytes), skipping base64 conversion`);
      return null;
    }
    
    // Convert to base64
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    // Return with data URI prefix for proper display
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`gate-sync: Error fetching image: ${error}`);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request body
    let lastSyncTimestamp: string | null = null;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        lastSyncTimestamp = body.last_sync_timestamp || null;
      } catch {
        // If no body or invalid JSON, proceed without timestamp filter
      }
    }

    console.log(`gate-sync: Fetching members since ${lastSyncTimestamp || 'beginning'}`);

    // Build query for members with their profiles
    let query = supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        status,
        expiry_date,
        valid_from,
        updated_at,
        profiles!inner (
          name,
          member_id,
          avatar_url,
          updated_at
        )
      `)
      .not('profiles.member_id', 'is', null); // Only members with assigned member_id

    // Filter by last sync timestamp if provided
    if (lastSyncTimestamp) {
      // Get members where either membership or profile was updated after last sync
      const syncDate = new Date(lastSyncTimestamp).toISOString();
      query = query.or(`updated_at.gte.${syncDate},profiles.updated_at.gte.${syncDate}`);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error('gate-sync: Query error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`gate-sync: Found ${members?.length || 0} members to sync`);

    // Process members and fetch photos
    const syncedMembers = [];
    
    for (const member of members || []) {
      const profile = member.profiles as any;
      if (!profile || !profile.member_id) continue;
      
      // Determine status based on expiry date
      let status = member.status;
      if (member.expiry_date) {
        const expiryDate = new Date(member.expiry_date);
        const now = new Date();
        if (expiryDate < now) {
          status = 'expired';
        }
      }
      
      // Fetch photo as base64 if avatar exists
      let photoBase64: string | null = null;
      if (profile.avatar_url) {
        photoBase64 = await fetchImageAsBase64(profile.avatar_url);
      }
      
      syncedMembers.push({
        member_id: profile.member_id,
        name: profile.name,
        status: status,
        valid_from: member.valid_from || null,
        valid_until: member.expiry_date || null,
        photo_base64: photoBase64,
      });
    }

    const response = {
      sync_time: new Date().toISOString(),
      member_count: syncedMembers.length,
      members: syncedMembers,
    };

    console.log(`gate-sync: Returning ${syncedMembers.length} members with ${syncedMembers.filter(m => m.photo_base64).length} photos`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("gate-sync: Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
