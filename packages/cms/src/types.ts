/**
 * CMS block and page types for use in frontend renderers.
 * These are intentionally decoupled from Payload's generated types
 * so the web app can import them without depending on Payload directly.
 */

export interface HeroBlockData {
  blockType: "hero";
  heading: string;
  subheading?: string;
  image?: { url: string; alt: string } | null;
  ctaLabel?: string;
  ctaLink?: string;
  style?: "centered" | "left" | "split";
}

export interface FeatureItem {
  icon?: string;
  title: string;
  description?: string;
}

export interface FeaturesBlockData {
  blockType: "features";
  heading?: string;
  description?: string;
  columns?: "2" | "3" | "4";
  features: FeatureItem[];
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  avatar?: { url: string; alt: string } | null;
  rating?: number;
}

export interface TestimonialsBlockData {
  blockType: "testimonials";
  heading?: string;
  testimonials: TestimonialItem[];
}

export interface PricingPlan {
  name: string;
  price: string;
  description?: string;
  features?: { feature: string }[];
  ctaLabel?: string;
  ctaLink?: string;
  highlighted?: boolean;
}

export interface PricingBlockData {
  blockType: "pricing";
  heading?: string;
  description?: string;
  plans: PricingPlan[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQBlockData {
  blockType: "faq";
  heading?: string;
  items: FAQItem[];
}

export interface ContactBlockData {
  blockType: "contact";
  heading?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  showForm?: boolean;
  mapEmbedUrl?: string;
}

export interface GalleryImage {
  image: { url: string; alt: string };
  caption?: string;
}

export interface GalleryBlockData {
  blockType: "gallery";
  heading?: string;
  layout?: "grid" | "masonry" | "carousel";
  columns?: "2" | "3" | "4";
  images: GalleryImage[];
}

export type CMSBlock =
  | HeroBlockData
  | FeaturesBlockData
  | TestimonialsBlockData
  | PricingBlockData
  | FAQBlockData
  | ContactBlockData
  | GalleryBlockData;

export interface PageData {
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
  blocks: CMSBlock[];
  createdAt: string;
  updatedAt: string;
}
