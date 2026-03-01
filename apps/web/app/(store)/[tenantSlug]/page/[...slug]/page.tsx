import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "../../../../../lib/cms/block-renderer";
import { getCMSPage } from "../../../../../lib/cms/client";

interface PageProps {
  params: { tenantSlug: string; slug: string[] };
}

/**
 * Resolves a tenant ID from slug for CMS queries.
 * Payload CMS stores tenantId as the slug for portability.
 */
async function resolveTenantId(tenantSlug: string): Promise<string> {
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
