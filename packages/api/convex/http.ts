import { httpRouter } from "convex/server";
import { handleStripeWebhook } from "./stripeWebhook";
import { authComponent, createAuth } from "./betterAuth";

const http = httpRouter();

// Register Better Auth routes (sign-in, sign-up, session, JWKS, etc.)
authComponent.registerRoutes(http, createAuth);

// Stripe webhook route
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: handleStripeWebhook,
});

export default http;
