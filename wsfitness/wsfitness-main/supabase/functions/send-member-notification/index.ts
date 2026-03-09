import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'approved' | 'rejected' | 'payment_approved' | 'payment_rejected';
  email: string;
  name: string;
  memberId?: string;
  role?: string;
  reason?: string;
  orderId?: string;
  planType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, name, memberId, role, reason, orderId, planType }: NotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${email} for ${name}`);

    let subject: string;
    let html: string;

    if (type === 'approved') {
      const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
      subject = "🎉 Your WS Fitness Membership is Approved!";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .member-id { background: #fff; border: 2px dashed #10b981; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .member-id-code { font-size: 24px; font-weight: bold; color: #10b981; letter-spacing: 2px; }
            .role-badge { display: inline-block; background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .cta { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to WS Fitness!</h1>
              <p style="margin: 10px 0 0;">Your membership has been approved</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Great news! Your membership application has been approved. You now have full access to WS Fitness facilities and services.</p>
              
              <div class="member-id">
                <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Your Member ID</p>
                <div class="member-id-code">${memberId || 'N/A'}</div>
              </div>
              
              <p><strong>Account Type:</strong> <span class="role-badge">${roleLabel}</span></p>
              
              <p>What you can do now:</p>
              <ul>
                <li>Access the gym with your QR code</li>
                <li>Book classes and sessions</li>
                <li>Enjoy member perks and discounts</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="https://wsfitness.my/auth" class="cta">Login to Your Account</a>
              </p>
              
              <div class="footer">
                <p>WS Fitness - Your Fitness Journey Starts Here</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'payment_approved') {
      subject = "✅ Payment Verified - Membership Activated!";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: #fff; border: 2px solid #10b981; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .order-id { font-size: 18px; font-weight: bold; color: #10b981; letter-spacing: 1px; font-family: monospace; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .cta { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
            .success-icon { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1 style="margin: 10px 0 0;">Payment Verified!</h1>
              <p style="margin: 10px 0 0;">Your membership is now active</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Great news! Your payment has been verified and your membership is now <strong>active</strong>.</p>
              
              <div class="order-box">
                <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Order Reference</p>
                <div class="order-id">${orderId || 'N/A'}</div>
                <p style="margin: 10px 0 0; font-size: 14px; color: #333;">Plan: <strong>${planType || 'Standard'}</strong></p>
              </div>
              
              <p>You can now:</p>
              <ul>
                <li>✅ Access the gym with your QR code</li>
                <li>✅ Book classes and sessions</li>
                <li>✅ Enjoy all member perks and discounts</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="https://wsfitness.my/member" class="cta">Go to Dashboard</a>
              </p>
              
              <div class="footer">
                <p>Thank you for being a WS Fitness member!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'payment_rejected') {
      subject = "⚠️ Payment Verification Failed - Action Required";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: #fff; border: 2px solid #ef4444; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .order-id { font-size: 18px; font-weight: bold; color: #ef4444; letter-spacing: 1px; font-family: monospace; }
            .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .cta { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
            .warning-icon { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="warning-icon">⚠️</div>
              <h1 style="margin: 10px 0 0;">Payment Rejected</h1>
              <p style="margin: 10px 0 0;">Action required</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Unfortunately, we were unable to verify your payment for the following order:</p>
              
              <div class="order-box">
                <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Order Reference</p>
                <div class="order-id">${orderId || 'N/A'}</div>
                <p style="margin: 10px 0 0; font-size: 14px; color: #333;">Plan: <strong>${planType || 'Standard'}</strong></p>
              </div>
              
              ${reason ? `
              <div class="reason-box">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Reason for Rejection:</p>
                <p style="margin: 10px 0 0;">${reason}</p>
              </div>
              ` : ''}
              
              <p><strong>What to do next:</strong></p>
              <ol>
                <li>Log in to your account</li>
                <li>Go to Profile → Payment History</li>
                <li>Click "Re-upload Receipt" for the rejected order</li>
                <li>Upload a clear, valid payment receipt</li>
              </ol>
              
              <p style="text-align: center;">
                <a href="https://wsfitness.my/member/profile" class="cta">Re-upload Receipt</a>
              </p>
              
              <p style="font-size: 14px; color: #666;">If you have questions, please contact us at <a href="mailto:support@wsfitness.my">support@wsfitness.my</a>.</p>
              
              <div class="footer">
                <p>WS Fitness Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Original rejected type (membership application rejection)
      subject = "WS Fitness Application Update";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Application Update</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Thank you for your interest in joining WS Fitness.</p>
              <p>After reviewing your application, we regret to inform you that we are unable to approve your membership at this time.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>If you believe this was a mistake or would like more information, please contact our team at <a href="mailto:support@wsfitness.my">support@wsfitness.my</a>.</p>
              <p>We appreciate your understanding.</p>
              <div class="footer">
                <p>WS Fitness Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "WS Fitness <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);