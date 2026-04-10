/**
 * Timeo Door Controller (ZAH2 Magnetic Door)
 * Handles QR/NFC scans from downstairs magnetic door and validates via Timeo API.
 */
const http = require("http");
require("dotenv").config();

const PORT = parseInt(process.env.GATE_PORT || "8890", 10);
const TIMEO_API = (process.env.TIMEO_API_URL || "https://api.timeo.my").replace(/\/+$/, "");
const TENANT_ID = process.env.TENANT_ID || "";
const KIOSK_TOKEN = process.env.KIOSK_TOKEN || "";
const GRACE_DAYS = parseInt(process.env.GRACE_DAYS || "365", 10);
const ENDPOINT_PATH = process.env.ENDPOINT_PATH || "/api/gate/validate-qr";

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function getFormattedTime() {
  return new Date().toISOString().replace("T", " ").split(".")[0];
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendResponse(res, payload) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function buildZahResponse(body, overrides = {}) {
  return {
    result: 0,
    cmd: toInt(body?.cmd, 0),
    eventNo: toInt(body?.eventNo, 0),
    openCount: 0,
    voiceIndex: 5,
    isIn: toInt(body?.isIn ?? body?.IsIn, 1),
    description: "STOP - Access denied",
    ...overrides,
  };
}

function buildHeartbeatResponse(body) {
  return buildZahResponse(body, {
    cmd: 0,
    openCount: 0,
    voiceIndex: 0,
    description: "ok",
    time: getFormattedTime(),
  });
}

async function validateCardNo(cardNo) {
  if (!cardNo) {
    return {
      valid: false,
      graceMode: false,
      memberName: null,
      reason: "Missing scan value",
      graceDaysRemaining: 0,
      expiryDate: null,
      daysRemaining: 0,
    };
  }

  if (!TENANT_ID || !KIOSK_TOKEN) {
    return {
      valid: false,
      graceMode: false,
      memberName: null,
      reason: "Controller not configured",
      graceDaysRemaining: 0,
      expiryDate: null,
      daysRemaining: 0,
    };
  }

  try {
    const response = await fetch(`${TIMEO_API}${ENDPOINT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kiosk-Token": KIOSK_TOKEN,
      },
      body: JSON.stringify({
        cardNo,
        tenantId: TENANT_ID,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    let graceDaysRemaining =
      payload.graceDaysRemaining === undefined || payload.graceDaysRemaining === null
        ? null
        : toInt(payload.graceDaysRemaining, 0);

    if (Boolean(payload.graceMode) && graceDaysRemaining === null && payload.expiryDate) {
      const expiryDate = new Date(payload.expiryDate);
      if (!Number.isNaN(expiryDate.getTime())) {
        const expiredDays = Math.max(0, Math.floor((Date.now() - expiryDate.getTime()) / 86400000));
        graceDaysRemaining = Math.max(0, GRACE_DAYS - expiredDays);
      }
    }

    return {
      valid: Boolean(payload.valid),
      graceMode: Boolean(payload.graceMode),
      memberName: payload.memberName ? String(payload.memberName) : null,
      reason: String(payload.reason || payload.tts || (payload.valid ? "Access granted" : "Access denied")),
      graceDaysRemaining: graceDaysRemaining ?? 0,
      expiryDate: payload.expiryDate ? String(payload.expiryDate) : null,
      daysRemaining:
        payload.daysRemaining === undefined || payload.daysRemaining === null
          ? 0
          : toInt(payload.daysRemaining, 0),
      statusCode: response.status,
    };
  } catch (error) {
    return {
      valid: false,
      graceMode: false,
      memberName: null,
      reason: `Validation failed: ${error?.message || "unknown error"}`,
      graceDaysRemaining: 0,
      expiryDate: null,
      daysRemaining: 0,
    };
  }
}

async function logEvent(cardNo, body, validation, responsePayload) {
  try {
    await fetch(`${TIMEO_API}/api/gate/face-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: cardNo || "heartbeat",
        match_status: responsePayload.openCount === 1 ? 0 : 1,
        match_score: responsePayload.openCount === 1 ? 99 : 0,
        device_no: "door-wsfitness-zah2",
        person_name: validation?.memberName || cardNo || "Unknown",
        tenant_id: TENANT_ID,
        event_no: responsePayload.eventNo,
        cmd: responsePayload.cmd,
        grace_mode: Boolean(validation?.graceMode),
        reason: validation?.reason || null,
        raw_event: body,
      }),
    });
  } catch {
    // Logging should never block door responses.
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  let rawBody = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      rawBody += chunk.toString();
    });
    req.on("end", resolve);
  });

  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = {};
  }

  if (req.method !== "POST" || url !== "/zah3check") {
    const notFoundResponse = buildZahResponse(body, {
      cmd: 0,
      voiceIndex: 5,
      description: "STOP - Invalid endpoint",
    });
    sendResponse(res, notFoundResponse);
    return;
  }

  const cmd = toInt(body.cmd, 0);
  const cardNo = String(body.cardNo || "").trim();

  if (cmd === 0) {
    const heartbeat = buildHeartbeatResponse(body);
    sendResponse(res, heartbeat);
    await logEvent("", body, null, heartbeat);
    return;
  }

  if (cmd !== 1) {
    const unsupported = buildZahResponse(body, {
      description: "STOP - Unsupported command",
    });
    sendResponse(res, unsupported);
    await logEvent(cardNo, body, null, unsupported);
    return;
  }

  const validation = await validateCardNo(cardNo);
  const safeMemberName = escapeHtml(validation.memberName || "Member");
  const safeReason = escapeHtml(validation.reason || "Access denied");

  const granted = validation.valid
    ? buildZahResponse(body, {
        openCount: 1,
        voiceIndex: 2,
        description: validation.graceMode
          ? `<h1>Welcome ${safeMemberName} - Please renew membership</h1>`
          : `<h1>Welcome ${safeMemberName}</h1>`,
      })
    : buildZahResponse(body, {
        openCount: 0,
        voiceIndex: 5,
        description: `<h1>STOP - ${safeReason}</h1>`,
      });

  sendResponse(res, granted);
  await logEvent(cardNo, body, validation, granted);
});

console.log("Timeo Door Controller (ZAH2)");
console.log(`Port: ${PORT} | API: ${TIMEO_API}${ENDPOINT_PATH}`);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[READY] Listening on port ${PORT}`);
});

