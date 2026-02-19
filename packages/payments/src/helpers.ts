/** Default currency for Timeo (Malaysian Ringgit) */
export const DEFAULT_CURRENCY = "MYR";

/** Stripe minimum charge amount in cents per currency */
export const MINIMUM_AMOUNTS: Record<string, number> = {
  MYR: 200, // RM 2.00
  USD: 50,  // $0.50
  SGD: 50,  // S$0.50
};

/**
 * Malaysian payment methods supported by Stripe.
 * FPX is the most popular online payment method in Malaysia.
 */
export const MY_PAYMENT_METHODS = ["card", "fpx", "grabpay"] as const;

/**
 * Convert a display amount (e.g. 12.50) to Stripe's smallest currency unit (cents).
 * Since Timeo already stores prices in cents, this is mainly for external integrations.
 */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount);
}

/**
 * Convert Stripe's smallest currency unit (cents) back to display amount.
 * Returns the raw cent value since Timeo stores prices in cents.
 */
export function formatAmountFromStripe(amount: number): number {
  return amount;
}

/**
 * Format cents as a human-readable price string.
 * Displays as "RM XX.XX" for MYR.
 */
export function formatPrice(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

/**
 * Validate that an amount meets the minimum charge for the given currency.
 */
export function validateMinimumAmount(
  amountInCents: number,
  currency: string
): { valid: boolean; minimum: number } {
  const min = MINIMUM_AMOUNTS[currency.toUpperCase()] ?? 200;
  return { valid: amountInCents >= min, minimum: min };
}
