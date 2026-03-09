import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("expire-memberships: Starting membership expiry check");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Find all active memberships that have expired
    const { data: expiredMemberships, error: fetchError } = await supabaseAdmin
      .from("memberships")
      .select("id, user_id, expiry_date")
      .eq("status", "active")
      .not("expiry_date", "is", null)
      .lt("expiry_date", today);

    if (fetchError) {
      console.error("expire-memberships: Error fetching memberships", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredMemberships || expiredMemberships.length === 0) {
      console.log("expire-memberships: No expired memberships found");
      return new Response(
        JSON.stringify({ success: true, message: "No expired memberships", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`expire-memberships: Found ${expiredMemberships.length} expired memberships`);

    // Update all expired memberships to 'expired' status
    const expiredIds = expiredMemberships.map(m => m.id);
    const { error: updateError } = await supabaseAdmin
      .from("memberships")
      .update({ status: "expired" })
      .in("id", expiredIds);

    if (updateError) {
      console.error("expire-memberships: Error updating memberships", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`expire-memberships: Successfully expired ${expiredIds.length} memberships`);

    // Log the action for audit purposes
    await supabaseAdmin.from("audit_logs").insert({
      action_type: "memberships_auto_expired",
      actor_id: "00000000-0000-0000-0000-000000000000", // System action
      actor_name: "System (Auto-Expiry)",
      details: {
        expired_count: expiredIds.length,
        membership_ids: expiredIds,
        run_date: today,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Expired ${expiredIds.length} memberships`,
        count: expiredIds.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("expire-memberships: Unexpected error", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});