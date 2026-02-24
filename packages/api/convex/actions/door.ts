"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Remotely opens the door for a tenant by sending a gpio control command
 * directly to the door camera. Used by staff as a manual override button.
 *
 * Requires the caller to be authenticated (any role) and the tenant to have
 * doorCamera.ip configured in settings.
 */
export const remoteOpenDoor = action({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const camera = await ctx.runQuery(internal.checkIns.getTenantCameraConfig, {
      tenantId: args.tenantId,
    });

    if (!camera?.ip) {
      throw new Error(
        "Door camera not configured. Ask the platform admin to add the camera IP in tenant settings."
      );
    }

    const port = camera.port ?? 8000;
    const gpioPort = camera.gpioPort ?? 1;
    const cameraUrl = `http://${camera.ip}:${port}`;

    const response = await fetch(cameraUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        version: "0.2",
        cmd: "gpio control",
        port: gpioPort,
        ctrl_type: "on",
        ctrl_mode: "force",
        person_id: "staff_override",
      }),
      // AbortSignal.timeout is available in Node 18+ but not in ES2022 lib types
      signal: (AbortSignal as unknown as { timeout(ms: number): AbortSignal }).timeout(5000),
    });

    if (!response.ok) {
      throw new Error(
        `Camera returned HTTP ${response.status}. Check that the camera IP is reachable from the Convex server.`
      );
    }

    const result = (await response.json()) as { code: number };
    if (result.code !== 0) {
      throw new Error(`Camera returned error code ${result.code}.`);
    }

    return { opened: true };
  },
});
