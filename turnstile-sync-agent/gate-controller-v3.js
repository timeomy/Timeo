/**
 * Timeo Gate Controller v3.0
 * Validates access directly against Timeo API (no local SQL Server dependency).
 */
const http = require("http");
require("dotenv").config();

const PORT = parseInt(process.env.GATE_PORT || "8889", 10);
const TIMEO_API = (process.env.TIMEO_API_URL || "https://api.timeo.my").replace(/\/+$/, "");
const TENANT_ID = process.env.TENANT_ID || "";
const KIOSK_TOKEN = process.env.KIOSK_TOKEN || "";

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  } catch {
    return String(d);
  }
}

function buildZah3Reply(reqBody, base) {
  const ok = base.error === 0;
  const reply = {
    result: ok ? 1 : 0,
    cmd: 1,
    description: `${base.msg || (ok ? "Verify successful" : "Validation failed")}\r\n`,
    eventNo: toInt(reqBody.eventNo, 0),
    openCount: 0,
    voiceIndex: ok ? 2 : 1,
    voice: base.tts || (ok ? "Verify successful" : "Validation failed"),
    isIn: toInt(reqBody.IsIn, 1),

    error: base.error,
    tts: base.tts,
    msg: base.msg,

    sn: reqBody.sn,
    ticketType: reqBody.ticketType,
    cardNo: reqBody.cardNo,
    onlyCheck: reqBody.onlyCheck,
    timestamp: reqBody.timestamp,
  };

  if (reqBody.sign) reply.sign = reqBody.sign;

  return reply;
}

async function validateCard(cardNo) {
  const normalized = String(cardNo || "").trim();

  if (!normalized) {
    return {
      valid: false,
      error: 8,
      tts: "Not registered",
      memberName: null,
      planName: null,
      expiryDate: null,
      daysRemaining: null,
    };
  }

  if (!TENANT_ID || !KIOSK_TOKEN) {
    return {
      valid: false,
      error: 8,
      tts: "Controller not configured",
      memberName: null,
      planName: null,
      expiryDate: null,
      daysRemaining: null,
    };
  }

  try {
    const response = await fetch(`${TIMEO_API}/api/gate/validate-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kiosk-Token": KIOSK_TOKEN,
      },
      body: JSON.stringify({
        cardNo: normalized,
        tenantId: TENANT_ID,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    return {
      valid: Boolean(payload.valid),
      error: toInt(payload.error, payload.valid ? 0 : 8),
      tts: String(payload.tts || (payload.valid ? "Verify successful" : "Validation failed")),
      memberName: payload.memberName ? String(payload.memberName) : null,
      planName: payload.planName ? String(payload.planName) : null,
      expiryDate: payload.expiryDate ? String(payload.expiryDate) : null,
      daysRemaining:
        payload.daysRemaining === null || payload.daysRemaining === undefined
          ? null
          : toInt(payload.daysRemaining, null),
      statusCode: response.status,
    };
  } catch (err) {
    console.error("[TIMEO] validate-card error:", err?.message || err);
    return {
      valid: false,
      error: 8,
      tts: "Validation failed",
      memberName: null,
      planName: null,
      expiryDate: null,
      daysRemaining: null,
    };
  }
}

function buildResponseFromValidation(validation, label) {
  if (!validation || !validation.valid) {
    if (validation?.tts === "Membership expired") {
      return {
        error: 8,
        tts: "Membership expired",
        msg: `Validation failed;Expired: ${fmtDate(validation.expiryDate)};${validation.memberName || label}`,
      };
    }

    if (validation?.tts === "Not registered") {
      return {
        error: 8,
        tts: "Not registered",
        msg: `Validation failed;${label} not found;Please contact staff`,
      };
    }

    return {
      error: 8,
      tts: validation?.tts || "Validation failed",
      msg: `Validation failed;${validation?.tts || "Access denied"};Please contact staff`,
    };
  }

  const remaining = toInt(validation.daysRemaining, 0);
  const planLabel = validation.planName || validation.tts || "Membership active";
  return {
    error: 0,
    tts: planLabel,
    msg: `Verify successful;Valid to: ${fmtDate(validation.expiryDate)};Remaining:${remaining} days`,
  };
}

async function logToTimeo(personIdentifier, memberName) {
  try {
    await fetch(`${TIMEO_API}/api/gate/face-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personIdentifier,
        match_status: 0,
        match_score: 99,
        device_no: "turnstile-wsfitness",
        person_name: memberName || personIdentifier,
      }),
    });
  } catch {
    // Non-critical
  }
}

function extractFaceIdentifier(body) {
  const raw =
    body?.person_id ||
    body?.personId ||
    body?.TicketNo ||
    body?.ticketNo ||
    body?.cardNo ||
    "";

  if (!raw) return "";

  const firstToken = String(raw).split("_")[0] || "";
  return firstToken.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  let rawBody = "";
  await new Promise((resolve) => {
    req.on("data", (c) => {
      rawBody += c.toString();
    });
    req.on("end", resolve);
  });

  console.log(`[REQ] ${req.method} ${url} :: ${rawBody.substring(0, 300)}`);

  let parsedBody = {};
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    parsedBody = {};
  }

  if (url.includes("zah3check")) {
    const cmd = parsedBody.cmd;
    const cardNo = parsedBody.cardNo || "";

    if (cmd !== 1 || !cardNo) {
      const heartbeatReply = {
        result: 0,
        cmd: toInt(cmd, 0),
        description: "ok",
        eventNo: toInt(parsedBody.eventNo, 0),
        error: 0,
      };

      if (parsedBody.sign) heartbeatReply.sign = parsedBody.sign;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(heartbeatReply));
      return;
    }

    console.log(`[CARD] ${cardNo}`);
    const validation = await validateCard(cardNo);
    const base = buildResponseFromValidation(validation, `Card ${cardNo}`);
    const reply = buildZah3Reply(parsedBody, base);

    if (base.error === 0) {
      console.log(`  OK: ${validation.memberName || cardNo} | ${validation.planName || validation.tts}`);
      await logToTimeo(cardNo, validation.memberName);
    } else {
      console.log(`  DENY: ${cardNo} | ${base.tts}`);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reply));
    return;
  }

  if (url.includes("zahFace")) {
    const personIdentifier = extractFaceIdentifier(parsedBody);
    console.log(`[FACE] ${personIdentifier || "unknown"}`);

    const validation = await validateCard(personIdentifier);
    const reply = buildResponseFromValidation(validation, `Face ${personIdentifier || "unknown"}`);

    if (reply.error === 0) {
      console.log(`  OK: ${validation.memberName || personIdentifier} | ${validation.planName || validation.tts}`);
      await logToTimeo(personIdentifier || "unknown", validation.memberName);
    } else {
      console.log(`  DENY: ${personIdentifier || "unknown"} | ${reply.tts}`);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reply));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end('{"error":0,"msg":"Timeo Gate Controller v3.0"}');
});

console.log("Timeo Gate Controller v3.0");
console.log(`Port: ${PORT} | API: ${TIMEO_API}`);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[READY] Listening on port ${PORT}`);
});

