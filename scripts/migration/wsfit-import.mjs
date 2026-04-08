#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_EXPORT_FILE =
  "/Users/jabez/Downloads/wsfitnessmk2/wsfitness_full_export_2026-04-08.json";
const DEFAULT_MEDIA_DIR = "/tmp/wsfit-media";
const DEFAULT_LOG_FILE = "/tmp/wsfit-import.log";

const EXPORT_FILE = process.env.WSFIT_EXPORT_FILE ?? DEFAULT_EXPORT_FILE;
const MEDIA_DIR = process.env.WSFIT_MEDIA_DIR ?? DEFAULT_MEDIA_DIR;
const LOG_FILE = process.env.WSFIT_IMPORT_LOG_FILE ?? DEFAULT_LOG_FILE;

const API_BASE_URL =
  process.env.TIMEO_API_BASE_URL ?? process.env.WSFIT_API_BASE_URL ?? "http://localhost:3001";
const BULK_ENDPOINT =
  process.env.WSFIT_BULK_IMPORT_URL ??
  `${API_BASE_URL.replace(/\/$/, "")}/api/admin/migration/wsfitness/bulk`;
const MEDIA_ENDPOINT =
  process.env.WSFIT_MEDIA_IMPORT_URL ??
  `${API_BASE_URL.replace(/\/$/, "")}/api/admin/migration/wsfitness/media`;

const BATCH_SIZE = Math.max(1, Number(process.env.WSFIT_BATCH_SIZE ?? 100));
const MEDIA_CONCURRENCY = Math.max(1, Number(process.env.WSFIT_MEDIA_UPLOAD_CONCURRENCY ?? 8));

const SESSION_COOKIE = process.env.TIMEO_SESSION_COOKIE ?? "";
const BEARER_TOKEN = process.env.TIMEO_PLATFORM_ADMIN_BEARER ?? "";

const statusToMembershipStatus = {
  active: "active",
  pending_approval: "invited",
  pending: "invited",
  expired: "suspended",
  rejected: "suspended",
  vendor: "suspended",
};

const statusToSubscriptionStatus = {
  active: "active",
  pending_approval: "incomplete",
  pending: "incomplete",
  expired: "canceled",
  rejected: "canceled",
  vendor: "canceled",
};

function normalizePlanKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function inferPlanReferenceType(planName) {
  const value = (planName ?? "").toLowerCase();
  if (
    value.includes("coach") ||
    value.includes("session") ||
    value.includes("training") ||
    value.includes("zumba") ||
    value.includes("spinning")
  ) {
    return "session_package";
  }
  return "membership";
}

function mapRequestStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending_verification";
}

function mapPaymentStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value === "approved") return "succeeded";
  if (value === "rejected") return "failed";
  if (value === "pending_card") return "processing";
  return "pending";
}

function toCents(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function parseQrMemberId(qrCodeUrl) {
  if (!qrCodeUrl || typeof qrCodeUrl !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(qrCodeUrl);
    if (parsed && typeof parsed.id === "string" && parsed.id.trim()) {
      return parsed.id.trim();
    }
    return null;
  } catch {
    return null;
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function appendLog(message) {
  const stamp = new Date().toISOString();
  await fs.appendFile(LOG_FILE, `[${stamp}] ${message}\n`);
}

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  if (SESSION_COOKIE) {
    headers.Cookie = SESSION_COOKIE;
  }

  if (BEARER_TOKEN) {
    headers.Authorization = `Bearer ${BEARER_TOKEN}`;
  }

  return headers;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  }

  if (parsed?.success === false) {
    throw new Error(
      `${parsed?.error?.code ?? "UNKNOWN"}: ${parsed?.error?.message ?? "Unknown error"}`,
    );
  }

  return parsed?.data ?? parsed;
}

function collectMappings(fullExport) {
  const tables = fullExport.tables;

  const roleByUserId = new Map(
    (tables.user_roles?.rows ?? []).map((row) => [row.user_id, row.role]),
  );

  const membershipByUserId = new Map(
    (tables.memberships?.rows ?? []).map((row) => [row.user_id, row]),
  );

  const planByNormalizedName = new Map();
  const plans = [];

  for (const plan of tables.membership_plans?.rows ?? []) {
    const mapped = {
      externalId: String(plan.id),
      name: plan.title,
      description: plan.description ?? plan.title,
      priceCents: toCents(plan.price),
      durationMonths:
        typeof plan.duration_months === "number" ? plan.duration_months : null,
      durationDays: typeof plan.duration_days === "number" ? plan.duration_days : null,
      accessLevel: plan.access_level ?? null,
      displayOrder:
        typeof plan.display_order === "number" ? plan.display_order : null,
      planType: "all_access",
      isActive: plan.is_active ?? true,
      createdAt: plan.created_at ?? null,
      features: ["Imported from WS Fitness"],
    };

    plans.push(mapped);
    planByNormalizedName.set(normalizePlanKey(plan.title), mapped.externalId);
  }

  const syntheticPlanByName = new Map();

  for (const membership of tables.memberships?.rows ?? []) {
    const normalized = normalizePlanKey(membership.plan_type);
    if (!normalized) continue;
    if (planByNormalizedName.has(normalized) || syntheticPlanByName.has(normalized)) {
      continue;
    }

    const syntheticExternalId = `synthetic:${normalized}`;
    syntheticPlanByName.set(normalized, syntheticExternalId);
    plans.push({
      externalId: syntheticExternalId,
      name: membership.plan_type,
      description: `Synthetic imported plan (${membership.plan_type})`,
      priceCents: 0,
      durationMonths: null,
      durationDays: null,
      accessLevel: null,
      displayOrder: null,
      planType: inferPlanReferenceType(membership.plan_type) === "membership"
        ? "all_access"
        : "session_package",
      isActive: true,
      createdAt: membership.created_at ?? null,
      features: ["Imported from WS Fitness"],
    });
  }

  const findPlanExternalId = (planName) => {
    const normalized = normalizePlanKey(planName);
    return (
      planByNormalizedName.get(normalized) ??
      syntheticPlanByName.get(normalized) ??
      null
    );
  };

  const members = (tables.profiles?.rows ?? []).map((profile) => {
    const roleRaw = roleByUserId.get(profile.id) ?? "member";
    const legacyMembership = membershipByUserId.get(profile.id);
    const memberStatus = statusToMembershipStatus[legacyMembership?.status] ?? "active";
    const qrMemberId = parseQrMemberId(profile.qr_code_url);

    return {
      externalId: profile.id,
      memberId: profile.member_id ?? qrMemberId,
      name: profile.name ?? "Unknown Member",
      email:
        profile.email && String(profile.email).toLowerCase() !== "unknown"
          ? profile.email
          : null,
      phone: profile.phone_number ?? null,
      avatarUrl: profile.avatar_url ?? null,
      nfcCardId: profile.nfc_card_id ?? null,
      waiverSignature: profile.waiver_signature_name ?? null,
      waiverSignedAt: profile.waiver_signed_at ?? null,
      role:
        roleRaw === "admin" || roleRaw === "it_admin"
          ? "admin"
          : roleRaw === "coach"
            ? "coach"
            : roleRaw === "staff"
              ? "staff"
              : "customer",
      status: memberStatus,
      notes: `legacy_profile_id=${profile.id}`,
      joinedAt: legacyMembership?.valid_from ?? profile.created_at,
      createdAt: profile.created_at,
    };
  });

  const memberships = [];
  for (const row of tables.memberships?.rows ?? []) {
    const planExternalId = findPlanExternalId(row.plan_type);
    if (!planExternalId) {
      continue;
    }

    const startDate = row.valid_from ?? row.created_at;
    const endDate =
      row.expiry_date ??
      new Date(
        (startDate ? new Date(startDate).getTime() : Date.now()) + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

    const mappedStatus = statusToSubscriptionStatus[row.status] ?? "active";

    memberships.push({
      externalId: row.id,
      userExternalId: row.user_id,
      planExternalId,
      status: mappedStatus,
      startDate,
      endDate,
      pricePaidCents: null,
      createdAt: row.created_at,
      cancelAtPeriodEnd: mappedStatus === "canceled",
      packageType:
        inferPlanReferenceType(row.plan_type) === "membership"
          ? "membership"
          : "session_package",
    });
  }

  const payments = (tables.payment_requests?.rows ?? []).map((row) => {
    const planExternalId = findPlanExternalId(row.plan_type);
    const requestStatus = mapRequestStatus(row.status);

    return {
      externalId: row.id,
      userExternalId: row.user_id,
      amountCents: toCents(row.amount),
      currency: "MYR",
      method: "bank_transfer",
      requestStatus,
      paymentStatus: mapPaymentStatus(row.status),
      planReferenceType: inferPlanReferenceType(row.plan_type),
      planExternalId,
      planName: row.plan_type,
      receiptUrl: row.receipt_url ?? null,
      paymentDate: row.payment_date ?? null,
      orderId: row.order_id ?? null,
      payerName: row.payer_name ?? null,
      notes: row.notes ?? null,
      createdAt: row.created_at ?? null,
    };
  });

  const invoiceItemsByInvoiceId = new Map();
  for (const item of tables.invoice_items?.rows ?? []) {
    const list = invoiceItemsByInvoiceId.get(item.invoice_id) ?? [];
    list.push(item);
    invoiceItemsByInvoiceId.set(item.invoice_id, list);
  }

  const invoicesPayload = (tables.invoices?.rows ?? []).map((invoice) => {
    const items = (invoiceItemsByInvoiceId.get(invoice.id) ?? []).map((item) => ({
      externalId: item.id,
      description: item.description,
      quantity: Number(item.quantity ?? 1),
      unitPriceCents: toCents(item.unit_price),
      taxRateBasisPoints:
        item.tax_rate == null ? null : Math.round(Number(item.tax_rate) * 100),
      taxAmountCents: toCents(item.tax_amount),
      totalCents: toCents(item.total),
      classificationCode: item.classification_code ?? null,
    }));

    return {
      externalId: invoice.id,
      userExternalId: invoice.member_id ?? null,
      invoiceNumber: invoice.invoice_number,
      amountCents: toCents(invoice.total_amount),
      subtotalCents: toCents(invoice.subtotal),
      taxRateBasisPoints:
        invoice.tax_rate == null ? null : Math.round(Number(invoice.tax_rate) * 100),
      taxAmountCents: toCents(invoice.tax_amount),
      totalAmountCents: toCents(invoice.total_amount),
      currency: invoice.currency ?? "MYR",
      status: invoice.status ?? "draft",
      notes: invoice.notes ?? null,
      issueDate: invoice.issue_date ?? null,
      dueDate: invoice.due_date ?? null,
      source: "wsfitness",
      createdAt: invoice.created_at ?? null,
      items,
    };
  });

  const checkIns = (tables.check_ins?.rows ?? []).map((row) => ({
    externalId: row.id,
    userExternalId: row.member_id,
    timestamp: row.checked_in_at,
    method: row.location === "ZAH Gate" ? "face" : "manual",
    gate: row.location ?? null,
    device: row.location ?? null,
    entryType: row.location === "ZAH Gate" ? "turnstile" : "manual",
    notes: row.notes ?? null,
  }));

  const userIdByPersonId = new Map(
    (tables.turnstile_face_enrollments?.rows ?? [])
      .filter((row) => row.person_id && row.user_id)
      .map((row) => [row.person_id, row.user_id]),
  );

  const turnstileEvents = (tables.turnstile_events?.rows ?? []).map((row) => ({
    externalId: row.id,
    userExternalId: row.person_id ? userIdByPersonId.get(row.person_id) ?? null : null,
    receivedAt: row.received_at ?? null,
    deviceSn: row.device_sn ?? null,
    cmd: row.cmd == null ? null : String(row.cmd),
    sequenceNo: row.sequence_no == null ? null : Number(row.sequence_no),
    capTime: row.cap_time ?? null,
    matchResult: row.match_result ?? null,
    matchFailedReason: row.match_failed_reson ?? null,
    personId: row.person_id ?? null,
    personName: row.person_name ?? null,
    customerText: row.customer_text ?? null,
    rawPayload: row.raw_payload ?? null,
    isRejected: Boolean(row.is_rejected),
    rejectReason: row.reject_reason ?? null,
  }));

  const turnstileFaceLogs = (tables.turnstile_face_logs?.rows ?? []).map((row) => ({
    externalId: row.id,
    userExternalId: row.user_id ?? null,
    deviceSn: row.device_sn ?? null,
    personId: row.person_id ?? null,
    capTime: row.cap_time ?? null,
    decision: row.decision ?? null,
    reason: row.reason ?? null,
    rawPayload: row.raw_payload ?? null,
    createdAt: row.created_at ?? null,
  }));

  return {
    plans,
    members,
    memberships,
    payments,
    invoices: invoicesPayload,
    checkIns,
    turnstileEvents,
    turnstileFaceLogs,
  };
}

async function postBatches(entityName, items, payloadKey, counters) {
  if (!items.length) {
    await appendLog(`${entityName}: no records to import`);
    return;
  }

  const batches = chunk(items, BATCH_SIZE);
  await appendLog(`${entityName}: importing ${items.length} rows in ${batches.length} batches`);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const batchLabel = `${index + 1}/${batches.length}`;
    await appendLog(`${entityName} batch ${batchLabel}: start (${batch.length} rows)`);

    const response = await postJson(BULK_ENDPOINT, {
      [payloadKey]: batch,
    });

    if (Array.isArray(response?.errors) && response.errors.length > 0) {
      throw new Error(
        `${entityName} batch ${batchLabel} returned errors: ${JSON.stringify(response.errors)}`,
      );
    }

    const inserted = Number(response?.inserted?.[entityName] ?? 0);
    const updated = Number(response?.updated?.[entityName] ?? 0);
    counters[entityName] += inserted + updated;

    await appendLog(
      `${entityName} batch ${batchLabel}: ok (inserted=${inserted}, updated=${updated})`,
    );
  }
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

async function readManifest(mediaDir) {
  const manifestPath = path.join(mediaDir, "manifest.json");
  try {
    const text = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listCategoryFiles(mediaDir, category) {
  const categoryDir = path.join(mediaDir, category);
  try {
    const names = await fs.readdir(categoryDir);
    return names.map((name) => ({
      externalId: name.replace(/\.[^.]+$/, ""),
      localPath: path.join(categoryDir, name),
    }));
  } catch {
    return [];
  }
}

async function uploadMediaEntries(kind, entries, counters) {
  if (!entries.length) {
    await appendLog(`media:${kind}: no files to upload`);
    return;
  }

  let nextIndex = 0;
  const failures = [];

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= entries.length) {
        return;
      }

      const entry = entries[index];
      try {
        const bytes = await fs.readFile(entry.localPath);
        const mimeType = guessMimeType(entry.localPath);
        const dataBase64 = `data:${mimeType};base64,${bytes.toString("base64")}`;

        await postJson(MEDIA_ENDPOINT, {
          kind,
          externalId: entry.externalId,
          dataBase64,
        });

        counters[kind === "avatar" ? "photos" : "receipts"] += 1;
      } catch (error) {
        failures.push({
          kind,
          externalId: entry.externalId,
          file: entry.localPath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: MEDIA_CONCURRENCY }, () => worker()));

  if (failures.length > 0) {
    throw new Error(`media:${kind} failed for ${failures.length} files: ${JSON.stringify(failures)}`);
  }
}

async function main() {
  await fs.writeFile(LOG_FILE, "");

  if (!SESSION_COOKIE && !BEARER_TOKEN) {
    throw new Error("Provide TIMEO_SESSION_COOKIE (or TIMEO_PLATFORM_ADMIN_BEARER)");
  }

  const rawText = await fs.readFile(EXPORT_FILE, "utf8");
  const fullExport = JSON.parse(rawText);

  await appendLog(`Loaded export file: ${EXPORT_FILE}`);
  const mapped = collectMappings(fullExport);

  const counters = {
    members: 0,
    plans: 0,
    memberships: 0,
    payments: 0,
    invoices: 0,
    checkIns: 0,
    turnstileEvents: 0,
    turnstileFaceLogs: 0,
    photos: 0,
    receipts: 0,
  };

  await postBatches("plans", mapped.plans, "plans", counters);
  await postBatches("members", mapped.members, "members", counters);
  await postBatches("memberships", mapped.memberships, "memberships", counters);
  await postBatches("payments", mapped.payments, "payments", counters);
  await postBatches("invoices", mapped.invoices, "invoices", counters);
  await postBatches("checkIns", mapped.checkIns, "checkIns", counters);
  await postBatches("turnstileEvents", mapped.turnstileEvents, "turnstileEvents", counters);
  await postBatches(
    "turnstileFaceLogs",
    mapped.turnstileFaceLogs,
    "turnstileFaceLogs",
    counters,
  );

  const manifest = await readManifest(MEDIA_DIR);
  const avatarEntries =
    manifest?.files?.avatars?.map((row) => ({
      externalId: row.externalId,
      localPath: row.localPath,
    })) ?? (await listCategoryFiles(MEDIA_DIR, "avatars"));

  const receiptEntries =
    manifest?.files?.receipts?.map((row) => ({
      externalId: row.externalId,
      localPath: row.localPath,
    })) ?? (await listCategoryFiles(MEDIA_DIR, "receipts"));

  await uploadMediaEntries("avatar", avatarEntries, counters);
  await uploadMediaEntries("receipt", receiptEntries, counters);

  const activeMemberships = mapped.memberships.filter((row) => row.status === "active").length;

  const summary = {
    membersImported: counters.members,
    plansImported: counters.plans,
    membershipsImported: counters.memberships,
    membershipsActive: activeMemberships,
    paymentsImported: counters.payments,
    invoicesImported: counters.invoices,
    checkInsRecorded: counters.checkIns,
    turnstileEventsImported: counters.turnstileEvents,
    turnstileFaceLogsImported: counters.turnstileFaceLogs,
    photosUploaded: counters.photos,
    receiptsUploaded: counters.receipts,
    logFile: LOG_FILE,
  };

  await appendLog(`Import complete: ${JSON.stringify(summary)}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[wsfit-import] Failed:", message);
  try {
    await appendLog(`Import failed: ${message}`);
  } catch {
    // ignore logging failures
  }
  process.exit(1);
});

