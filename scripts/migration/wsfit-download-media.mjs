#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_INPUT_FILE =
  "/Users/jabez/Downloads/wsfitnessmk2/wsfitness_image_urls_2026-04-08.json";
const DEFAULT_OUTPUT_DIR = "/tmp/wsfit-media";

const INPUT_FILE = process.env.WSFIT_MEDIA_INPUT_FILE ?? DEFAULT_INPUT_FILE;
const OUTPUT_DIR = process.env.WSFIT_MEDIA_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR;
const CONCURRENCY = Math.max(1, Number(process.env.WSFIT_MEDIA_CONCURRENCY ?? 20));
const RETRY_LIMIT = Math.max(1, Number(process.env.WSFIT_MEDIA_RETRIES ?? 3));
const REQUEST_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.WSFIT_MEDIA_TIMEOUT_MS ?? 30_000),
);

const mimeToExt = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

function sanitizeToken(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function extFromUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const ext = path.extname(parsed.pathname).replace(/^\./, "").toLowerCase();
    return ext || null;
  } catch {
    return null;
  }
}

function extFromContentType(contentType) {
  if (!contentType) return null;
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return mimeToExt[mime] ?? null;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWithRetry(url, retries) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type");

      return {
        bytes: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(attempt * 250);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function extractRows(input, key) {
  const rows = input?.[key]?.rows;
  return Array.isArray(rows) ? rows : [];
}

function buildTasks(raw) {
  const tasks = [];

  for (const row of extractRows(raw, "profiles_images")) {
    if (!row?.avatar_url) continue;
    tasks.push({
      category: "avatars",
      externalId: row.user_id,
      sourceUrl: row.avatar_url,
      meta: {
        name: row.name ?? null,
        email: row.email ?? null,
        memberId: row.member_id ?? null,
      },
    });
  }

  for (const row of extractRows(raw, "payment_receipts")) {
    if (!row?.receipt_url) continue;
    tasks.push({
      category: "receipts",
      externalId: row.payment_request_id,
      sourceUrl: row.receipt_url,
      meta: {
        orderId: row.order_id ?? null,
        userId: row.user_id ?? null,
        planType: row.plan_type ?? null,
      },
    });
  }

  for (const row of extractRows(raw, "storage_bucket_avatars")) {
    if (!row?.public_url) continue;
    tasks.push({
      category: "storage_bucket_avatars",
      externalId: row.file_name,
      sourceUrl: row.public_url,
      meta: {
        sizeBytes: row.size_bytes ?? null,
      },
    });
  }

  for (const row of extractRows(raw, "storage_bucket_receipts")) {
    if (!row?.public_url) continue;
    tasks.push({
      category: "storage_bucket_receipts",
      externalId: row.file_name,
      sourceUrl: row.public_url,
      meta: {
        sizeBytes: row.size_bytes ?? null,
      },
    });
  }

  return tasks;
}

async function ensureCategoryDirs(tasks, rootDir) {
  const categories = new Set(tasks.map((task) => task.category));
  for (const category of categories) {
    await fs.mkdir(path.join(rootDir, category), { recursive: true });
  }
}

async function main() {
  const rawText = await fs.readFile(INPUT_FILE, "utf8");
  const parsed = JSON.parse(rawText);
  const tasks = buildTasks(parsed);

  if (!tasks.length) {
    throw new Error("No media URLs found in input JSON");
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await ensureCategoryDirs(tasks, OUTPUT_DIR);

  const summary = {
    inputFile: INPUT_FILE,
    outputDir: OUTPUT_DIR,
    totalTasks: tasks.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    bytesDownloaded: 0,
    failures: [],
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputDir: OUTPUT_DIR,
    files: {
      avatars: [],
      receipts: [],
      storage_bucket_avatars: [],
      storage_bucket_receipts: [],
    },
    failures: summary.failures,
  };

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) {
        return;
      }

      const task = tasks[index];
      const safeId = sanitizeToken(task.externalId);
      const guessedExt = extFromUrl(task.sourceUrl) ?? "jpg";
      const directory = path.join(OUTPUT_DIR, task.category);
      const targetFilePath = path.join(directory, `${safeId}.${guessedExt}`);

      try {
        if (await fileExists(targetFilePath)) {
          summary.skipped += 1;
          manifest.files[task.category].push({
            externalId: task.externalId,
            sourceUrl: task.sourceUrl,
            localPath: targetFilePath,
            skipped: true,
            ...task.meta,
          });
          continue;
        }

        const { bytes, contentType } = await downloadWithRetry(task.sourceUrl, RETRY_LIMIT);
        const ext = extFromContentType(contentType) ?? guessedExt;
        const finalPath = path.join(directory, `${safeId}.${ext}`);

        await fs.writeFile(finalPath, bytes);

        summary.succeeded += 1;
        summary.bytesDownloaded += bytes.length;

        manifest.files[task.category].push({
          externalId: task.externalId,
          sourceUrl: task.sourceUrl,
          localPath: finalPath,
          bytes: bytes.length,
          contentType: contentType ?? null,
          ...task.meta,
        });
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({
          category: task.category,
          externalId: task.externalId,
          sourceUrl: task.sourceUrl,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    JSON.stringify(
      {
        ...summary,
        manifestPath,
      },
      null,
      2,
    ),
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[wsfit-download-media] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

