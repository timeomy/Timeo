import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find memberships expiring in exactly 7 days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    console.log(`Looking for memberships expiring on: ${targetDateStr}`);

    const { data: expiringMemberships, error: fetchError } = await supabase
      .from("memberships")
      .select(`
        id,
        user_id,
        expiry_date,
        plan_type,
        profiles:user_id (name, email)
      `)
      .eq("status", "active")
      .eq("expiry_date", targetDateStr);

    if (fetchError) {
      console.error("Error fetching memberships:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringMemberships?.length || 0} memberships expiring in 7 days`);

    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    for (const membership of expiringMemberships || []) {
      // profiles join may return an array or single object depending on Supabase version
      const profilesData = membership.profiles;
      const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
      
      if (!profile?.email) {
        console.log(`No email found for user ${membership.user_id}`);
        continue;
      }

      try {
        const emailResponse = await resend.emails.send({
          from: "WS Fitness <onboarding@resend.dev>",
          to: [profile.email],
          subject: "Your WS Fitness Membership Expires in 7 Days",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                .highlight { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⏰ Membership Expiring Soon</h1>
                </div>
                <div class="content">
                  <p>Hi ${profile.name || "Member"},</p>
                  
                  <div class="highlight">
                    <strong>Your ${membership.plan_type || "standard"} membership expires on ${membership.expiry_date}!</strong>
                  </div>
                  
                  <p>That's just 7 days away. Don't miss out on:</p>
                  <ul>
                    <li>Unlimited gym access</li>
                    <li>Exclusive member perks and discounts</li>
                    <li>Partner vendor vouchers</li>
                  </ul>
                  
                  <p>Contact us today to renew your membership and continue your fitness journey!</p>
                  
                  <p>See you at the gym,<br><strong>WS Fitness Team</strong></p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} WS Fitness. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent to ${profile.email}:`, emailResponse);
        emailsSent.push(profile.email);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        emailsFailed.push(profile.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiringMemberships?.length || 0,
        emailsSent: emailsSent.length,
        emailsFailed: emailsFailed.length,
        details: { sent: emailsSent, failed: emailsFailed },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
