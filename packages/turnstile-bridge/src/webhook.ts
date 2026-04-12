import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import type { BridgeConfig } from "./config.js";
import { logger } from "./logger.js";
import type { TurnstileClient } from "./turnstile.js";

export type FaceSyncEvent =
  | "face.enrolled"
  | "face.removed"
  | "membership.expired"
  | "membership.renewed"
  | "membership.suspended";

export interface FaceSyncWebhookPayload {
  event: FaceSyncEvent;
  tenantId?: string;
  userId?: string;
  memberId?: string;
  memberName?: string;
  faceImageUrl?: string;
  faceImageBase64?: string;
  timestamp?: string;
}

type RawBodyRequest = Request & { rawBody?: string };

function isFaceSyncEvent(value: unknown): value is FaceSyncEvent {
  return (
    value === "face.enrolled" ||
    value === "face.removed" ||
    value === "membership.expired" ||
    value === "membership.renewed" ||
    value === "membership.suspended"
  );
}

function isFaceSyncWebhookPayload(
  value: unknown,
): value is FaceSyncWebhookPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return isFaceSyncEvent(payload.event);
}

function verifySignature(
  rawBody: string,
  headerSignature: string | undefined,
  secret: string,
): boolean {
  if (!secret || !headerSignature) {
    return false;
  }

  const provided = headerSignature.trim().replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function resolvePersonId(payload: FaceSyncWebhookPayload): string | null {
  if (payload.userId && payload.userId.trim().length > 0) {
    return payload.userId.trim();
  }

  if (payload.memberId && payload.memberId.trim().length > 0) {
    return payload.memberId.trim();
  }

  return null;
}

function resolveMemberName(payload: FaceSyncWebhookPayload): string {
  if (payload.memberName && payload.memberName.trim().length > 0) {
    return payload.memberName.trim();
  }

  return "Member";
}

function normalizeImageUrl(imageUrl: string, timeoApiUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return new URL(imageUrl, timeoApiUrl).toString();
}

function stripDataUriPrefix(value: string): string {
  const index = value.indexOf(",");
  if (index === -1) {
    return value;
  }

  const prefix = value.slice(0, index).toLowerCase();
  if (!prefix.includes("base64")) {
    return value;
  }

  return value.slice(index + 1);
}

async function fetchImageBase64(
  imageUrl: string,
  config: BridgeConfig,
): Promise<string> {
  const absoluteUrl = normalizeImageUrl(imageUrl, config.timeoApiUrl);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    config.httpRequestTimeoutMs,
  );

  try {
    const headers: Record<string, string> = {};
    if (config.timeoApiToken) {
      headers.Authorization = `Bearer ${config.timeoApiToken}`;
    }

    const response = await fetch(absoluteUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image (${response.status} ${response.statusText})`,
      );
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    if (imageBuffer.length === 0) {
      throw new Error("Face image response was empty");
    }

    return imageBuffer.toString("base64");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function resolveFaceImage(
  payload: FaceSyncWebhookPayload,
  config: BridgeConfig,
): Promise<string> {
  if (payload.faceImageBase64 && payload.faceImageBase64.trim().length > 0) {
    return stripDataUriPrefix(payload.faceImageBase64.trim());
  }

  if (payload.faceImageUrl && payload.faceImageUrl.trim().length > 0) {
    return fetchImageBase64(payload.faceImageUrl.trim(), config);
  }

  throw new Error("Missing face image payload");
}

export function createWebhookRouter(input: {
  config: BridgeConfig;
  turnstileClient: TurnstileClient;
}): Router {
  const router = Router();

  router.post("/webhook/face-sync", async (req, res) => {
    const signature =
      req.header("x-timeo-signature") ??
      req.header("x-turnstile-signature") ??
      req.header("x-signature");

    const rawBody =
      (req as RawBodyRequest).rawBody ?? JSON.stringify(req.body ?? {});

    if (!verifySignature(rawBody, signature, input.config.webhookSecret)) {
      return res.status(401).json({
        success: false,
        error: "Invalid webhook signature",
      });
    }

    if (!isFaceSyncWebhookPayload(req.body)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload",
      });
    }

    const payload = req.body;
    const personId = resolvePersonId(payload);

    if (!personId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId or memberId",
      });
    }

    try {
      if (
        payload.event === "face.removed" ||
        payload.event === "membership.expired" ||
        payload.event === "membership.suspended"
      ) {
        await input.turnstileClient.deleteFace(personId);
      } else {
        const imageBase64 = await resolveFaceImage(payload, input.config);
        await input.turnstileClient.enrollFace(
          personId,
          resolveMemberName(payload),
          imageBase64,
        );
      }

      return res.json({
        success: true,
        event: payload.event,
        personId,
      });
    } catch (error) {
      logger.error("Failed handling face sync webhook", {
        event: payload.event,
        personId,
        message: (error as Error).message,
      });

      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  return router;
}
