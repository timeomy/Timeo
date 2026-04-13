import express, { type Request } from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { runFullSync } from "./sync.js";
import { TurnstileClient } from "./turnstile.js";
import { createWebhookRouter } from "./webhook.js";

type RawBodyRequest = Request & { rawBody?: string };

const turnstileClient = new TurnstileClient({
  ip: config.turnstileIp,
  port: config.turnstilePort,
  username: config.turnstileUser,
  password: config.turnstilePass,
  reconnectMs: config.turnstileReconnectMs,
  httpTimeoutMs: config.turnstileHttpTimeoutMs,
  commandTimeoutMs: config.turnstileCommandTimeoutMs,
});

const app = express();

app.use(
  express.json({
    limit: "25mb",
    verify: (req, _res, buffer) => {
      (req as RawBodyRequest).rawBody = buffer.toString("utf8");
    },
  }),
);

app.use(
  createWebhookRouter({
    config,
    turnstileClient,
  }),
);

let syncInProgress = false;

async function triggerFullSync(source: string) {
  if (syncInProgress) {
    logger.warn("Skipping full sync because one is already running", { source });
    return null;
  }

  syncInProgress = true;
  try {
    logger.info("Starting full sync", { source });
    const result = await runFullSync({ config, turnstileClient });
    logger.info("Full sync completed", result);
    return result;
  } catch (error) {
    logger.error("Full sync failed", {
      source,
      message: (error as Error).message,
    });
    return null;
  } finally {
    syncInProgress = false;
  }
}

app.get("/status", async (_req, res) => {
  let personCount: number | null = null;

  try {
    personCount = await turnstileClient.getPersonCount();
  } catch {
    personCount = null;
  }

  return res.json({
    success: true,
    uptimeSeconds: Math.floor(process.uptime()),
    syncInProgress,
    personCount,
    turnstile: turnstileClient.getStatus(),
  });
});

app.get("/faces", async (_req, res) => {
  try {
    const persons = await turnstileClient.listPersons();
    return res.json({ success: true, count: persons.length, persons });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

app.post("/sync/full", async (_req, res) => {
  try {
    const result = await triggerFullSync("manual");
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

const scheduledTask = cron.schedule(
  config.syncCronExpression,
  () => {
    void triggerFullSync("cron");
  },
  { scheduled: false },
);

let server: ReturnType<typeof app.listen> | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  logger.info("Booting turnstile bridge", {
    port: config.port,
    turnstileIp: config.turnstileIp,
    turnstilePort: config.turnstilePort,
    syncCron: config.syncCronExpression,
  });

  await turnstileClient.connect().catch((error) => {
    logger.error("Initial turnstile connection failed", {
      message: (error as Error).message,
    });
  });

  await new Promise<void>((resolve) => {
    server = app.listen(config.port, () => {
      logger.info(`Turnstile bridge listening on port ${config.port}`);
      resolve();
    });
  });

  scheduledTask.start();
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info("Shutting down turnstile bridge", { signal });

  scheduledTask.stop();

  await turnstileClient.disconnect().catch((error) => {
    logger.error("Error while disconnecting turnstile client", {
      message: (error as Error).message,
    });
  });

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start().catch((error) => {
  logger.error("Failed to start turnstile bridge", {
    message: (error as Error).message,
  });
  process.exit(1);
});
