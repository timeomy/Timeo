import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function insertAuditLog(
  ctx: MutationCtx,
  args: {
    tenantId?: Id<"tenants">;
    actorId: Id<"users">;
    action: string;
    resource: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("auditLogs", {
    tenantId: args.tenantId,
    actorId: args.actorId,
    action: args.action,
    resource: args.resource,
    resourceId: args.resourceId,
    metadata: args.metadata,
    timestamp: Date.now(),
  });
}

export async function insertBookingEvent(
  ctx: MutationCtx,
  args: {
    tenantId: Id<"tenants">;
    bookingId: Id<"bookings">;
    type:
      | "created"
      | "confirmed"
      | "cancelled"
      | "completed"
      | "no_show"
      | "rescheduled"
      | "note_added";
    actorId: Id<"users">;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("bookingEvents", {
    tenantId: args.tenantId,
    bookingId: args.bookingId,
    type: args.type,
    actorId: args.actorId,
    metadata: args.metadata,
    timestamp: Date.now(),
  });
}
