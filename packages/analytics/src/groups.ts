/**
 * PostHog Group Analytics by tenant.
 *
 * Uses PostHog's "Groups" feature so that events can be attributed
 * to a specific tenant (company / business), enabling tenant-level
 * funnels and dashboards.
 */
import type PostHog from "posthog-react-native";
import type { PostHog as PostHogWeb } from "posthog-js";

export interface TenantGroupProps {
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  plan?: string;
}

/**
 * Associate the current user with a tenant group (mobile).
 */
export function setTenantGroup(
  posthog: PostHog | null | undefined,
  props: TenantGroupProps
) {
  if (!posthog) return;

  posthog.group("tenant", props.tenantId, {
    name: props.tenantName,
    slug: props.tenantSlug,
    plan: props.plan,
  });
}

/**
 * Associate the current user with a tenant group (web).
 */
export function setTenantGroupWeb(
  posthog: PostHogWeb | null | undefined,
  props: TenantGroupProps
) {
  if (!posthog) return;

  posthog.group("tenant", props.tenantId, {
    name: props.tenantName,
    slug: props.tenantSlug,
    plan: props.plan,
  });
}
