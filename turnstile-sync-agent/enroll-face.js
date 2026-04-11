#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const http = require("http");
require("dotenv").config();

const DEFAULTS = {
  host: process.env.TURNSTILE_HOST || "192.168.1.201",
  port: Number(process.env.TURNSTILE_PORT || 8000),
  hostHeader: process.env.TURNSTILE_HOST_HEADER || "",
  username: process.env.TURNSTILE_USER || "admin",
  password: process.env.TURNSTILE_PASS || "admin",
  timeoutMs: Number(process.env.TURNSTILE_TIMEOUT_MS || 15000),
};

const CODE_MESSAGES = {
  2: "Unrecognized message ID (command is not supported).",
  16: "Face already exists.",
  22: "Record does not exist (often update mode on missing ID).",
  23: "Failed to write data.",
  24: "Failed to read data.",
  25: "Feature extraction/read failure.",
  26: "Poor portrait quality (Q too low).",
  35: "Image decoding failure.",
  36: "Image too large (> 2MB for feature extraction).",
  37: "Image normalization failed.",
  38: "Face size is too small.",
  39: "Poor portrait quality.",
  40: "Image must contain exactly one face.",
  41: "Face in image is incomplete.",
  51: "No valid face detected before timeout.",
};

function usage() {
  console.log(`
Usage:
  node turnstile-sync-agent/enroll-face.js --name "John Doe" --id "M123" --image ./john.jpg
  node turnstile-sync-agent/enroll-face.js --name "John Doe" --id "M123" --from-camera
  node turnstile-sync-agent/enroll-face.js --name "John Doe" --id "M123" --image ./john.jpg --update

Required:
  --name <string>              Person display name
  --id <string>                Person ID on turnstile
  --image <path>               Local image path (jpg/png), OR
  --from-camera                Capture close-up from live camera feed over WebSocket

Options:
  --host <ip-or-host>          Turnstile host (default: ${DEFAULTS.host})
  --port <number>              Turnstile port (default: ${DEFAULTS.port})
  --host-header <value>        Override HTTP/WS Host header (useful with SSH tunnels)
  --user <username>            Basic auth username (default: ${DEFAULTS.username})
  --pass <password>            Basic auth password (default: ${DEFAULTS.password})
  --role <number>              role field (default: 0)
  --kind <number>              kind field (default: 0)
  --card <number>              Card number (default: 0)
  --card-type <wg|long>        wg => wg_card_id, long => long_card_id (default: wg)
  --term-start <date|string>   default: "useless"
  --term <date|string>         default: "forever"
  --customer-text <string>     default: single space
  --worksite-id <string>       Optional worksite_id value
  --update                     Use upload_mode=2 (update existing person)
  --camera-timeout <seconds>   Wait timeout for --from-camera (default: 20)
  --sync-timeo                 Also POST enrollment metadata to TIMEO_MEMBER_SYNC_URL
  --dry-run                    Print payload summary without uploading
  --help                       Show this help

Optional Timeo sync env:
  TIMEO_MEMBER_SYNC_URL        POST endpoint for member upsert sync
  TIMEO_MEMBER_SYNC_TOKEN      Bearer token for sync endpoint
  `);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function toInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
}

function getBasicToken(username, password) {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

function postJson(config, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const request = http.request(
      {
        hostname: config.host,
        port: config.port,
        method: "POST",
        path: "/",
        timeout: config.timeoutMs,
        headers: {
          Authorization: `Basic ${getBasicToken(config.username, config.password)}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Host: config.hostHeader || config.host,
        },
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => {
          raw += chunk.toString("utf8");
        });
        response.on("end", () => {
          if (!raw) {
            resolve({ statusCode: response.statusCode, data: {} });
            return;
          }

          try {
            resolve({ statusCode: response.statusCode, data: JSON.parse(raw) });
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        });
      },
    );

    request.on("error", (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });

    request.on("timeout", () => {
      request.destroy();
      reject(new Error("HTTP request timed out."));
    });

    request.write(payload);
    request.end();
  });
}

function readImageBase64(imagePath) {
  const resolvedPath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Image not found: ${resolvedPath}`);
  }

  const buffer = fs.readFileSync(resolvedPath);
  if (!buffer.length) {
    throw new Error("Image file is empty.");
  }

  return {
    base64: buffer.toString("base64"),
    sizeBytes: buffer.length,
    file: resolvedPath,
  };
}

function getCodeMessage(code) {
  if (!Number.isFinite(code)) {
    return "Unknown error.";
  }
  return CODE_MESSAGES[code] || "Request failed.";
}

function buildUploadPayload(options, imageBase64) {
  const payload = {
    cmd: "upload person",
    id: options.id,
    name: options.name,
    role: options.role,
    kind: options.kind,
    reg_image: imageBase64,
    term_start: options.termStart,
    term: options.term,
    customer_text: options.customerText,
    upload_mode: options.uploadMode,
    worksite_id: options.worksiteId,
  };

  if (options.cardType === "long") {
    payload.long_card_id = options.card;
  } else {
    payload.wg_card_id = options.card;
  }

  return payload;
}

function captureCloseupFromCamera(config, timeoutMs) {
  const WebSocket = require("ws");
  const token = getBasicToken(config.username, config.password);
  const url = `ws://${config.host}:${config.port}?Basic=${token}`;

  return new Promise((resolve, reject) => {
    let closed = false;
    const socket = new WebSocket(url, {
      headers: {
        Host: config.hostHeader || config.host,
      },
    });

    const timer = setTimeout(() => {
      if (closed) {
        return;
      }
      closed = true;
      socket.close();
      reject(new Error(`Timed out waiting for camera close-up (${timeoutMs}ms).`));
    }, timeoutMs);

    socket.on("open", () => {
      socket.send(JSON.stringify({ cmd: "face" }));
    });

    socket.on("message", (data, isBinary) => {
      if (closed || isBinary) {
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (parsed?.cmd !== "face") {
        return;
      }

      const closeup = parsed?.closeup_pic?.data;
      if (typeof closeup !== "string" || !closeup.length) {
        return;
      }

      clearTimeout(timer);
      closed = true;
      socket.close();
      resolve(closeup);
    });

    socket.on("error", (error) => {
      if (closed) {
        return;
      }
      clearTimeout(timer);
      closed = true;
      reject(new Error(`WebSocket error: ${error.message}`));
    });

    socket.on("close", () => {
      if (closed) {
        return;
      }
      clearTimeout(timer);
      closed = true;
      reject(new Error("WebSocket closed before receiving close-up face image."));
    });
  });
}

async function requestPersonById(config, personId) {
  const command = {
    cmd: "request persons",
    role: -1,
    page_no: 1,
    page_size: 1,
    image_flag: 0,
    query_mode: 0,
    worksite_id: "",
    condition: {
      person_id: personId,
      no_feature: 0,
    },
  };

  const response = await postJson(config, command);
  return response.data;
}

async function maybeSyncTimeo(args, payload, uploadReply) {
  if (!args.syncTimeo) {
    return;
  }

  const syncUrl = process.env.TIMEO_MEMBER_SYNC_URL;
  if (!syncUrl) {
    console.warn("[warn] --sync-timeo requested but TIMEO_MEMBER_SYNC_URL is not set.");
    return;
  }

  const body = {
    turnstilePersonId: payload.id,
    name: payload.name,
    role: payload.role,
    kind: payload.kind,
    cardNo: payload.wg_card_id ?? payload.long_card_id ?? null,
    turnstileDeviceSn: uploadReply.device_sn || null,
    uploadedAt: new Date().toISOString(),
    source: args.fromCamera ? "camera" : "image_file",
  };

  const headers = {
    "Content-Type": "application/json",
  };

  if (process.env.TIMEO_MEMBER_SYNC_TOKEN) {
    headers.Authorization = `Bearer ${process.env.TIMEO_MEMBER_SYNC_TOKEN}`;
  }

  const response = await fetch(syncUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Timeo sync failed (${response.status}): ${text || response.statusText}`);
  }

  console.log("[ok] Synced member metadata to Timeo.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const config = {
    host: String(args.host || DEFAULTS.host),
    port: toInt(args.port, DEFAULTS.port),
    hostHeader: String(args["host-header"] || DEFAULTS.hostHeader || args.host || DEFAULTS.host),
    username: String(args.user || DEFAULTS.username),
    password: String(args.pass || DEFAULTS.password),
    timeoutMs: DEFAULTS.timeoutMs,
  };

  const name = typeof args.name === "string" ? args.name.trim() : "";
  const id = typeof args.id === "string" ? args.id.trim() : "";
  const fromCamera = Boolean(args["from-camera"]);
  const imagePath = args.image || args["image-path"];

  if (!name || !id) {
    throw new Error("Both --name and --id are required.");
  }

  if (!fromCamera && !imagePath) {
    throw new Error("Provide either --image <path> or --from-camera.");
  }

  if (fromCamera && imagePath) {
    throw new Error("Use either --image or --from-camera, not both.");
  }

  const role = toInt(args.role, 0);
  const kind = toInt(args.kind, 0);
  const card = toInt(args.card, 0);
  const cardType = args["card-type"] === "long" ? "long" : "wg";
  const termStart = typeof args["term-start"] === "string" ? args["term-start"].trim() : "useless";
  const term = typeof args.term === "string" ? args.term.trim() : "forever";
  const customerText =
    typeof args["customer-text"] === "string" && args["customer-text"].length > 0 ? args["customer-text"] : " ";
  const worksiteId = typeof args["worksite-id"] === "string" ? args["worksite-id"] : "";
  const uploadMode = args.update ? 2 : 1;
  const cameraTimeoutMs = toInt(args["camera-timeout"], 20) * 1000;
  const dryRun = Boolean(args["dry-run"]);

  let imageBase64;
  if (fromCamera) {
    console.log("[info] Waiting for live close-up face from camera stream...");
    imageBase64 = await captureCloseupFromCamera(config, cameraTimeoutMs);
    console.log(`[ok] Captured close-up image from camera (${imageBase64.length} base64 chars).`);
  } else {
    const image = readImageBase64(String(imagePath));
    imageBase64 = image.base64;
    console.log(`[ok] Loaded image: ${image.file} (${image.sizeBytes} bytes).`);
    if (image.sizeBytes > 2 * 1024 * 1024) {
      console.warn("[warn] Image > 2MB. Device may reject with code 36.");
    }
  }

  const payload = buildUploadPayload(
    {
      id,
      name,
      role,
      kind,
      card,
      cardType,
      termStart,
      term,
      customerText,
      uploadMode,
      worksiteId,
    },
    imageBase64,
  );

  if (dryRun) {
    console.log("[dry-run] Enrollment payload summary:");
    console.log(
      JSON.stringify(
        {
          ...payload,
          reg_image: `<base64:${imageBase64.length} chars>`,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`[info] Uploading person '${name}' (${id}) to ${config.host}:${config.port} ...`);
  const uploadResponse = await postJson(config, payload);
  const uploadReply = uploadResponse.data;

  if (!uploadReply || uploadReply.cmd !== "upload person") {
    throw new Error(`Unexpected upload response: ${JSON.stringify(uploadReply)}`);
  }

  if (uploadReply.code !== 0) {
    const detail = uploadReply.desc || getCodeMessage(uploadReply.code);
    throw new Error(`upload person failed (code ${uploadReply.code}): ${detail}`);
  }

  console.log(`[ok] upload person succeeded for ID '${uploadReply.id || id}'.`);

  const verifyReply = await requestPersonById(config, id).catch(() => null);
  if (verifyReply && verifyReply.code === 0 && Array.isArray(verifyReply.persons) && verifyReply.persons.length > 0) {
    const person = verifyReply.persons[0];
    console.log(`[ok] Verified person exists: id=${person.id} name='${person.name}'`);
  } else {
    console.log("[warn] Upload succeeded, but post-check lookup did not return this ID immediately.");
  }

  await maybeSyncTimeo(args, payload, uploadReply);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
