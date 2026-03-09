import { db } from "@timeo/db";
import {
  accessLogs,
  faceRegistrations,
  turnstileDevices,
  tenantMemberships,
  subscriptions,
  users,
  checkIns,
  auditLogs,
} from "@timeo/db/schema";
import { generateId } from "@timeo/db";
import { eq, and, gt } from "drizzle-orm";
import { emitToTenant } from "../realtime/socket.js";
import { SocketEvents } from "../realtime/events.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccessValidationResult {
  allowed: boolean;
  reason: string;
  memberName: string | null;
  userId: string | null;
}

export interface FaceCapturePayload {
  version?: string;
  cmd: string;
  sequence_no: number;
  device_no?: string;
  device_sn: string;
  addr_no?: string;
  addr_name?: string;
  cap_time: string;
  is_realtime?: number;
  match_failed_reson?: number;
  match_result: number;
  match?: {
    is_encryption?: boolean;
    person_id: string;
    person_name: string;
    person_role: number;
    format?: string;
    image?: string;
    origin?: string;
    person_attr?: string;
    customer_text?: string;
    match_type?: string[];
    wg_card_id?: number;
  };
  overall_pic_flag?: boolean;
  overall_pic?: Record<string, unknown>;
  closeup_pic_flag?: boolean;
  closeup_pic?: Record<string, unknown>;
  video_flag?: boolean;
  person?: {
    sex?: string;
    age?: number;
    hat?: string;
    temperatur?: number;
    has_mask?: boolean;
    face_quality?: number;
    turn_angle?: number;
    rotate_angle?: number;
    wg_card_id?: number;
  };
}

// ─── Device Lookup ──────────────────────────────────────────────────────────

export async function findDeviceBySerialNumber(deviceSn: string) {
  const [device] = await db
    .select()
    .from(turnstileDevices)
    .where(eq(turnstileDevices.device_sn, deviceSn))
    .limit(1);
  return device ?? null;
}

// ─── Face Registration Lookup ───────────────────────────────────────────────

export async function findFaceRegistration(
  deviceSn: string,
  devicePersonId: string,
) {
  const [registration] = await db
    .select({
      faceReg: faceRegistrations,
      userName: users.name,
    })
    .from(faceRegistrations)
    .leftJoin(users, eq(faceRegistrations.user_id, users.id))
    .where(
      and(
        eq(faceRegistrations.device_sn, deviceSn),
        eq(faceRegistrations.device_person_id, devicePersonId),
        eq(faceRegistrations.status, "synced"),
      ),
    )
    .limit(1);
  return registration ?? null;
}

// ─── Membership Validation ──────────────────────────────────────────────────

export async function validateMemberAccess(
  tenantId: string,
  userId: string,
): Promise<AccessValidationResult> {
  // 1. Check tenant membership
  const [membership] = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenant_id, tenantId),
        eq(tenantMemberships.user_id, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    return {
      allowed: false,
      reason: "not_found",
      memberName: null,
      userId,
    };
  }

  if (membership.status === "suspended") {
    return {
      allowed: false,
      reason: "membership_suspended",
      memberName: null,
      userId,
    };
  }

  if (membership.status !== "active") {
    return {
      allowed: false,
      reason: "membership_inactive",
      memberName: null,
      userId,
    };
  }

  // 2. Get user name
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const memberName = user?.name ?? "Member";

  // 3. Check active subscription (if gym uses subscriptions)
  const now = new Date();
  const [activeSub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenant_id, tenantId),
        eq(subscriptions.customer_id, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.current_period_end, now),
      ),
    )
    .limit(1);

  // If there are no subscriptions at all for this tenant+user, still allow
  // (some gyms may not use subscription model — membership alone is enough)
  // But if they have subscriptions and none are active, deny.
  const [anySub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenant_id, tenantId),
        eq(subscriptions.customer_id, userId),
      ),
    )
    .limit(1);

  if (anySub && !activeSub) {
    return {
      allowed: false,
      reason: "subscription_expired",
      memberName,
      userId,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    memberName,
    userId,
  };
}

// ─── Access Log ─────────────────────────────────────────────────────────────

export async function logAccessAttempt(input: {
  tenantId: string;
  deviceSn: string;
  userId: string | null;
  personIdFromDevice: string | null;
  matchScore: number | null;
  matchResult: "allowed" | "denied" | "stranger";
  denyReason: string | null;
  sequenceNo: number | null;
  capTime: string | null;
  rawData: Record<string, unknown> | null;
}) {
  const logId = generateId();
  await db.insert(accessLogs).values({
    id: logId,
    tenant_id: input.tenantId,
    device_sn: input.deviceSn,
    user_id: input.userId,
    person_id_from_device: input.personIdFromDevice,
    match_score: input.matchScore,
    match_result: input.matchResult,
    deny_reason: input.denyReason,
    sequence_no: input.sequenceNo,
    cap_time: input.capTime,
    device_raw_data: input.rawData,
  });

  // Real-time event
  emitToTenant(input.tenantId, SocketEvents.ACCESS_ATTEMPT, {
    logId,
    userId: input.userId,
    result: input.matchResult,
    deviceSn: input.deviceSn,
  });

  return logId;
}

// ─── Check-In Creation (for allowed access) ─────────────────────────────────

export async function createFaceCheckIn(tenantId: string, userId: string) {
  const checkInId = generateId();

  await db.insert(checkIns).values({
    id: checkInId,
    tenant_id: tenantId,
    user_id: userId,
    method: "face",
  });

  await db.insert(auditLogs).values({
    id: generateId(),
    tenant_id: tenantId,
    actor_id: userId,
    actor_role: "customer",
    action: "check_in.face_access",
    resource_type: "check_in",
    resource_id: checkInId,
    details: { method: "face" },
  });

  emitToTenant(tenantId, SocketEvents.CHECKIN_CREATED, {
    checkInId,
    userId,
    tenantId,
    method: "face",
  });

  return checkInId;
}

// ─── Device Response Builder ────────────────────────────────────────────────

export function buildDeviceResponse(input: {
  allowed: boolean;
  sequenceNo: number;
  capTime: string;
  personId: string | null;
  memberName: string | null;
  denyReason?: string;
}) {
  const response: Record<string, unknown> = {
    reply: "ACK",
    cmd: "face",
    code: 0,
    sequence_no: input.sequenceNo,
    cap_time: input.capTime,
  };

  if (input.allowed && input.personId) {
    // Open the gate
    response.gateway_ctrl = {
      device_type: "gpio",
      device_no: 1,
      ctrl_mode: "force",
      person_id: input.personId,
    };

    // Welcome voice
    const displayName = input.memberName ?? "Member";
    response.tts = {
      text: `Welcome, ${displayName}`,
    };

    // Screen text
    response.text_display = {
      position: { x: 0, y: 500 },
      alive_time: 2000,
      font_size: 80,
      font_spacing: 1,
      font_color: "0xff00ff00", // green
      text: `Welcome ${displayName}`,
    };
  } else {
    // Deny — no gateway_ctrl means gate stays closed
    const denyText =
      input.denyReason === "subscription_expired"
        ? "Membership expired"
        : input.denyReason === "membership_suspended"
          ? "Membership suspended"
          : "Access denied";

    response.tts = { text: denyText };
    response.text_display = {
      position: { x: 0, y: 500 },
      alive_time: 2000,
      font_size: 80,
      font_spacing: 1,
      font_color: "0xffff0000", // red
      text: denyText,
    };
  }

  return response;
}
