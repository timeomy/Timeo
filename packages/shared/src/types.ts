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
  authId: string;
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
  imageUrl?: string;
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

// Scheduling types
export interface StaffAvailability extends ConvexDocument {
  staffId: string;
  tenantId: string;
  dayOfWeek: number; // 0-6, 0=Sunday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isAvailable: boolean;
}

export interface BusinessHours extends ConvexDocument {
  tenantId: string;
  dayOfWeek: number; // 0-6, 0=Sunday
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isOpen: boolean;
}

export interface BlockedSlot extends ConvexDocument {
  tenantId: string;
  staffId?: string;
  startTime: number; // unix ms
  endTime: number; // unix ms
  reason: string;
  createdBy: string;
  createdAt: number;
}

export type FileType =
  | "product_image"
  | "service_image"
  | "avatar"
  | "logo"
  | "document";

export interface FileRecord extends ConvexDocument {
  tenantId?: string;
  uploadedBy: string;
  storageId: string;
  filename: string;
  mimeType: string;
  size: number;
  type: FileType;
  entityId?: string;
  createdAt: number;
}

export interface TimeSlot {
  startTime: number; // unix ms
  endTime: number; // unix ms
  staffId: string;
  staffName: string;
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

// ─── Analytics Types ──────────────────────────────────────────────────────────

export type AnalyticsPeriod = "day" | "week" | "month" | "year";

export interface RevenueOverview {
  totalRevenue: number;
  bookingRevenue: number;
  orderRevenue: number;
  percentChange: number;
  revenueByDay: Array<{ date: string; amount: number }>;
}

export interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  completionRate: number;
  averageBookingsPerDay: number;
  bookingsByStatus: Record<string, number>;
  bookingsByDay: Array<{ date: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
}

export interface OrderAnalytics {
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByDay: Array<{ date: string; count: number; revenue: number }>;
}

export interface TopService {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
  percentOfTotal: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  percentOfTotal: number;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    totalSpent: number;
    bookingCount: number;
  }>;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  bookingsHandled: number;
  completionRate: number;
  revenue: number;
}

export interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalBookings: number;
  totalOrders: number;
  totalRevenue: number;
  tenantsByPlan: Record<string, number>;
  growthMetrics: {
    newTenantsThisMonth: number;
    newTenantsLastMonth: number;
    tenantGrowthPercent: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    userGrowthPercent: number;
  };
}

export interface TenantRanking {
  tenantId: string;
  tenantName: string;
  value: number;
}
