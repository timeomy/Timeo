import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("resend_api_key"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Email hook received payload:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    
    if (!user?.email) {
      console.error("No user email in payload");
      return new Response(JSON.stringify({ error: "No user email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { token_hash, redirect_to, email_action_type } = email_data || {};
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    
    let subject = "";
    let htmlContent = "";
    
    // Build the action link
    const actionLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || "")}`;
    
    switch (email_action_type) {
      case "recovery":
        subject = "Reset Your Password - WS Fitness";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #5eead4; margin: 0; font-size: 24px;">WS FITNESS</h1>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="color: #a1a1aa; text-align: center; margin-bottom: 30px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${actionLink}" style="display: inline-block; background-color: #5eead4; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #71717a; text-align: center; font-size: 14px;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="color: #52525b; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} WS Fitness. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `;
        break;
        
      case "signup":
      case "email_confirmation":
        subject = "Confirm Your Email - WS Fitness";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #5eead4; margin: 0; font-size: 24px;">WS FITNESS</h1>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin-bottom: 20px;">Confirm Your Email</h2>
              <p style="color: #a1a1aa; text-align: center; margin-bottom: 30px;">
                Welcome to WS Fitness! Please confirm your email address to get started.
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${actionLink}" style="display: inline-block; background-color: #5eead4; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Confirm Email
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="color: #52525b; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} WS Fitness. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `;
        break;
        
      case "magiclink":
        subject = "Your Login Link - WS Fitness";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #5eead4; margin: 0; font-size: 24px;">WS FITNESS</h1>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin-bottom: 20px;">Your Login Link</h2>
              <p style="color: #a1a1aa; text-align: center; margin-bottom: 30px;">
                Click the button below to log in to your account.
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${actionLink}" style="display: inline-block; background-color: #5eead4; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Log In
                </a>
              </div>
              <p style="color: #71717a; text-align: center; font-size: 14px;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="color: #52525b; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} WS Fitness. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `;
        break;
        
      default:
        subject = "WS Fitness Notification";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #5eead4; margin: 0; font-size: 24px;">WS FITNESS</h1>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin-bottom: 20px;">Account Notification</h2>
              <p style="color: #a1a1aa; text-align: center; margin-bottom: 30px;">
                Click the link below to continue.
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${actionLink}" style="display: inline-block; background-color: #5eead4; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Continue
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="color: #52525b; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} WS Fitness. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `;
    }

    console.log(`Sending ${email_action_type} email to ${user.email}`);
    
    const emailResponse = await resend.emails.send({
      from: "WS Fitness <noreply@wsfitness.my>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in email-hook function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
