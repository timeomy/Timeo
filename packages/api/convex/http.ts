import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { handleStripeWebhook } from "./stripeWebhook";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const eventType = body.type as string;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          body.data;
        const primaryEmail = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

        if (primaryEmail) {
          await ctx.runMutation(internal.auth.upsertUser, {
            clerkId: id,
            email: primaryEmail,
            name,
            avatarUrl: image_url,
          });
        }
        break;
      }

      case "user.deleted": {
        const { id } = body.data;
        await ctx.runMutation(internal.auth.deleteUser, {
          clerkId: id,
        });
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Stripe webhook route
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: handleStripeWebhook,
});

export default http;
