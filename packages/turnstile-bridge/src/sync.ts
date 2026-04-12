import { Buffer } from "node:buffer";
import type { BridgeConfig } from "./config.js";
import { logger } from "./logger.js";
import type { TurnstileClient } from "./turnstile.js";

interface ActiveMember {
  id: string;
  name: string;
  imageUrl: string;
}

interface SyncFailure {
  action: "enroll" | "remove";
  personId: string;
  message: string;
}

export interface FullSyncResult {
  startedAt: string;
  completedAt: string;
  activeMembers: number;
  turnstilePersons: number;
  enrolled: number;
  removed: number;
  failures: SyncFailure[];
}

type MemberStatus = "active" | "suspended" | "expired" | "removed" | "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveUrl(pathOrUrl: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, baseUrl).toString();
}

function normalizeStatus(value: string | null): MemberStatus {
  if (!value) {
    return "unknown";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "active" || normalized === "renewed") {
    return "active";
  }

  if (normalized === "suspended") {
    return "suspended";
  }

  if (normalized === "removed" || normalized === "deleted") {
    return "removed";
  }

  if (normalized === "expired" || normalized === "inactive") {
    return "expired";
  }

  return "unknown";
}

function shouldIncludeStatus(status: MemberStatus): boolean {
  return status === "active" || status === "unknown";
}

function buildAuthHeaders(config: BridgeConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.timeoApiToken) {
    headers.Authorization = config.timeoApiToken.toLowerCase().startsWith("bearer ")
      ? config.timeoApiToken
      : `Bearer ${config.timeoApiToken}`;
  }

  if (config.turnstileBridgeSecret) {
    headers["X-Turnstile-Bridge-Secret"] = config.turnstileBridgeSecret;
  }

  return headers;
}

async function fetchJson(url: string, config: BridgeConfig): Promise<unknown> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    config.httpRequestTimeoutMs,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(config),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Timeo API request failed (${response.status} ${response.statusText}): ${text.slice(
          0,
          200,
        )}`,
      );
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function fetchImageBase64(
  imageUrl: string,
  config: BridgeConfig,
): Promise<string> {
  const absoluteUrl = resolveUrl(imageUrl, config.timeoApiUrl);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    config.httpRequestTimeoutMs,
  );

  try {
    const response = await fetch(absoluteUrl, {
      method: "GET",
      headers: buildAuthHeaders(config),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed downloading face image (${response.status} ${response.statusText})`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("Downloaded face image is empty");
    }

    return buffer.toString("base64");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function extractMemberCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.members)) {
    return payload.members;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (isRecord(payload.data)) {
    const nestedData = payload.data;

    if (Array.isArray(nestedData.members)) {
      return nestedData.members;
    }

    if (Array.isArray(nestedData.items)) {
      return nestedData.items;
    }

    if (Array.isArray(nestedData.results)) {
      return nestedData.results;
    }
  }

  return [];
}

function normalizeMember(value: unknown): ActiveMember | null {
  if (!isRecord(value)) {
    return null;
  }

  const user = isRecord(value.user) ? value.user : null;
  const membership = isRecord(value.membership) ? value.membership : null;

  const id = readString(value.userId, value.id, value.memberId, user?.id);
  const name = readString(value.memberName, value.name, user?.name) ?? "Member";
  const imageUrl = readString(
    value.faceImageUrl,
    value.avatarUrl,
    value.photoUrl,
    user?.avatarUrl,
  );

  const status = normalizeStatus(
    readString(value.membershipStatus, value.status, membership?.status),
  );

  if (!id || !imageUrl || !shouldIncludeStatus(status)) {
    return null;
  }

  return {
    id,
    name,
    imageUrl,
  };
}

async function fetchActiveMembersFromEndpoint(
  config: BridgeConfig,
  endpoint: string,
): Promise<ActiveMember[]> {
  const payload = await fetchJson(resolveUrl(endpoint, config.timeoApiUrl), config);
  const candidates = extractMemberCandidates(payload);
  const byId = new Map<string, ActiveMember>();

  for (const candidate of candidates) {
    const normalized = normalizeMember(candidate);
    if (!normalized) {
      continue;
    }

    byId.set(normalized.id, normalized);
  }

  return [...byId.values()];
}

interface GymListMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  membershipStatus: MemberStatus;
}

function extractGymMembers(payload: unknown): {
  members: GymListMember[];
  totalPages: number;
} {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return { members: [], totalPages: 1 };
  }

  const data = payload.data;
  const rows = Array.isArray(data.members) ? data.members : [];
  const members: GymListMember[] = [];

  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }

    const user = isRecord(row.user) ? row.user : null;
    const membership = isRecord(row.membership) ? row.membership : null;

    const userId = readString(user?.id);
    if (!userId) {
      continue;
    }

    members.push({
      userId,
      name: readString(user?.name) ?? "Member",
      avatarUrl: readString(user?.avatarUrl),
      membershipStatus: normalizeStatus(readString(membership?.status)),
    });
  }

  const pagination = isRecord(data.pagination) ? data.pagination : null;
  const parsedTotalPages = Number.parseInt(
    String(pagination?.totalPages ?? "1"),
    10,
  );

  return {
    members,
    totalPages:
      Number.isFinite(parsedTotalPages) && parsedTotalPages > 0
        ? parsedTotalPages
        : 1,
  };
}

async function fetchGymMemberDetail(
  config: BridgeConfig,
  tenantId: string,
  memberId: string,
): Promise<ActiveMember | null> {
  const url = resolveUrl(
    `/api/tenants/${tenantId}/gym/members/${memberId}`,
    config.timeoApiUrl,
  );

  const payload = await fetchJson(url, config);

  if (!isRecord(payload) || !isRecord(payload.data)) {
    return null;
  }

  const data = payload.data;
  const user = isRecord(data.user) ? data.user : null;

  const status = normalizeStatus(readString(data.membershipStatus));
  if (!shouldIncludeStatus(status)) {
    return null;
  }

  const id = readString(user?.id) ?? memberId;
  const name = readString(user?.name) ?? "Member";
  const imageUrl = readString(user?.avatarUrl);

  if (!imageUrl) {
    return null;
  }

  return { id, name, imageUrl };
}

async function fetchActiveMembersFromGymApi(
  config: BridgeConfig,
): Promise<ActiveMember[]> {
  if (!config.timeoTenantId) {
    throw new Error(
      "TIMEO_TENANT_ID is required when TIMEO_ACTIVE_MEMBERS_ENDPOINT is not set",
    );
  }

  const candidates: GymListMember[] = [];

  let page = 1;
  let totalPages = 1;

  do {
    const url = resolveUrl(
      `/api/tenants/${config.timeoTenantId}/gym/members?page=${page}&limit=100`,
      config.timeoApiUrl,
    );

    const payload = await fetchJson(url, config);
    const parsed = extractGymMembers(payload);

    totalPages = parsed.totalPages;

    for (const member of parsed.members) {
      if (!member.avatarUrl) {
        continue;
      }

      if (!shouldIncludeStatus(member.membershipStatus)) {
        continue;
      }

      candidates.push(member);
    }

    page += 1;
  } while (page <= totalPages);

  const byId = new Map<string, ActiveMember>();

  for (const candidate of candidates) {
    try {
      const detailed = await fetchGymMemberDetail(
        config,
        config.timeoTenantId,
        candidate.userId,
      );

      if (detailed) {
        byId.set(detailed.id, detailed);
      }
    } catch (error) {
      logger.warn("Skipping member during detail fetch", {
        memberId: candidate.userId,
        message: (error as Error).message,
      });
    }
  }

  return [...byId.values()];
}

async function fetchActiveMembers(
  config: BridgeConfig,
): Promise<ActiveMember[]> {
  if (
    config.timeoTenantId &&
    config.timeoActiveMembersEndpoint ===
      `/api/tenants/${config.timeoTenantId}/gym/members`
  ) {
    return fetchActiveMembersFromGymApi(config);
  }

  if (config.timeoActiveMembersEndpoint) {
    return fetchActiveMembersFromEndpoint(config, config.timeoActiveMembersEndpoint);
  }

  return fetchActiveMembersFromGymApi(config);
}

export async function runFullSync(input: {
  config: BridgeConfig;
  turnstileClient: TurnstileClient;
}): Promise<FullSyncResult> {
  const startedAt = new Date();
  const failures: SyncFailure[] = [];

  const activeMembers = await fetchActiveMembers(input.config);
  const activeById = new Map(activeMembers.map((member) => [member.id, member]));

  const turnstilePersons = await input.turnstileClient.listPersons();
  const turnstileById = new Map(
    turnstilePersons
      .map((person) => {
        const id = typeof person.id === "string" ? person.id : String(person.id ?? "");
        return [id, person] as const;
      })
      .filter(([id]) => id.length > 0),
  );

  let enrolled = 0;
  let removed = 0;

  for (const member of activeMembers) {
    if (turnstileById.has(member.id)) {
      continue;
    }

    try {
      const imageBase64 = await fetchImageBase64(member.imageUrl, input.config);
      await input.turnstileClient.enrollFace(member.id, member.name, imageBase64);
      enrolled += 1;
    } catch (error) {
      failures.push({
        action: "enroll",
        personId: member.id,
        message: (error as Error).message,
      });
    }
  }

  for (const person of turnstilePersons) {
    const personId =
      typeof person.id === "string" ? person.id : String(person.id ?? "");

    if (!personId || activeById.has(personId)) {
      continue;
    }

    try {
      await input.turnstileClient.deleteFace(personId);
      removed += 1;
    } catch (error) {
      failures.push({
        action: "remove",
        personId,
        message: (error as Error).message,
      });
    }
  }

  const completedAt = new Date();

  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    activeMembers: activeMembers.length,
    turnstilePersons: turnstileById.size,
    enrolled,
    removed,
    failures,
  };
}
