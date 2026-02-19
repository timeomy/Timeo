import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "../../../../../lib/cms/block-renderer";
import { getCMSPage } from "../../../../../lib/cms/client";

interface PageProps {
  params: { tenantSlug: string; slug: string[] };
}

/**
 * Resolves a Convex tenant ID from slug for CMS queries.
 * In production, this would call the Convex API. For now, we use the slug
 * directly as the tenantId filter since Payload stores it that way.
 */
async function resolveTenantId(tenantSlug: string): Promise<string> {
  // The CMS stores tenantId as the Convex tenant slug for portability.
  // In production, you'd resolve this via the Convex `getBySlug` query.
  return tenantSlug;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tenantId = await resolveTenantId(params.tenantSlug);
  const pageSlug = params.slug.join("/");
  const page = await getCMSPage(tenantId, pageSlug);

  if (!page) return { title: "Page Not Found" };

  return {
    title: page.seo?.metaTitle || page.title,
    description: page.seo?.metaDescription,
    openGraph: page.seo?.ogImage
      ? { images: [{ url: page.seo.ogImage.url }] }
      : undefined,
  };
}

export default async function CMSPage({ params }: PageProps) {
  const tenantId = await resolveTenantId(params.tenantSlug);
  const pageSlug = params.slug.join("/");
  const page = await getCMSPage(tenantId, pageSlug);

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <BlockRenderer blocks={page.blocks as Parameters<typeof BlockRenderer>[0]["blocks"]} />
    </div>
  );
}

/**
 * Generate static paths for known published pages (ISR).
 */
export async function generateStaticParams() {
  // In production, fetch all tenants and their published pages.
  // For now, return empty to rely on ISR at request time.
  return [];
}
