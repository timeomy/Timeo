import dotenv from "dotenv";

dotenv.config();

function readNumber(
  value: string | undefined,
  fallback: number,
  min = 0,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
}

function readString(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function readOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

const syncIntervalHours = readNumber(process.env.SYNC_INTERVAL_HOURS, 6, 1);
const timeoTenantId = readOptionalString(process.env.TIMEO_TENANT_ID);

const defaultMembersEndpoint = timeoTenantId
  ? `/api/tenants/${timeoTenantId}/gym/members`
  : null;

const explicitMembersEndpoint = readOptionalString(
  process.env.TIMEO_ACTIVE_MEMBERS_ENDPOINT,
);

const membersEndpoint = explicitMembersEndpoint ?? defaultMembersEndpoint;

const syncCronExpression =
  readOptionalString(process.env.SYNC_CRON) ??
  `0 */${Math.max(syncIntervalHours, 1)} * * *`;

export interface BridgeConfig {
  port: number;
  turnstileIp: string;
  turnstilePort: number;
  turnstileUser: string;
  turnstilePass: string;
  turnstileReconnectMs: number;
  turnstileHttpTimeoutMs: number;
  turnstileCommandTimeoutMs: number;
  webhookSecret: string;
  timeoApiUrl: string;
  timeoApiToken: string | null;
  turnstileBridgeSecret: string | null;
  timeoTenantId: string | null;
  timeoActiveMembersEndpoint: string | null;
  syncIntervalHours: number;
  syncCronExpression: string;
  httpRequestTimeoutMs: number;
}

export const config: BridgeConfig = {
  port: readNumber(process.env.PORT, 3456, 1),
  turnstileIp: readString(process.env.TURNSTILE_IP, "192.168.1.201"),
  turnstilePort: readNumber(process.env.TURNSTILE_PORT, 8000, 1),
  turnstileUser: readString(process.env.TURNSTILE_USER, "admin"),
  turnstilePass: readString(process.env.TURNSTILE_PASS, "admin"),
  turnstileReconnectMs: readNumber(process.env.TURNSTILE_RECONNECT_MS, 5000, 250),
  turnstileHttpTimeoutMs: readNumber(
    process.env.TURNSTILE_HTTP_TIMEOUT_MS,
    10000,
    1000,
  ),
  turnstileCommandTimeoutMs: readNumber(
    process.env.TURNSTILE_COMMAND_TIMEOUT_MS,
    20000,
    1000,
  ),
  webhookSecret: readString(
    process.env.WEBHOOK_SECRET ?? process.env.TURNSTILE_WEBHOOK_SECRET,
    "",
  ),
  timeoApiUrl: readString(process.env.TIMEO_API_URL, "https://api.timeo.my"),
  timeoApiToken: readOptionalString(process.env.TIMEO_API_TOKEN),
  turnstileBridgeSecret: readOptionalString(process.env.TURNSTILE_BRIDGE_SECRET),
  timeoTenantId,
  timeoActiveMembersEndpoint: membersEndpoint,
  syncIntervalHours,
  syncCronExpression,
  httpRequestTimeoutMs: readNumber(process.env.HTTP_REQUEST_TIMEOUT_MS, 20000, 1000),
};
