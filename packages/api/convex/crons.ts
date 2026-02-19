import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "auto-mark-no-shows",
  { hours: 1 },
  internal.bookings.autoCancelNoShows
);

crons.interval(
  "send-booking-reminders",
  { minutes: 15 },
  internal.actions.notifications.sendBookingReminders
);

export default crons;
