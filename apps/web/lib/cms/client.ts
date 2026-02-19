/**
 * Payload CMS REST API client for fetching tenant-scoped content.
 */

const PAYLOAD_URL = process.env.NEXT_PUBLIC_PAYLOAD_URL || "http://localhost:3001";

interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

async function payloadFetch<T>(
  collection: string,
  params: Record<string, string> = {},
): Promise<PayloadResponse<T>> {
  const searchParams = new URLSearchParams(params);
  const url = `${PAYLOAD_URL}/api/${collection}?${searchParams.toString()}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  });

  if (!res.ok) {
    throw new Error(`Payload API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function payloadFetchOne<T>(
  collection: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const response = await payloadFetch<T>(collection, { ...params, limit: "1" });
  return response.docs[0] ?? null;
}

// --- Public API ---

export interface CMSPage {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  isHomepage: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { url: string } | null;
  };
  blocks: Array<Record<string, unknown> & { blockType: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSNavigation {
  id: string;
  tenantId: string;
  name: string;
  position: "header" | "footer";
  items: Array<{
    label: string;
    type: "page" | "custom" | "services" | "products" | "bookings";
    page?: { slug: string } | null;
    url?: string;
    openInNewTab?: boolean;
  }>;
}

export interface CMSTenantSettings {
  id: string;
  tenantId: string;
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  seo?: {
    siteTitle?: string;
    siteDescription?: string;
    favicon?: { url: string } | null;
    ogImage?: { url: string } | null;
  };
  customDomain?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
  };
}

/**
 * Get a published CMS page by tenant slug and page slug.
 */
export async function getCMSPage(
  tenantId: string,
  pageSlug: string,
): Promise<CMSPage | null> {
  return payloadFetchOne<CMSPage>("pages", {
    "where[tenantId][equals]": tenantId,
    "where[slug][equals]": pageSlug,
    "where[status][equals]": "published",
    depth: "2",
  });
}

/**
 * Get the homepage for a tenant.
 */
export async function getCMSHomepage(
  tenantId: string,
): Promise<CMSPage | null> {
  return payloadFetchOne<CMSPage>("pages", {
    "where[tenantId][equals]": tenantId,
    "where[isHomepage][equals]": "true",
    "where[status][equals]": "published",
    depth: "2",
  });
}

/**
 * Get all published pages for a tenant (for sitemap/navigation).
 */
export async function getCMSPages(tenantId: string): Promise<CMSPage[]> {
  const response = await payloadFetch<CMSPage>("pages", {
    "where[tenantId][equals]": tenantId,
    "where[status][equals]": "published",
    limit: "100",
    sort: "title",
  });
  return response.docs;
}

/**
 * Get navigation menus for a tenant.
 */
export async function getCMSNavigation(
  tenantId: string,
  position?: "header" | "footer",
): Promise<CMSNavigation[]> {
  const params: Record<string, string> = {
    "where[tenantId][equals]": tenantId,
    depth: "2",
  };
  if (position) {
    params["where[position][equals]"] = position;
  }
  const response = await payloadFetch<CMSNavigation>("navigation", params);
  return response.docs;
}

/**
 * Get CMS settings for a tenant.
 */
export async function getCMSTenantSettings(
  tenantId: string,
): Promise<CMSTenantSettings | null> {
  return payloadFetchOne<CMSTenantSettings>("tenant-settings", {
    "where[tenantId][equals]": tenantId,
  });
}
