import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const FROM = process.env.EMAIL_FROM ?? "noreply@timeo.my";

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Lazy singleton — only created when first email is sent
let _transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!_transporter) _transporter = createTransporter();
  return _transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via SMTP (Brevo by default).
 * In dev, if SMTP_USER/PASS are not set, logs to console instead.
 */
export async function sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`[dev] Email to ${to} — ${subject}\n  (set SMTP_HOST/SMTP_USER/SMTP_PASS to send for real)`);
    return;
  }

  await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}
