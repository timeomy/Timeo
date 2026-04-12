import { createHmac } from "node:crypto";

export type TurnstileWebhookEvent =
  | "face.enrolled"
  | "face.removed"
  | "membership.expired"
  | "membership.renewed"
  | "membership.suspended";

export interface TurnstileWebhookPayload {
  event: TurnstileWebhookEvent;
  tenantId?: string;
  userId?: string;
  memberId?: string;
  memberName?: string;
  faceImageUrl?: string;
  faceImageBase64?: string;
  timestamp?: string;
}

function resolveWebhookUrl(baseUrl: string): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalized}/webhook/face-sync`;
}

export function dispatchTurnstileWebhook(
  payload: TurnstileWebhookPayload,
): void {
  const bridgeUrl = process.env.TURNSTILE_BRIDGE_URL?.trim();
  const secret = process.env.TURNSTILE_WEBHOOK_SECRET?.trim();

  if (!bridgeUrl || !secret) {
    return;
  }

  const endpoint = resolveWebhookUrl(bridgeUrl);
  const bodyPayload = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  const body = JSON.stringify(bodyPayload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 5000);

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-timeo-signature": `sha256=${signature}`,
    },
    body,
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        console.warn("Turnstile webhook dispatch returned non-2xx", {
          event: payload.event,
          status: response.status,
        });
      }
    })
    .catch((error) => {
      console.warn("Turnstile webhook dispatch failed", {
        event: payload.event,
        message: (error as Error).message,
      });
    })
    .finally(() => {
      clearTimeout(timeoutHandle);
    });
}
