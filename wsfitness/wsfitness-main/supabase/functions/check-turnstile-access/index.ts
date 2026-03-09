import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ allowed: false, name: "Unknown", message: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { id } = await req.json();

    // Early return for invalid or "Unknown" IDs to prevent DB crashes
    if (!id || typeof id !== "string" || id === "Unknown") {
      console.log(`Rejected invalid ID: ${id}`);
      return new Response(
        JSON.stringify({ allowed: false, name: "Unknown", message: "Invalid ID" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the ID looks like a UUID (for auth.users id lookup)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);

    // Search profiles by member_id or nfc_card_id first (always safe)
    // Only include UUID lookup if the ID is a valid UUID format
    let profile = null;
    let profileError = null;

    if (isUuid) {
      // If it's a UUID, search by all three fields
      const result = await supabase
        .from("profiles")
        .select("id, name, member_id, nfc_card_id")
        .or(`id.eq.${id},member_id.eq.${id},nfc_card_id.eq.${id}`)
        .maybeSingle();
      profile = result.data;
      profileError = result.error;
    } else {
      // If not a UUID, only search by member_id and nfc_card_id
      const result = await supabase
        .from("profiles")
        .select("id, name, member_id, nfc_card_id")
        .or(`member_id.eq.${id},nfc_card_id.eq.${id}`)
        .maybeSingle();
      profile = result.data;
      profileError = result.error;
    }

    if (profileError) {
      console.error("Profile query error:", profileError);
      return new Response(
        JSON.stringify({ allowed: false, name: "Unknown", message: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      console.log(`No profile found for ID: ${id}`);
      return new Response(
        JSON.stringify({ allowed: false, name: "Unknown", message: "Not Found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check membership status
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("status, expiry_date")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership query error:", membershipError);
      return new Response(
        JSON.stringify({ allowed: false, name: profile.name || "Unknown", message: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.name || "Unknown";

    if (!membership) {
      console.log(`No membership found for user: ${profile.id}`);
      return new Response(
        JSON.stringify({ allowed: false, name: userName, message: "No membership" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if status is active or paid
    const validStatuses = ["active", "paid"];
    const isStatusValid = validStatuses.includes(membership.status?.toLowerCase());

    // Check if not expired
    const now = new Date();
    const expiryDate = membership.expiry_date ? new Date(membership.expiry_date) : null;
    const isNotExpired = !expiryDate || expiryDate >= now;

    if (isStatusValid && isNotExpired) {
      console.log(`Access granted for: ${userName} (${profile.id})`);
      return new Response(
        JSON.stringify({ allowed: true, name: userName, message: "Welcome" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log(`Access denied for: ${userName} - Status: ${membership.status}, Expiry: ${membership.expiry_date}`);
      return new Response(
        JSON.stringify({ allowed: false, name: userName, message: "Expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ allowed: false, name: "Unknown", message: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
