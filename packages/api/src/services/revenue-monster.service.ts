/**
 * Revenue Monster payment gateway integration.
 *
 * Supports: FPX, Touch 'n Go, Boost, GrabPay, ShopeePay, DuitNow QR
 * SDK: rm-api-sdk
 * Sandbox: sb-oauth.revenuemonster.my / sb-open.revenuemonster.my
 *
 * NOTE: Does NOT support recurring billing.
 * Subscriptions use Stripe only.
 */

import crypto from "node:crypto";
import { RMSDK } from "rm-api-sdk";
import fs from "node:fs";

// ─── Configuration ────────────────────────────────────────────────────────────

interface RMConfig {
  clientId: string;
  clientSecret: string;
  privateKey: string;
  isProduction: boolean;
  storeId?: string;
}

function getConfig(): RMConfig {
  const clientId = process.env.REVENUE_MONSTER_CLIENT_ID;
  const clientSecret = process.env.REVENUE_MONSTER_CLIENT_SECRET;
  const privateKeyPath = process.env.REVENUE_MONSTER_PRIVATE_KEY_PATH;
  const environment = process.env.REVENUE_MONSTER_ENVIRONMENT ?? "sandbox";

  if (!clientId || !clientSecret || !privateKeyPath) {
    throw new Error(
      "Revenue Monster not configured. Set REVENUE_MONSTER_CLIENT_ID, REVENUE_MONSTER_CLIENT_SECRET, and REVENUE_MONSTER_PRIVATE_KEY_PATH",
    );
  }

  const privateKey = fs.readFileSync(privateKeyPath, "utf-8");

  return {
    clientId,
    clientSecret,
    privateKey,
    isProduction: environment === "production",
    storeId: process.env.REVENUE_MONSTER_STORE_ID,
  };
}

// ─── SDK Instance (lazy singleton) ────────────────────────────────────────────

let sdkInstance: ReturnType<typeof RMSDK> | null = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;

function getSDK() {
  if (!sdkInstance) {
    const config = getConfig();
    sdkInstance = RMSDK({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      privateKey: config.privateKey,
      isProduction: config.isProduction,
      timeout: 10_000,
    });
  }
  return sdkInstance;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) {
    return accessToken;
  }

  const sdk = getSDK();
  const result = await sdk.getClientCredentials();
  const token = result.accessToken;
  accessToken = token;
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = now + (result.expiresIn - 300) * 1000;
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRMPaymentInput {
  amount: number; // cents
  currency: string;
  orderId: string;
  description: string;
  redirectUrl: string;
  notifyUrl: string;
}

export interface CreateDuitNowQRInput {
  amount: number; // cents
  orderId: string;
  description: string;
}

export interface RMPaymentResult {
  paymentUrl: string;
  rmOrderId: string;
  checkoutId: string;
}

export interface RMQRResult {
  qrCodeUrl: string;
  rmOrderId: string;
}

export interface RMPaymentStatus {
  status: "pending" | "success" | "failed";
  amount: number; // cents
  transactionId: string;
  method: string;
}

export interface CreateRefundInput {
  paymentId: string;
  amount: number; // cents
  reason: string;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Create an FPX/eWallet web payment.
 * Returns a payment URL to redirect the customer to.
 */
export async function createPayment(
  input: CreateRMPaymentInput,
): Promise<RMPaymentResult> {
  const sdk = getSDK();
  const token = await getAccessToken();
  const config = getConfig();

  const result = await sdk.Payment.createTransactionUrl(token, {
    amount: input.amount, // RM SDK uses cents
    currencyType: input.currency,
    expiry: { type: "PERMANENT" },
    isPreFillAmount: true,
    method: [], // Empty = all available methods (FPX, eWallets)
    order: {
      title: input.orderId,
      details: input.description,
    },
    redirectUrl: input.redirectUrl,
    storeId: config.storeId ?? "",
    type: "DYNAMIC",
  });

  return {
    paymentUrl: result.item.url,
    rmOrderId: result.item.order?.id ?? result.item.code,
    checkoutId: result.item.code,
  };
}

/**
 * Create a DuitNow QR code for in-store payment.
 * Returns a QR code URL string.
 */
export async function createDuitNowQR(
  input: CreateDuitNowQRInput,
): Promise<RMQRResult> {
  const sdk = getSDK();
  const token = await getAccessToken();
  const config = getConfig();

  const result = await sdk.Payment.createTransactionUrl(token, {
    amount: input.amount,
    currencyType: "MYR",
    expiry: { type: "PERMANENT" },
    isPreFillAmount: true,
    method: ["DUITNOW_QR"],
    order: {
      title: input.orderId,
      details: input.description,
    },
    redirectUrl: "",
    storeId: config.storeId ?? "",
    type: "DYNAMIC",
  });

  return {
    qrCodeUrl: result.item.qrCodeUrl ?? result.item.url,
    rmOrderId: result.item.order?.id ?? result.item.code,
  };
}

/**
 * Verify Revenue Monster webhook signature.
 *
 * RM signs webhook payloads using SHA256 with RSA.
 * The signature is base64-encoded and sent in the x-signature header.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  const publicKeyPath = process.env.REVENUE_MONSTER_PUBLIC_KEY_PATH;
  if (!publicKeyPath) {
    console.error("REVENUE_MONSTER_PUBLIC_KEY_PATH not set — cannot verify webhook");
    return false;
  }

  try {
    const publicKey = fs.readFileSync(publicKeyPath, "utf-8");
    const verifier = crypto.createVerify("SHA256");
    verifier.update(payload);
    return verifier.verify(publicKey, signature, "base64");
  } catch (err) {
    console.error("RM webhook signature verification failed:", (err as Error).message);
    return false;
  }
}

/**
 * Get payment status by transaction ID.
 */
export async function getPaymentStatus(
  transactionId: string,
): Promise<RMPaymentStatus> {
  const sdk = getSDK();
  const token = await getAccessToken();

  const result = await sdk.Payment.getPaymentTransactionById(
    token,
    transactionId,
  );

  const item = result.item;
  const statusMap: Record<string, "pending" | "success" | "failed"> = {
    SUCCESS: "success",
    FAILED: "failed",
    REVERSED: "failed",
    REFUNDED: "failed",
    IN_PROCESS: "pending",
    FULL_REFUNDED: "failed",
  };

  return {
    status: statusMap[item.status] ?? "pending",
    amount: item.order?.amount ?? item.amount ?? 0,
    transactionId: item.transactionId,
    method: item.method ?? "unknown",
  };
}

/**
 * Initiate a refund for a completed payment.
 */
export async function createRefund(input: CreateRefundInput): Promise<{
  refundId: string;
  status: string;
}> {
  const sdk = getSDK();
  const token = await getAccessToken();

  const result = await sdk.Payment.refund(token, {
    transactionId: input.paymentId,
    refund: {
      type: input.amount > 0 ? "PARTIAL" : "FULL",
      currencyType: "MYR",
      amount: input.amount,
    },
    reason: input.reason,
  });

  return {
    refundId: result.item.transactionId,
    status: result.item.status,
  };
}

/**
 * Check if Revenue Monster is configured (env vars present).
 * Used at startup to log availability without throwing.
 */
export function isConfigured(): boolean {
  return !!(
    process.env.REVENUE_MONSTER_CLIENT_ID &&
    process.env.REVENUE_MONSTER_CLIENT_SECRET &&
    process.env.REVENUE_MONSTER_PRIVATE_KEY_PATH
  );
}
