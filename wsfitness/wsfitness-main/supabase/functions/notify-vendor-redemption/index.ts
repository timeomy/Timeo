import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedemptionNotificationRequest {
  vendorId: string;
  voucherTitle: string;
  voucherCode: string;
  voucherValue: number;
  remainingRedemptions?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { vendorId, voucherTitle, voucherCode, voucherValue, remainingRedemptions }: RedemptionNotificationRequest = await req.json();

    // Get vendor details with profile email
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*, profiles:user_id(name, email)')
      .eq('id', vendorId)
      .maybeSingle();

    if (vendorError || !vendor) {
      console.error('Vendor fetch error:', vendorError);
      return new Response(JSON.stringify({ error: 'Vendor not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const vendorEmail = (vendor as any).profiles?.email;
    const vendorName = (vendor as any).profiles?.name || (vendor as any).business_name;

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: (vendor as any).user_id,
      type: 'voucher_redeemed',
      title: 'Voucher Redeemed!',
      message: `Your voucher "${voucherTitle}" (${voucherCode}) worth RM${voucherValue} was just redeemed.${remainingRedemptions !== undefined ? ` ${remainingRedemptions} redemption(s) remaining.` : ''}`,
      link: '/vendor/history',
    });

    // Send email notification if Resend is configured and email exists
    let emailResponse = null;
    if (resend && vendorEmail) {
      emailResponse = await resend.emails.send({
        from: "WS Fitness <onboarding@resend.dev>",
        to: [vendorEmail],
        subject: `Voucher Redeemed: ${voucherCode}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 32px; border: 1px solid #333;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #00d4aa; margin: 0; font-size: 28px;">🎉 Voucher Redeemed!</h1>
                </div>
                
                <p style="color: #888; margin-bottom: 24px;">Hi ${vendorName},</p>
                
                <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #333;">
                  <p style="color: #888; margin: 0 0 8px;">Voucher Details:</p>
                  <p style="color: #fff; font-size: 18px; margin: 0 0 8px; font-weight: 600;">${voucherTitle}</p>
                  <p style="color: #00d4aa; font-family: monospace; font-size: 16px; margin: 0 0 8px;">${voucherCode}</p>
                  <p style="color: #00d4aa; font-size: 24px; font-weight: bold; margin: 0;">RM${voucherValue}</p>
                  ${remainingRedemptions !== undefined ? `<p style="color: #888; font-size: 14px; margin: 16px 0 0;">${remainingRedemptions} redemption(s) remaining</p>` : ''}
                </div>
                
                <p style="color: #888; font-size: 14px; margin: 0;">
                  This voucher was redeemed just now.
                </p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; text-align: center;">
                  <p style="color: #666; font-size: 12px; margin: 0;">WS Fitness - Your Fitness Partner</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Redemption notification email sent:", emailResponse);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-vendor-redemption:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
