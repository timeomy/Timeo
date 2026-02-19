/* eslint-disable @typescript-eslint/no-explicit-any */

// Document types matching Convex schema
// These mirror the Convex Doc<"tableName"> types for use outside Convex

import type {
  BookingStatus,
  OrderStatus,
  TenantPlan,
  TenantStatus,
  MemberRole,
  MembershipStatus,
  MembershipInterval,
} from "./enums";

// Base type for all Convex documents
interface ConvexDocument {
  _id: string;
  _creationTime: number;
}

export interface Tenant extends ConvexDocument {
  name: string;
  slug: string;
  ownerId: string;
  plan: TenantPlan;
  status: TenantStatus;
  settings: TenantSettings;
  branding: TenantBranding;
  createdAt: number;
}

export interface TenantSettings {
  timezone?: string;
  businessHours?: {
    open: string;
    close: string;
  };
  bookingBuffer?: number;
  autoConfirmBookings?: boolean;
}

export interface TenantBranding {
  primaryColor?: string;
  logoUrl?: string;
  businessName?: string;
}

export interface User extends ConvexDocument {
  clerkId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface TenantMembership extends ConvexDocument {
  userId: string;
  tenantId: string;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: number;
}

export interface Service extends ConvexDocument {
  tenantId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Booking extends ConvexDocument {
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId?: string;
  startTime: number;
  endTime: number;
  status: BookingStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookingEvent extends ConvexDocument {
  tenantId: string;
  bookingId: string;
  type:
    | "created"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "no_show"
    | "rescheduled"
    | "note_added";
  actorId: string;
  metadata?: any;
  timestamp: number;
}

export interface Product extends ConvexDocument {
  tenantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Order extends ConvexDocument {
  tenantId: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem extends ConvexDocument {
  orderId: string;
  productId: string;
  quantity: number;
  snapshotPrice: number;
  snapshotName: string;
}

export interface Membership extends ConvexDocument {
  tenantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: MembershipInterval;
  features: string[];
  isActive: boolean;
  createdAt: number;
}

export interface PlatformConfig extends ConvexDocument {
  key: string;
  value: any;
  updatedAt: number;
}

export interface FeatureFlag extends ConvexDocument {
  key: string;
  tenantId?: string;
  enabled: boolean;
  metadata?: any;
}

export interface AuditLog extends ConvexDocument {
  tenantId?: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: any;
  timestamp: number;
}

// DTO types for customer-facing queries
export interface TenantPublicDTO {
  _id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  branding: TenantBranding;
}

export interface UserPublicDTO {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface BookingWithDetails extends Booking {
  customerName: string;
  customerEmail?: string;
  serviceName: string;
  serviceDuration?: number;
  servicePrice?: number;
  staffName?: string;
}

export interface OrderWithDetails extends Order {
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
}

export interface TenantMembershipWithUser extends TenantMembership {
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
}

export interface BookingEventWithActor extends BookingEvent {
  actorName: string;
}

export interface SystemHealth {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  pendingBookings: number;
  pendingOrders: number;
  timestamp: number;
}
