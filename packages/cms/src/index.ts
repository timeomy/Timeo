// Collections
export { Pages } from "./collections/Pages";
export { Media } from "./collections/Media";
export { Navigation } from "./collections/Navigation";
export { TenantSettings } from "./collections/TenantSettings";

// Blocks
export {
  HeroBlock,
  FeaturesBlock,
  TestimonialsBlock,
  PricingBlock,
  FAQBlock,
  ContactBlock,
  GalleryBlock,
} from "./blocks";

// Access control
export {
  isTenantAdmin,
  isTenantMember,
  isPublishedOrTenantAdmin,
  canManageTenantContent,
} from "./access/tenantAccess";

// Config
export { default as payloadConfig } from "./payload.config";

// Types — re-export Payload CMS block types for use in renderers
export type {
  HeroBlockData,
  FeaturesBlockData,
  TestimonialsBlockData,
  PricingBlockData,
  FAQBlockData,
  ContactBlockData,
  GalleryBlockData,
  PageData,
  CMSBlock,
} from "./types";
