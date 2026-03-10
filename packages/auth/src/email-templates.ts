/**
 * Timeo branded email templates for authentication flows.
 * All templates use inline CSS for maximum email client compatibility.
 */

const BRAND_COLOR = "#D4A017"; // Timeo gold
const BRAND_COLOR_DARK = "#B8860B";
const BG_COLOR = "#1a1a1a";
const CARD_BG = "#2a2a2a";
const TEXT_COLOR = "#e0e0e0";
const TEXT_MUTED = "#999999";
const BORDER_COLOR = "#3a3a3a";

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timeo</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${BRAND_COLOR};width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;">
                    <span style="color:#1a1a1a;font-size:20px;font-weight:bold;">⚡</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Timeo</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${CARD_BG};border:1px solid ${BORDER_COLOR};border-radius:12px;padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.5;">
                &copy; ${new Date().getFullYear()} Timeo. All rights reserved.
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MUTED};line-height:1.5;">
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding:28px 0 8px;">
      <a href="${url}" target="_blank" style="display:inline-block;background-color:${BRAND_COLOR};color:#1a1a1a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;letter-spacing:0.2px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:${TEXT_MUTED};line-height:1.5;word-break:break-all;">
  If the button doesn't work, copy and paste this link into your browser:<br>
  <a href="${url}" style="color:${BRAND_COLOR};text-decoration:underline;">${url}</a>
</p>`;
}

// ─── Password Reset ──────────────────────────────────────────────

export function passwordResetEmail(params: {
  name: string;
  url: string;
}): { subject: string; html: string } {
  const { name, url } = params;
  const firstName = name.split(" ")[0] || "there";

  return {
    subject: "Reset your Timeo password",
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Reset your password</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
        Hi ${firstName}, we received a request to reset the password for your Timeo account. Click the button below to choose a new password.
      </p>
      ${button(url, "Reset Password")}
      <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
        This link will expire in <strong style="color:${TEXT_COLOR};">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
      </p>
      ${fallbackLink(url)}
    `),
  };
}

// ─── Email Verification ──────────────────────────────────────────

export function verificationEmail(params: {
  name: string;
  url: string;
}): { subject: string; html: string } {
  const { name, url } = params;
  const firstName = name.split(" ")[0] || "there";

  return {
    subject: "Verify your Timeo email",
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Verify your email</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
        Hi ${firstName}, welcome to Timeo! Please verify your email address to get started.
      </p>
      ${button(url, "Verify Email")}
      <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
        If you didn't create a Timeo account, you can safely ignore this email.
      </p>
      ${fallbackLink(url)}
    `),
  };
}

// ─── Tenant Invite ───────────────────────────────────────────────

export function tenantInviteEmail(opts: {
  name: string;
  businessName: string;
  tempPassword: string;
  signInUrl: string;
}): { subject: string; html: string } {
  const { name, businessName, tempPassword, signInUrl } = opts;
  const firstName = name.split(" ")[0] || "there";

  return {
    subject: `You have been invited to join ${businessName} on Timeo`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">You're invited!</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
        Hi ${firstName}, you have been added as a business admin for <strong style="color:#ffffff;">${businessName}</strong> on Timeo. Sign in to get started.
      </p>
      <div style="margin:0 0 24px;padding:16px 20px;background-color:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.2);border-radius:8px;">
        <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">Your temporary password</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:2px;font-family:monospace;">${tempPassword}</p>
      </div>
      ${button(signInUrl, "Sign In to Timeo")}
      <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
        You will be prompted to change your password after signing in. If you did not expect this invitation, please contact <a href="mailto:support@timeo.my" style="color:${BRAND_COLOR};text-decoration:underline;">support@timeo.my</a>.
      </p>
      ${fallbackLink(signInUrl)}
    `),
  };
}

// ─── Password Reset Success ──────────────────────────────────────

export function passwordResetSuccessEmail(params: {
  name: string;
}): { subject: string; html: string } {
  const { name } = params;
  const firstName = name.split(" ")[0] || "there";
  const siteUrl = process.env.SITE_URL ?? "https://timeo.my";

  return {
    subject: "Your Timeo password has been reset",
    html: layout(`
      <div style="text-align:center;padding-bottom:16px;">
        <span style="display:inline-block;width:48px;height:48px;border-radius:50%;background-color:rgba(212,160,23,0.15);line-height:48px;font-size:24px;">✓</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;text-align:center;">Password updated</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${TEXT_COLOR};line-height:1.6;text-align:center;">
        Hi ${firstName}, your Timeo password has been successfully changed. You can now sign in with your new password.
      </p>
      ${button(siteUrl + "/sign-in", "Sign In")}
      <div style="margin-top:28px;padding:16px;background-color:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.2);border-radius:8px;">
        <p style="margin:0;font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
          <strong style="color:${TEXT_COLOR};">Didn't make this change?</strong> If you did not reset your password, your account may have been compromised. Please <a href="${siteUrl}/forgot-password" style="color:${BRAND_COLOR};text-decoration:underline;">reset your password immediately</a> or contact support.
        </p>
      </div>
    `),
  };
}
