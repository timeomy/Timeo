import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "auto-mark-no-shows",
  { hours: 1 },
  internal.bookings.autoCancelNoShows
);

export default crons;
