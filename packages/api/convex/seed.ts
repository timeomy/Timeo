import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ─── Helper: List users (for finding owner ID) ──────────────────────────────

export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return { total: users.length, sample: users.slice(0, 5).map((u) => ({ _id: u._id, email: u.email, name: u.name })) };
  },
});

export const listTenants = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    return tenants.map((t) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      clerkOrgId: t.clerkOrgId ?? null,
      plan: t.plan,
      status: t.status,
    }));
  },
});

export const linkTenantToClerkOrg = internalMutation({
  args: {
    tenantSlug: v.string(),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .first();
    if (!tenant) throw new Error(`Tenant not found: ${args.tenantSlug}`);
    await ctx.db.patch(tenant._id, { clerkOrgId: args.clerkOrgId });
    return { tenantId: tenant._id, name: tenant.name, linked: true };
  },
});

// ─── Step 1: Create WS Fitness tenant with real data ─────────────────────

export const seedWsFitness = internalMutation({
  args: {
    ownerEmail: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if tenant already exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "ws-fitness"))
      .first();

    if (existing) {
      return { tenantId: existing._id, alreadyExists: true };
    }

    // Resolve or create owner user
    let ownerId = args.ownerUserId;
    if (!ownerId && args.ownerEmail) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.ownerEmail!))
        .first();
      if (existingUser) {
        ownerId = existingUser._id;
      }
    }
    if (!ownerId) {
      const email = args.ownerEmail || "admin@wsfitness.my";
      ownerId = await ctx.db.insert("users", {
        clerkId: `legacy_wsf_${email}`,
        email,
        name: "WS Fitness Admin",
        createdAt: now,
      });
    }

    const tenantId = await ctx.db.insert("tenants", {
      name: "WS Fitness",
      slug: "ws-fitness",
      ownerId,
      plan: "pro",
      status: "active",
      settings: {
        timezone: "Asia/Kuala_Lumpur",
        autoConfirmBookings: true,
        bookingBuffer: 15,
      },
      branding: {
        businessName: "WS Fitness",
        primaryColor: "#f59e0b",
      },
      createdAt: now,
    });

    // Owner membership
    await ctx.db.insert("tenantMemberships", {
      userId: ownerId,
      tenantId,
      role: "admin",
      status: "active",
      joinedAt: now,
    });

    // Business hours
    const hours = [
      { day: 0, open: "08:00", close: "18:00", isOpen: true },
      { day: 1, open: "06:00", close: "22:00", isOpen: true },
      { day: 2, open: "06:00", close: "22:00", isOpen: true },
      { day: 3, open: "06:00", close: "22:00", isOpen: true },
      { day: 4, open: "06:00", close: "22:00", isOpen: true },
      { day: 5, open: "06:00", close: "22:00", isOpen: true },
      { day: 6, open: "07:00", close: "20:00", isOpen: true },
    ];

    for (const h of hours) {
      await ctx.db.insert("businessHours", {
        tenantId,
        dayOfWeek: h.day,
        openTime: h.open,
        closeTime: h.close,
        isOpen: h.isOpen,
      });
    }

    // Services (based on actual WS Fitness offerings)
    const services = [
      { name: "Coach Training", description: "Personal training with a certified WS Fitness coach.", durationMinutes: 60, price: 5800, currency: "MYR" },
      { name: "Yoga", description: "Yoga classes for flexibility, balance, and mindfulness.", durationMinutes: 60, price: 4000, currency: "MYR" },
      { name: "Zumba", description: "High-energy Zumba dance fitness classes.", durationMinutes: 60, price: 1500, currency: "MYR" },
      { name: "Spinning", description: "Indoor cycling classes for cardio and endurance.", durationMinutes: 45, price: 4000, currency: "MYR" },
      { name: "Muscle Engagement", description: "Muscle engagement and strength training group class.", durationMinutes: 45, price: 3000, currency: "MYR" },
      { name: "Aerial Yoga", description: "Aerial yoga using hammocks for flexibility and core strength.", durationMinutes: 60, price: 5000, currency: "MYR" },
      { name: "WS Playzone", description: "Indoor playground for kids with CCTV monitoring and parent rest zone.", durationMinutes: 120, price: 3200, currency: "MYR" },
    ];

    for (const s of services) {
      await ctx.db.insert("services", {
        tenantId, ...s, isActive: true, createdBy: ownerId, createdAt: now, updatedAt: now,
      });
    }

    return { tenantId, alreadyExists: false };
  },
});

// ─── Step 2: Import membership plans ─────────────────────────────────────

export const importMembershipPlans = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    plans: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        priceRm: v.number(),
        durationMonths: v.number(),
        durationDays: v.number(),
        totalDays: v.number(),
        accessType: v.string(),
        isActive: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;

    for (const plan of args.plans) {
      // Map to Timeo membership structure
      // Use monthly interval for plans with month-based duration, yearly for 12mo
      const interval = plan.durationMonths >= 12 ? "yearly" as const : "monthly" as const;
      const priceInSen = Math.round(plan.priceRm * 100);

      // Build features from access type and description
      const features: string[] = [];
      if (plan.accessType === "all_access") features.push("Unlimited gym access");
      if (plan.accessType === "promo") features.push("Gym + Studio Classes");
      if (plan.accessType === "studio_class") features.push("Studio class access");
      if (plan.accessType === "training") features.push("Coach training sessions");
      if (plan.accessType === "day_pass") features.push("Day pass");
      if (plan.accessType === "playzone") features.push("Indoor playground access");
      if (plan.totalDays > 0) features.push(`Valid for ${plan.totalDays} days`);
      features.push("Complimentary water & ice dispenser");
      features.push("Hot shower facilities");

      await ctx.db.insert("memberships", {
        tenantId: args.tenantId,
        name: plan.name,
        description: plan.description || `${plan.name} membership plan`,
        price: priceInSen,
        currency: "MYR",
        interval,
        features,
        isActive: plan.isActive,
        createdAt: now,
      });
      count++;
    }

    return { imported: count };
  },
});

// ─── Step 3: Import members (batch) ──────────────────────────────────────

export const importMembers = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    members: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        role: v.string(),
        legacyId: v.optional(v.string()),
        nfcCardId: v.optional(v.string()),
        membershipStatus: v.string(),
        planType: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        waiverSignedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const member of args.members) {
      if (!member.email) { skipped++; continue; }

      // Check if user already exists by email
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", member.email))
        .first();

      let userId;
      if (existingUser) {
        userId = existingUser._id;
      } else {
        // Create placeholder user (no clerkId yet — they'll link when they sign up)
        userId = await ctx.db.insert("users", {
          clerkId: `legacy_wsf_${member.email}`,
          email: member.email,
          name: member.name,
          avatarUrl: member.avatarUrl || undefined,
          createdAt: now,
        });
      }

      // Check if tenant membership already exists
      const existingMembership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", userId)
        )
        .unique();

      if (!existingMembership) {
        // Map role: coach → staff, member → customer
        const role = member.role === "coach" ? "staff" as const : "customer" as const;
        const status = member.membershipStatus === "active" ? "active" as const : "active" as const;

        await ctx.db.insert("tenantMemberships", {
          userId,
          tenantId: args.tenantId,
          role,
          status,
          joinedAt: now,
        });
        created++;
      } else {
        skipped++;
      }

      // Generate QR code for active members
      if (member.membershipStatus === "active" || member.membershipStatus === "pending_approval") {
        const existingQr = await ctx.db
          .query("memberQrCodes")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
          .first();

        if (!existingQr) {
          const code = [
            Date.now().toString(36),
            Math.random().toString(36).substring(2, 8),
            userId.substring(0, 8),
          ].join("-");

          await ctx.db.insert("memberQrCodes", {
            tenantId: args.tenantId,
            userId,
            code,
            isActive: true,
            createdAt: now,
          });
        }
      }
    }

    return { created, skipped };
  },
});

// ─── Step 4: Import coaches as staff ─────────────────────────────────────

export const importCoaches = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    coaches: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;

    for (const coach of args.coaches) {
      // Create or find user
      let existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", coach.email))
        .first();

      let userId;
      if (existingUser) {
        userId = existingUser._id;
      } else {
        userId = await ctx.db.insert("users", {
          clerkId: `legacy_wsf_${coach.email}`,
          email: coach.email,
          name: coach.name,
          createdAt: now,
        });
      }

      // Create staff membership
      const existingMembership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", userId)
        )
        .unique();

      if (!existingMembership) {
        await ctx.db.insert("tenantMemberships", {
          userId,
          tenantId: args.tenantId,
          role: "staff",
          status: "active",
          joinedAt: now,
        });
        created++;
      } else if (existingMembership.role === "customer") {
        // Upgrade customer to staff
        await ctx.db.patch(existingMembership._id, { role: "staff" });
        created++;
      }

      // Set up staff availability (Mon-Sat available)
      for (let day = 1; day <= 6; day++) {
        const existing = await ctx.db
          .query("staffAvailability")
          .withIndex("by_staff", (q) => q.eq("staffId", userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("tenantId"), args.tenantId),
              q.eq(q.field("dayOfWeek"), day)
            )
          )
          .first();

        if (!existing) {
          await ctx.db.insert("staffAvailability", {
            staffId: userId,
            tenantId: args.tenantId,
            dayOfWeek: day,
            startTime: "08:00",
            endTime: "21:00",
            isAvailable: true,
          });
        }
      }
    }

    return { created };
  },
});

// ─── Step 5: Import session credits for coaching clients ─────────────────

export const importSessionCredits = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    clients: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        packageType: v.string(),
        totalSessions: v.number(),
        sessionsUsed: v.number(),
        sessionsRemaining: v.number(),
        expiryDate: v.optional(v.string()),
        assignedCoach: v.string(),
        status: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const client of args.clients) {
      // Find user by email or name
      let userId;
      if (client.email) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", client.email!))
          .first();
        userId = user?._id;
      }

      if (!userId) {
        // Create user with name and phone (no email link)
        userId = await ctx.db.insert("users", {
          clerkId: `legacy_wsf_client_${client.phone || client.name.replace(/\s+/g, "_").toLowerCase()}`,
          email: client.email || `${client.name.replace(/\s+/g, ".").toLowerCase()}@wsfitness.placeholder`,
          name: client.name,
          createdAt: now,
        });

        // Create membership
        await ctx.db.insert("tenantMemberships", {
          userId,
          tenantId: args.tenantId,
          role: "customer",
          status: "active",
          joinedAt: now,
        });

        // Generate QR code
        const code = [
          Date.now().toString(36),
          Math.random().toString(36).substring(2, 8),
          userId.substring(0, 8),
        ].join("-");

        await ctx.db.insert("memberQrCodes", {
          tenantId: args.tenantId,
          userId,
          code,
          isActive: true,
          createdAt: now,
        });
      }

      // Map package type to session count
      const sessionMap: Record<string, number> = {
        "CT-1": 1, "CT-12": 12, "CT-16": 16, "CT-48": 48, "CT-99": 99,
      };
      const packageSessions = sessionMap[client.packageType] || client.totalSessions;

      // Find or create matching session package
      let sessionPackage = await ctx.db
        .query("sessionPackages")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .filter((q) => q.eq(q.field("sessionCount"), packageSessions))
        .first();

      if (!sessionPackage) {
        // Create the package
        const priceMap: Record<number, number> = {
          1: 5800, 12: 50000, 16: 61800, 48: 151800, 99: 298800,
        };
        const packageId = await ctx.db.insert("sessionPackages", {
          tenantId: args.tenantId,
          name: `Coach Training ${client.packageType || `x${packageSessions}`}`,
          description: `${packageSessions} coach training sessions`,
          sessionCount: packageSessions,
          price: priceMap[packageSessions] || packageSessions * 5800,
          currency: "MYR",
          isActive: true,
          createdAt: now,
        });
        sessionPackage = await ctx.db.get(packageId);
      }

      if (sessionPackage && client.status === "active") {
        // Create session credits
        const expiresAt = client.expiryDate
          ? new Date(client.expiryDate).getTime()
          : undefined;

        await ctx.db.insert("sessionCredits", {
          tenantId: args.tenantId,
          userId,
          packageId: sessionPackage._id,
          totalSessions: client.totalSessions,
          usedSessions: client.sessionsUsed,
          expiresAt,
          purchasedAt: now,
        });
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped };
  },
});
