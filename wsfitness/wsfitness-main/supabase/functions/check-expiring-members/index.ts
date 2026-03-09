import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date exactly 7 days from now
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    // Format as YYYY-MM-DD for date comparison
    const targetDate = sevenDaysFromNow.toISOString().split('T')[0];
    
    console.log(`Checking for memberships expiring on: ${targetDate}`);

    // Find active memberships expiring exactly 7 days from now
    const { data: expiringMemberships, error: fetchError } = await supabase
      .from("memberships")
      .select(`
        user_id,
        expiry_date,
        plan_type,
        profiles!inner(name, email)
      `)
      .eq("status", "active")
      .gte("expiry_date", targetDate)
      .lt("expiry_date", targetDate + "T23:59:59");

    if (fetchError) {
      console.error("Error fetching expiring memberships:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringMemberships?.length || 0} memberships expiring in 7 days`);

    let notificationsCreated = 0;
    let skipped = 0;

    for (const membership of expiringMemberships || []) {
      const userId = membership.user_id;
      const profile = membership.profiles as any;
      const userName = profile?.name || "Member";

      // Check if we already sent this notification today (prevent duplicates)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "expiry_reminder")
        .gte("created_at", todayStart.toISOString())
        .maybeSingle();

      if (existingNotif) {
        console.log(`Skipping duplicate notification for user: ${userId}`);
        skipped++;
        continue;
      }

      // Insert notification
      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "🔔 Renew Soon!",
          message: `Hi ${userName.split(' ')[0]}! Your membership expires in 7 days. Renew now to avoid interruption.`,
          type: "expiry_reminder",
          is_read: false,
          link: "/member/perks",
        });

      if (insertError) {
        console.error(`Failed to create notification for user ${userId}:`, insertError);
      } else {
        console.log(`Created expiry reminder for user: ${userId}`);
        notificationsCreated++;
      }
    }

    const result = {
      success: true,
      targetDate,
      membershipsFound: expiringMemberships?.length || 0,
      notificationsCreated,
      skipped,
      timestamp: new Date().toISOString(),
    };

    console.log("Check complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-expiring-members:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
