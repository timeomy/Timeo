import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendorGroup {
  vendor: any;
  vouchers: any[];
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
    
    // Get vouchers expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: expiringVouchers, error: vouchersError } = await supabase
      .from('vouchers')
      .select('*, vendors(id, business_name, user_id, profiles:user_id(name, email))')
      .eq('status', 'valid')
      .not('expires_at', 'is', null)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString());

    if (vouchersError) {
      console.error('Error fetching expiring vouchers:', vouchersError);
      throw vouchersError;
    }

    console.log(`Found ${expiringVouchers?.length || 0} vouchers expiring soon`);

    const notificationsSent: string[] = [];
    const errors: string[] = [];

    // Group vouchers by vendor
    const vouchersByVendor = (expiringVouchers || []).reduce((acc: Record<string, VendorGroup>, voucher: any) => {
      const vendorId = voucher.vendor_id;
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: voucher.vendors,
          vouchers: [],
        };
      }
      acc[vendorId].vouchers.push(voucher);
      return acc;
    }, {});

    // Send notifications to each vendor
    for (const [vendorId, group] of Object.entries(vouchersByVendor) as [string, VendorGroup][]) {
      const { vendor, vouchers } = group;
      const vendorEmail = vendor?.profiles?.email;
      const vendorName = vendor?.profiles?.name || vendor?.business_name;

      if (!vendorEmail || !vendor?.user_id) {
        console.log(`No email or user_id for vendor ${vendorId}`);
        continue;
      }

      try {
        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: vendor.user_id,
          type: 'voucher_expiring',
          title: 'Vouchers Expiring Soon',
          message: `You have ${vouchers.length} voucher(s) expiring within the next 7 days.`,
          link: '/vendor/dashboard',
        });

        if (resend) {
          // Build voucher list HTML
          const voucherListHtml = vouchers.map((v: any) => {
            const expiresAt = new Date(v.expires_at);
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #333;">${v.title}</td>
                <td style="padding: 12px; border-bottom: 1px solid #333; font-family: monospace; color: #00d4aa;">${v.code}</td>
                <td style="padding: 12px; border-bottom: 1px solid #333;">RM${v.value}</td>
                <td style="padding: 12px; border-bottom: 1px solid #333; color: ${daysLeft <= 3 ? '#ef4444' : '#f59e0b'};">${daysLeft} day(s)</td>
              </tr>
            `;
          }).join('');

          // Send email
          await resend.emails.send({
            from: "WS Fitness <onboarding@resend.dev>",
            to: [vendorEmail],
            subject: `⚠️ ${vouchers.length} Voucher(s) Expiring Soon`,
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
                      <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">⚠️ Vouchers Expiring Soon</h1>
                    </div>
                    
                    <p style="color: #888; margin-bottom: 24px;">Hi ${vendorName},</p>
                    
                    <p style="color: #888; margin-bottom: 24px;">
                      You have <strong style="color: #f59e0b;">${vouchers.length}</strong> voucher(s) expiring within the next 7 days.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <thead>
                        <tr style="background: #1a1a1a;">
                          <th style="padding: 12px; text-align: left; border-bottom: 1px solid #333; color: #888;">Title</th>
                          <th style="padding: 12px; text-align: left; border-bottom: 1px solid #333; color: #888;">Code</th>
                          <th style="padding: 12px; text-align: left; border-bottom: 1px solid #333; color: #888;">Value</th>
                          <th style="padding: 12px; text-align: left; border-bottom: 1px solid #333; color: #888;">Expires In</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${voucherListHtml}
                      </tbody>
                    </table>
                    
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; text-align: center;">
                      <p style="color: #666; font-size: 12px; margin: 0;">WS Fitness - Your Fitness Partner</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
        }

        notificationsSent.push(vendorId);
        console.log(`Expiry notification sent to vendor ${vendorId}`);
      } catch (emailError: any) {
        console.error(`Error sending notification to vendor ${vendorId}:`, emailError);
        errors.push(`${vendorId}: ${emailError.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notificationsSent: notificationsSent.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-voucher-expiry:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
