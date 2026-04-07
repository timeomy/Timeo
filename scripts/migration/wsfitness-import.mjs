#!/usr/bin/env node

import fs from "node:fs/promises";

const INPUT_FILE =
  process.env.WSFITNESS_INPUT_FILE ?? "/tmp/wsfitness-migration.json";
const API_BASE_URL =
  process.env.TIMEO_API_BASE_URL ?? process.env.WSFITNESS_API_BASE_URL ?? "http://localhost:3001";
const IMPORT_URL =
  process.env.WSFITNESS_IMPORT_URL ??
  `${API_BASE_URL.replace(/\/$/, "")}/api/admin/migration/wsfitness/members`;
const BATCH_SIZE = Number(process.env.WSFITNESS_BATCH_SIZE ?? 25);
const LOG_FILE = process.env.WSFITNESS_LOG_FILE ?? "/tmp/wsfitness-migration.log";

const SESSION_COOKIE = process.env.TIMEO_SESSION_COOKIE ?? "";
const BEARER_TOKEN = process.env.TIMEO_PLATFORM_ADMIN_BEARER ?? "";

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

async function appendLog(line) {
  const stamp = new Date().toISOString();
  await fs.appendFile(LOG_FILE, `[${stamp}] ${line}\n`);
}

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  if (BEARER_TOKEN) {
    headers.Authorization = `Bearer ${BEARER_TOKEN}`;
  }
  if (SESSION_COOKIE) {
    headers.Cookie = SESSION_COOKIE;
  }

  return headers;
}

function parseMembers(inputPayload) {
  if (Array.isArray(inputPayload)) {
    return inputPayload;
  }
  if (Array.isArray(inputPayload?.members)) {
    return inputPayload.members;
  }
  throw new Error("Input JSON must be an array or an object with a members array");
}

async function main() {
  await fs.writeFile(LOG_FILE, "");

  const raw = await fs.readFile(INPUT_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const members = parseMembers(parsed);

  if (!members.length) {
    throw new Error("No members found in input file");
  }

  const batches = chunk(members, BATCH_SIZE);
  await appendLog(`Import starting: ${members.length} members, ${batches.length} batches`);
  await appendLog(`Endpoint: ${IMPORT_URL}`);

  let succeededBatches = 0;
  let failedBatches = 0;
  let migratedMembers = 0;

  const headers = buildHeaders();

  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    const batchLabel = `${index + 1}/${batches.length}`;

    await appendLog(`Batch ${batchLabel}: sending ${batch.length} members`);
    console.log(`[wsfitness-import] Batch ${batchLabel}: ${batch.length} members`);

    try {
      const response = await fetch(IMPORT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });

      const bodyText = await response.text();
      let body = null;
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = { raw: bodyText };
      }

      if (!response.ok) {
        failedBatches++;
        await appendLog(
          `Batch ${batchLabel} FAILED (${response.status}): ${JSON.stringify(body)}`,
        );
        continue;
      }

      succeededBatches++;
      migratedMembers += batch.length;
      await appendLog(
        `Batch ${batchLabel} OK (${response.status}): ${JSON.stringify(body)}`,
      );
    } catch (error) {
      failedBatches++;
      await appendLog(
        `Batch ${batchLabel} ERROR: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const summary = {
    totalMembers: members.length,
    migratedMembers,
    batches: batches.length,
    succeededBatches,
    failedBatches,
    logFile: LOG_FILE,
  };

  await appendLog(`Import complete: ${JSON.stringify(summary)}`);

  console.log("[wsfitness-import] Done", summary);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[wsfitness-import] Failed:", message);
  try {
    await appendLog(`Import failed: ${message}`);
  } catch {
    // Ignore logging failures
  }
  process.exit(1);
});
