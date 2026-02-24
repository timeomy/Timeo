import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { handleStripeWebhook } from "./stripeWebhook";
import { authComponent, createAuth } from "./betterAuth";
import { internal } from "./_generated/api";

const http = httpRouter();

// Register Better Auth routes (sign-in, sign-up, session, JWKS, etc.)
authComponent.registerRoutes(http, createAuth);

// Stripe webhook route
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: handleStripeWebhook,
});

/**
 * Door camera face-capture webhook.
 *
 * The HA-SDK camera is configured with:
 *   upload_info.method = "http"
 *   upload_info.service_url = "door/<tenantSlug>/face-capture"
 *
 * On every QR scan / face detection, the camera POSTs the capture payload here.
 * We validate the QR code and respond with gateway_ctrl to open the door (or not).
 *
 * Path: POST /door/:tenantSlug/face-capture
 * Matched via pathPrefix "/door/" — we extract tenantSlug from the URL ourselves.
 */
http.route({
  pathPrefix: "/door/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Parse tenantSlug from URL: /door/<slug>/face-capture
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["door", "<slug>", "face-capture"]
    const tenantSlug = parts[1];

    if (!tenantSlug) {
      return new Response(
        JSON.stringify({ reply: "ACK", cmd: "face", code: 3 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ reply: "ACK", cmd: "face", code: 3 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cmd = body.cmd as string | undefined;
    const sequenceNo = body.sequence_no as number | undefined;
    const capTime = body.cap_time as string | undefined;
    const deviceSn = body.device_sn as string | undefined;

    // Heartbeat: respond immediately, no gate action
    if (cmd === "heart beat") {
      return new Response(
        JSON.stringify({ reply: "ACK", cmd: "heart beat", code: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only process face-capture events
    if (cmd !== "face") {
      return new Response(
        JSON.stringify({ reply: "ACK", cmd: cmd ?? "", code: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract QR code from payload (present when camera scans a QR code)
    const qrData = (body.qr_code as Record<string, string> | undefined)?.qr_data;

    if (!qrData) {
      // Face detection without QR — ack but don't open
      return new Response(
        JSON.stringify({ reply: "ACK", cmd: "face", code: 0, sequence_no: sequenceNo, cap_time: capTime }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Look up tenant by slug and validate QR via internal mutation
    const result = await ctx.runMutation(internal.checkIns.processQrDoorScanBySlug, {
      code: qrData,
      tenantSlug,
      deviceSn,
    });

    if (!result.allowed) {
      // Deny — ACK but no gateway_ctrl
      return new Response(
        JSON.stringify({
          reply: "ACK",
          cmd: "face",
          code: 0,
          sequence_no: sequenceNo,
          cap_time: capTime,
          tts: { text: "Access denied." },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Grant access — include gateway_ctrl to trigger door relay
    return new Response(
      JSON.stringify({
        reply: "ACK",
        cmd: "face",
        code: 0,
        sequence_no: sequenceNo,
        cap_time: capTime,
        gateway_ctrl: {
          device_type: "gpio",
          device_no: result.gpioPort ?? 1,
          ctrl_mode: "force",
          person_id: result.memberId,
        },
        tts: { text: `Welcome, ${result.memberName}! Have a great workout.` },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;
