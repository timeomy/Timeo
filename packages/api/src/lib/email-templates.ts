export function bookingConfirmationEmail(params: {
  customerName: string;
  serviceName: string;
  startTime: string;
  tenantName: string;
}) {
  return {
    subject: `Booking Confirmed - ${params.tenantName}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p>Hi ${escapeHtml(params.customerName)},</p>
      <p>Your booking for <strong>${escapeHtml(params.serviceName)}</strong> has been confirmed.</p>
      <p><strong>Date &amp; Time:</strong> ${escapeHtml(params.startTime)}</p>
      <p>Thank you for choosing ${escapeHtml(params.tenantName)}!</p>
    `,
  };
}

export function bookingReminderEmail(params: {
  customerName: string;
  serviceName: string;
  startTime: string;
  tenantName: string;
}) {
  return {
    subject: `Booking Reminder - ${params.tenantName}`,
    html: `
      <h2>Upcoming Booking Reminder</h2>
      <p>Hi ${escapeHtml(params.customerName)},</p>
      <p>This is a reminder for your upcoming booking:</p>
      <p><strong>Service:</strong> ${escapeHtml(params.serviceName)}</p>
      <p><strong>Date &amp; Time:</strong> ${escapeHtml(params.startTime)}</p>
      <p>See you soon at ${escapeHtml(params.tenantName)}!</p>
    `,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
