import { Novu } from "@novu/node";

let novuInstance: Novu | null = null;

/**
 * Get or create the Novu client singleton.
 * Reads NOVU_API_KEY from environment variables.
 */
export function getNovu(): Novu {
  if (novuInstance) return novuInstance;

  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[Novu] NOVU_API_KEY environment variable is not configured"
    );
  }

  novuInstance = new Novu(apiKey);
  return novuInstance;
}

/**
 * Check if Novu is configured (NOVU_API_KEY is set).
 * Use this to gracefully fall back when Novu is not available.
 */
export function isNovuConfigured(): boolean {
  return !!process.env.NOVU_API_KEY;
}
