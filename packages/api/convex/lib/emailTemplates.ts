const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 24px;
  background-color: #ffffff;
`;

const headerStyles = `
  text-align: center;
  margin-bottom: 32px;
`;

const logoStyles = `
  display: inline-block;
  background-color: #1A56DB;
  color: #ffffff;
  font-weight: bold;
  font-size: 18px;
  padding: 8px 16px;
  border-radius: 8px;
`;

const headingStyles = `
  color: #1E293B;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const subheadingStyles = `
  color: #64748B;
  font-size: 14px;
  margin: 0;
`;

const cardStyles = `
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
`;

const detailRowStyles = `
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E2E8F0;
`;

const labelStyles = `
  color: #64748B;
  font-size: 14px;
`;

const valueStyles = `
  color: #1E293B;
  font-size: 14px;
  font-weight: 600;
`;

const buttonStyles = `
  display: inline-block;
  background-color: #1A56DB;
  color: #ffffff;
  padding: 12px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
`;

const footerStyles = `
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #E2E8F0;
  color: #94A3B8;
  font-size: 12px;
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9;">
  <div style="${baseStyles}">
    <div style="${headerStyles}">
      <span style="${logoStyles}">Timeo</span>
    </div>
    ${content}
    <div style="${footerStyles}">
      <p>This email was sent by Timeo. If you didn't expect this, you can ignore it.</p>
      <p>&copy; ${new Date().getFullYear()} Timeo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export interface BookingDetails {
  customerName: string;
  serviceName: string;
  staffName?: string;
  startTime: number;
  endTime: number;
  tenantName: string;
  notes?: string;
}

export function bookingConfirmationTemplate(details: BookingDetails): string {
  const start = new Date(details.startTime);
  const end = new Date(details.endTime);
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

  return wrapTemplate(`
    <h1 style="${headingStyles}">Booking Confirmed</h1>
    <p style="${subheadingStyles}">Your appointment has been confirmed at ${details.tenantName}.</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Service</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.serviceName}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Date</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${dateStr}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Time</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${timeStr}</td></tr>
        ${details.staffName ? `<tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Provider</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.staffName}</td></tr>` : ""}
        ${details.notes ? `<tr><td style="${labelStyles} padding: 8px 0;">Notes</td><td style="${valueStyles} padding: 8px 0; text-align: right;">${details.notes}</td></tr>` : ""}
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">If you need to make changes, please contact ${details.tenantName} directly.</p>
  `);
}

export function bookingReminderTemplate(details: BookingDetails): string {
  const start = new Date(details.startTime);
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return wrapTemplate(`
    <h1 style="${headingStyles}">Appointment Reminder</h1>
    <p style="${subheadingStyles}">Your appointment is coming up soon!</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Service</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.serviceName}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Date</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${dateStr}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Time</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${timeStr}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0;">Location</td><td style="${valueStyles} padding: 8px 0; text-align: right;">${details.tenantName}</td></tr>
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">Please arrive a few minutes early. If you need to cancel, contact ${details.tenantName}.</p>
  `);
}

export function bookingCancellationTemplate(
  details: BookingDetails & { reason?: string; cancelledBy: string }
): string {
  const start = new Date(details.startTime);
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return wrapTemplate(`
    <h1 style="${headingStyles}">Booking Cancelled</h1>
    <p style="${subheadingStyles}">Your appointment at ${details.tenantName} has been cancelled.</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Service</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.serviceName}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Date</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${dateStr}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Time</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${timeStr}</td></tr>
        ${details.reason ? `<tr><td style="${labelStyles} padding: 8px 0;">Reason</td><td style="${valueStyles} padding: 8px 0; text-align: right;">${details.reason}</td></tr>` : ""}
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">If you'd like to rebook, visit ${details.tenantName} to schedule a new appointment.</p>
  `);
}

export interface OrderDetails {
  customerName: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  tenantName: string;
}

export function orderUpdateTemplate(
  details: OrderDetails,
  newStatus: string
): string {
  const statusLabels: Record<string, string> = {
    confirmed: "Order Confirmed",
    preparing: "Being Prepared",
    ready: "Ready for Pickup",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const statusLabel = statusLabels[newStatus] ?? newStatus;

  const itemsHtml = details.items
    .map(
      (item) =>
        `<tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">${item.name} x${item.quantity}</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.currency} ${(item.price * item.quantity).toFixed(2)}</td></tr>`
    )
    .join("");

  return wrapTemplate(`
    <h1 style="${headingStyles}">Order ${statusLabel}</h1>
    <p style="${subheadingStyles}">Your order at ${details.tenantName} has been updated.</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${itemsHtml}
        <tr><td style="${labelStyles} padding: 12px 0; font-weight: 700;">Total</td><td style="${valueStyles} padding: 12px 0; text-align: right; font-size: 16px;">${details.currency} ${details.totalAmount.toFixed(2)}</td></tr>
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">Status: <strong style="color: #1A56DB;">${statusLabel}</strong></p>
  `);
}

export function staffInvitationTemplate(
  tenantName: string,
  inviterName: string,
  role: string
): string {
  return wrapTemplate(`
    <h1 style="${headingStyles}">You've Been Invited!</h1>
    <p style="${subheadingStyles}">${inviterName} has invited you to join ${tenantName} as ${role}.</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Organization</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${tenantName}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Role</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right; text-transform: capitalize;">${role}</td></tr>
        <tr><td style="${labelStyles} padding: 8px 0;">Invited by</td><td style="${valueStyles} padding: 8px 0; text-align: right;">${inviterName}</td></tr>
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">Open the Timeo app to accept this invitation and get started.</p>
  `);
}

export interface PaymentDetails {
  customerName: string;
  amount: number;
  currency: string;
  tenantName: string;
  description: string;
}

export function paymentReceiptTemplate(details: PaymentDetails): string {
  return wrapTemplate(`
    <h1 style="${headingStyles}">Payment Received</h1>
    <p style="${subheadingStyles}">Thank you for your payment to ${details.tenantName}.</p>
    <div style="${cardStyles}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr><td style="${labelStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Description</td><td style="${valueStyles} padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right;">${details.description}</td></tr>
        <tr><td style="${labelStyles} padding: 12px 0; font-weight: 700;">Amount Paid</td><td style="${valueStyles} padding: 12px 0; text-align: right; font-size: 18px; color: #059669;">${details.currency} ${details.amount.toFixed(2)}</td></tr>
      </table>
    </div>
    <p style="color: #64748B; font-size: 14px;">This serves as your payment confirmation receipt.</p>
  `);
}
