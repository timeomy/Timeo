import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticateUser, requireRole } from "./lib/middleware";
import { fileTypeValidator } from "./validators";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// --- Queries ---

export const getByEntity = query({
  args: {
    entityType: fileTypeValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticateUser(ctx);
    return await ctx.db
      .query("files")
      .withIndex("by_entity", (q) =>
        q.eq("type", args.entityType).eq("entityId", args.entityId)
      )
      .collect();
  },
});

export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    type: v.optional(fileTypeValidator),
  },
  handler: async (ctx, args) => {
    await authenticateUser(ctx);
    const files = await ctx.db
      .query("files")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    if (args.type) {
      return files.filter((f) => f.type === args.type);
    }
    return files;
  },
});

// --- Mutations ---

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await authenticateUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    type: fileTypeValidator,
    entityId: v.optional(v.string()),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);

    if (!ALLOWED_MIME_TYPES.includes(args.mimeType)) {
      throw new Error(
        `Unsupported file type: ${args.mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    if (args.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${(args.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`
      );
    }

    return await ctx.db.insert("files", {
      tenantId: args.tenantId,
      uploadedBy: user._id,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      type: args.type,
      entityId: args.entityId,
      createdAt: Date.now(),
    });
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    // Only uploader or tenant admin can delete
    if (file.uploadedBy !== user._id && file.tenantId) {
      await requireRole(ctx, file.tenantId, ["admin"]);
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
  },
});

export const updateEntityImage = mutation({
  args: {
    entityType: v.union(
      v.literal("product"),
      v.literal("service"),
      v.literal("user"),
      v.literal("tenant")
    ),
    entityId: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticateUser(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Storage file not found");

    switch (args.entityType) {
      case "product": {
        const product = await ctx.db.get(args.entityId as any);
        if (!product) throw new Error("Product not found");
        await requireRole(ctx, product.tenantId, ["admin", "staff"]);
        await ctx.db.patch(args.entityId as any, {
          imageUrl: url,
          updatedAt: Date.now(),
        });
        break;
      }
      case "service": {
        const service = await ctx.db.get(args.entityId as any);
        if (!service) throw new Error("Service not found");
        await requireRole(ctx, service.tenantId, ["admin", "staff"]);
        await ctx.db.patch(args.entityId as any, {
          imageUrl: url,
          updatedAt: Date.now(),
        });
        break;
      }
      case "user": {
        if (args.entityId !== user._id) {
          throw new Error("You can only update your own avatar");
        }
        await ctx.db.patch(user._id, { avatarUrl: url });
        break;
      }
      case "tenant": {
        const tenant = await ctx.db.get(args.entityId as any);
        if (!tenant) throw new Error("Tenant not found");
        await requireRole(ctx, tenant._id, ["admin"]);
        await ctx.db.patch(tenant._id, {
          branding: { ...tenant.branding, logoUrl: url },
        });
        break;
      }
    }
  },
});
