import { Queue } from "bullmq";

const url = process.env.REDIS_URL;
if (!url) throw new Error("REDIS_URL is not set");

// Use plain URL options instead of an ioredis instance to avoid type conflicts
// between BullMQ's internal ioredis and the app's ioredis installation.
const connection = { url };

export const bookingQueue = new Queue("bookings", { connection });
export const notificationQueue = new Queue("notifications", { connection });
