/**
 * Revenue Monster payment gateway integration.
 *
 * Supports: FPX, Touch 'n Go, Boost, GrabPay, ShopeePay, DuitNow QR
 * SDK: rm-api-sdk (install separately)
 * Sandbox: sb-oauth.revenuemonster.my / sb-open.revenuemonster.my
 *
 * NOTE: Does NOT support recurring billing.
 * Subscriptions use Stripe only.
 */

export interface CreateRMPaymentInput {
  orderId: string;
  amount: number; // cents
  currency: string;
  redirectUrl: string;
  webhookUrl: string;
  storeId?: string;
}

export async function createRevenueMonsterPayment(
  _input: CreateRMPaymentInput,
) {
  // TODO: Implement using rm-api-sdk
  // const rm = new RMSDK({ clientId, clientSecret, privateKey, sandbox: true });
  // const result = await rm.payment.createWebPayment({ ... });
  throw new Error(
    "Revenue Monster payments not yet configured. Set REVENUE_MONSTER_CLIENT_ID and REVENUE_MONSTER_CLIENT_SECRET",
  );
}

export async function verifyRevenueMonsterWebhook(
  _payload: unknown,
  _signature: string,
): Promise<boolean> {
  // TODO: Implement webhook signature verification using RM public key
  return false;
}
