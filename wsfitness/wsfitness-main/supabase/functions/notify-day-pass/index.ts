import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

/**
 * Day Pass Reminder Notification
 * 
 * This function should be scheduled to run at 8:00 AM daily.
 * It finds all Day Pass holders whose valid_from date is today
 * and sends them a reminder notification.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('resend_api_key'));

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Checking for Day Passes valid on: ${todayStr}`);

    // Find all memberships where:
    // - valid_from is today
    // - plan_type contains 'day pass' (case insensitive)
    // - status is 'active'
    const { data: dayPasses, error: fetchError } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        plan_type,
        valid_from,
        expiry_date,
        profiles (
          name,
          email
        )
      `)
      .eq('valid_from', todayStr)
      .eq('status', 'active')
      .or('plan_type.ilike.%day pass%,plan_type.ilike.%day-pass%,plan_type.ilike.%daypass%');

    if (fetchError) {
      console.error('Error fetching day passes:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dayPasses?.length || 0} day passes for today`);

    const results = {
      total: dayPasses?.length || 0,
      notified: 0,
      errors: [] as string[],
    };

    // Send notifications for each day pass
    for (const pass of dayPasses || []) {
      const profileData = pass.profiles as unknown as { name: string; email: string | null } | null;
      
      if (!profileData?.email) {
        console.log(`Skipping user ${pass.user_id} - no email`);
        continue;
      }

      const profile = profileData;

      try {
        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: pass.user_id,
            title: '🎫 Your Day Pass is Active!',
            message: `Your Day Pass is valid today. Show your QR code at the entrance to check in. Pass expires at 11:59 PM.`,
            type: 'reminder',
            link: '/member/dashboard',
          });

        if (notifError) {
          console.error(`Notification insert error for ${pass.user_id}:`, notifError);
        }

        // Send email notification
        const emailResult = await resend.emails.send({
          from: 'WS Fitness <noreply@wsfitness.com>',
          to: [profile.email!],
          subject: '🎫 Your Day Pass is Active Today!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #10b981;">Your Day Pass is Ready!</h1>
              <p>Hi ${profile.name || 'Member'},</p>
              <p>This is a reminder that your <strong>Day Pass</strong> is valid today.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Valid Date:</strong> ${new Date(pass.valid_from).toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="margin: 10px 0 0;"><strong>Expires:</strong> 11:59 PM</p>
              </div>
              <p>📱 Open the app and show your QR code at the entrance to check in.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                See you at the gym!<br>
                <strong>WS Fitness Team</strong>
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${profile.email}:`, emailResult);
        results.notified++;
      } catch (emailError: any) {
        console.error(`Email error for ${profile.email}:`, emailError);
        results.errors.push(`${profile.email}: ${emailError.message}`);
      }
    }

    console.log('Day pass notifications complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Notify day pass error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
