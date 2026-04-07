// WALLET PASS GENERATION API
//
// Apple Wallet:
//   GET https://api.timeo.my/api/wallet/apple-pass?tenantId=xxx
//   → Returns pass JSON structure (signing requires Apple certificates)
//
// Google Wallet:
//   GET https://api.timeo.my/api/wallet/google-pass-url?tenantId=xxx
//   → Returns pass object structure (signing requires Google service account)

import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// ─── GET /apple-pass — Generate Apple Wallet .pkpass structure ─────────────

app.get("/apple-pass", authMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.req.query("tenantId");

  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!passTypeId || !teamId) {
    return c.json(
      error(
        "NOT_CONFIGURED",
        "Apple Wallet not configured. Set APPLE_PASS_TYPE_ID and APPLE_TEAM_ID env vars.",
      ),
      503,
    );
  }

  // Apple Wallet pass.json structure
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: user.id,
    teamIdentifier: teamId,
    organizationName: "Timeo",
    description: "Timeo Member Card",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(0, 102, 255)",
    labelColor: "rgb(200, 220, 255)",
    storeCard: {
      primaryFields: [
        { key: "name", label: "MEMBER", value: user.name },
      ],
      secondaryFields: [
        { key: "status", label: "STATUS", value: "Active" },
        { key: "type", label: "PLAN", value: "Monthly Member" },
      ],
      auxiliaryFields: [
        {
          key: "expires",
          label: "EXPIRES",
          value: "2026-03-27T00:00:00Z",
          dateStyle: "PKDateStyleShort",
        },
      ],
      backFields: [
        {
          key: "terms",
          label: "Terms",
          value: "Present this card at the gym entrance.",
        },
        { key: "website", label: "Website", value: "https://timeo.my" },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: user.id,
      messageEncoding: "iso-8859-1",
      altText: user.id.substring(0, 8).toUpperCase(),
    },
    nfc: {
      message: user.id,
      encryptionPublicKey: process.env.APPLE_NFC_PUBLIC_KEY ?? "",
    },
  };

  // TODO: Sign with Apple certificate using node-passkit-generator or similar
  // For now return the pass JSON structure so frontend can preview
  return c.json(
    success({
      passJson,
      message:
        "Apple Wallet signing requires APPLE_PASS_CERT env var. Pass structure is ready.",
      memberId: user.id.substring(0, 8).toUpperCase(),
    }),
  );
});

// ─── GET /google-pass-url — Generate Google Wallet save URL ────────────────

app.get("/google-pass-url", authMiddleware, async (c) => {
  const user = c.get("user");
  const tenantId = c.req.query("tenantId");

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;

  if (!issuerId || !serviceAccountEmail) {
    return c.json(
      error(
        "NOT_CONFIGURED",
        "Google Wallet not configured. Set GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL env vars.",
      ),
      503,
    );
  }

  // Google Wallet Generic Pass object
  const passObject = {
    id: `${issuerId}.${user.id}`,
    classId: `${issuerId}.timeo-member`,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#0066FF",
    logo: { sourceUri: { uri: "https://timeo.my/icon.svg" } },
    cardTitle: {
      defaultValue: { language: "en", value: "Timeo" },
    },
    subheader: {
      defaultValue: { language: "en", value: "Member Card" },
    },
    header: {
      defaultValue: { language: "en", value: user.name },
    },
    barcode: {
      type: "QR_CODE",
      value: user.id,
      alternateText: user.id.substring(0, 8).toUpperCase(),
    },
    textModulesData: [
      { id: "status", header: "STATUS", body: "Active" },
      { id: "expires", header: "EXPIRES", body: "Mar 27, 2026" },
    ],
  };

  // TODO: Sign JWT with Google service account private key
  // using googleapis or google-auth-library
  return c.json(
    success({
      passObject,
      message:
        "Google Wallet signing requires GOOGLE_WALLET_PRIVATE_KEY env var. Pass structure ready.",
      saveUrl: "https://pay.google.com/gp/v/save/SIGNED_JWT_HERE",
    }),
  );
});

export { app as walletRouter };
