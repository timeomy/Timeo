"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const TIMEO_TO_CLERK_ROLE: Record<string, string> = {
  platform_admin: "org:platform_admin",
  admin: "org:admin",
  staff: "org:staff",
  customer: "org:customer",
};

/**
 * Syncs a role change from Convex to Clerk.
 * Finds the user's Clerk org membership and updates their role.
 */
export const syncRoleToClerk = internalAction({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
    newRole: v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.warn("[clerkSync] CLERK_SECRET_KEY not set, skipping role sync");
      return;
    }

    const clerkRole = TIMEO_TO_CLERK_ROLE[args.newRole];
    if (!clerkRole) {
      console.warn(`[clerkSync] Unknown role: ${args.newRole}, skipping`);
      return;
    }

    try {
      // Find the membership ID for this user in this org
      const membershipsRes = await fetch(
        `https://api.clerk.com/v1/organizations/${args.clerkOrgId}/memberships?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!membershipsRes.ok) {
        console.error("[clerkSync] Failed to list org memberships:", membershipsRes.status);
        return;
      }

      const membershipsData = await membershipsRes.json();
      const membership = membershipsData.data?.find(
        (m: any) => m.public_user_data?.user_id === args.clerkUserId
      );

      if (!membership) {
        console.warn(`[clerkSync] User ${args.clerkUserId} not found in org ${args.clerkOrgId}`);
        return;
      }

      // Update the membership role
      const updateRes = await fetch(
        `https://api.clerk.com/v1/organizations/${args.clerkOrgId}/memberships/${membership.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: clerkRole }),
        }
      );

      if (!updateRes.ok) {
        const errBody = await updateRes.text();
        console.error("[clerkSync] Failed to update role:", updateRes.status, errBody);
        return;
      }

      console.log(`[clerkSync] Synced role for user ${args.clerkUserId}: ${clerkRole}`);
    } catch (err) {
      console.error("[clerkSync] Error syncing role to Clerk:", err);
    }
  },
});
