import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

export const bookingQueue = new Queue("bookings", { connection: redis });
export const notificationQueue = new Queue("notifications", {
  connection: redis,
});
