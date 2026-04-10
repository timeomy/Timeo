export {
  useCurrentUser,
  useSignIn,
  useSignUp,
  useSignOut,
} from "./auth";

export { useUserProfile, useChangePassword, useUpdateUserProfile } from "./users";

export {
  useMyTenants,
  useTenant,
  useTenantBySlug,
  useCreateTenant,
  useUpdateTenantSettings,
  useUpdateTenantBranding,
  useTenantFeatureFlags,
  useInviteStaff,
  usePublicTenants,
  useJoinTenant,
} from "./tenants";

export {
  useBookings,
  useMyBookings,
  useBooking,
  useCreateBooking,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking,
  useMarkNoShow,
  useAvailableSlots,
  useBookingEvents,
} from "./bookings";
export type { BookingEvent } from "./bookings";

export {
  useServices,
  useService,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "./services";

export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useAdjustStock,
  useLowStockProducts,
} from "./products";

export {
  useOrders,
  useOrder,
  useCreateOrder,
  useUpdateOrderStatus,
} from "./orders";

export {
  usePayments,
  usePayment,
  useCreateStripePayment,
  useCreateRevenueMonsterPayment,
} from "./payments";

export {
  usePosTransactions,
  usePosTransaction,
  useCreatePosTransaction,
  useVoidPosTransaction,
  useDeletePosTransaction,
  useCreateDuitNowQR,
  useDailySummary,
  useMonthlyStatement,
  useValidateVoucher,
} from "./pos";

export {
  useCheckIns,
  useCheckInStats,
  useCreateCheckIn,
  useCheckInByQr,
  useMyCheckInHistory,
} from "./check-ins";

export {
  useSessionPackages,
  useSessionCredits,
  useSessionLogs,
  useCreateSessionPackage,
  useUpdateSessionPackage,
  useDeleteSessionPackage,
  usePurchaseSessionPackage,
  useAssignSessionPackage,
  useAdjustSessionCredits,
  useCreateSessionLog,
  useDeleteSessionLog,
} from "./sessions";

export {
  useCoachClients,
  useCoachSchedule,
  useClassAttendance,
  useMarkAttendance,
} from "./coach";

export {
  useMemberships,
  useMembership,
  useMyMembershipSubscriptions,
  useMySubscriptions,
  useTenantSubscriptions,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
  useSubscribeToMembership,
} from "./memberships";
export type { MembershipSubscription } from "./memberships";

export {
  useVouchers,
  useVoucher,
  useCreateVoucher,
  useUpdateVoucher,
  useDeleteVoucher,
  useToggleVoucher,
  useRedeemVoucher,
} from "./vouchers";

export {
  useGiftCards,
  useGiftCard,
  useGiftCardByCode,
  useCreateGiftCard,
  useRedeemGiftCard,
  useTopupGiftCard,
  useCancelGiftCard,
  useReactivateGiftCard,
  useDeleteGiftCard,
} from "./gift-cards";

export {
  useStaffAvailability,
  useUpdateStaffAvailability,
  useBusinessHours,
  useUpdateBusinessHours,
  useBlockedSlots,
  useCreateBlockedSlot,
  useDeleteBlockedSlot,
} from "./scheduling";

export {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "./notifications";

export {
  useRevenueOverview,
  useBookingAnalytics,
  useOrderAnalytics,
  useTopServices,
  useTopProducts,
  useCustomerAnalytics,
  useStaffPerformance,
  useRevenueTrend,
  useBookingTrend,
} from "./analytics";

export { useDownloadReport } from "./exports";

export type {
  PlatformTenant,
  TenantMember,
  PlatformUser,
  PlatformUserDetail,
  Plan,
  FeatureFlag,
  PlatformConfig,
  AuditLogEntry,
  AuditLogResponse,
  Announcement,
  EmailTemplate,
  ApiKey,
  ApiKeyCreateResponse,
  HealthStatus,
  AnalyticsOverview,
  TenantGrowthPoint,
  PlatformStats,
  PlatformLogEntry,
} from "./platform";

export {
  // Module 1: Tenants
  usePlatformTenants,
  usePlatformTenant,
  usePlatformTenantMembers,
  useAddPlatformTenantMember,
  useUpdatePlatformTenantMemberRole,
  useRemovePlatformTenantMember,
  useCreatePlatformTenant,
  useSuspendPlatformTenant,
  useActivatePlatformTenant,
  useDeletePlatformTenant,
  useImpersonateTenant,
  // Module 2: Users
  usePlatformUsers,
  usePlatformUser,
  useDeactivatePlatformUser,
  useActivatePlatformUser,
  useForceLogoutPlatformUser,
  useChangePlatformUserRole,
  useResetPlatformUserPassword,
  // Module 3: Plans
  usePlatformPlans,
  useCreatePlatformPlan,
  useUpdatePlatformPlan,
  useDeletePlatformPlan,
  // Module 4: Feature Flags
  usePlatformFlags,
  useCreatePlatformFlag,
  useUpdatePlatformFlag,
  useSetFlagOverride,
  useRemoveFlagOverride,
  // Module 5: Config
  usePlatformConfig,
  usePlatformConfigSection,
  useUpdatePlatformConfig,
  // Module 6: Audit Log
  usePlatformAuditLog,
  // Module 7: Announcements
  usePlatformAnnouncements,
  useCreatePlatformAnnouncement,
  useUpdatePlatformAnnouncement,
  useDeletePlatformAnnouncement,
  // Module 8: Email Templates
  usePlatformEmailTemplates,
  useUpsertPlatformEmailTemplate,
  // Module 9: API Keys
  usePlatformApiKeys,
  useCreatePlatformApiKey,
  useRevokePlatformApiKey,
  // Module 10: Health
  usePlatformHealth,
  // Module 11: Analytics
  usePlatformAnalyticsOverview,
  usePlatformTenantGrowth,
  // Module 12: Data
  useSeedFeatureFlags,
  // Additional
  useUpdatePlatformTenant,
  usePlatformStats,
  usePlatformLogs,
} from "./platform";

export type {
  FeatureFlagSource,
  UiConfigScope,
  PlatformTemplateSummary,
  PlatformTemplateVersion,
  PlatformTemplateDetail,
  TenantTemplateAssignment,
  PlatformTenantTemplateResponse,
  TenantUiConfigResponse,
  TenantUiResetResponse,
  EffectiveFeatureFlag,
  EffectiveFeatureFlagsResponse,
  TemplateMigrationReport,
} from "./templates";

export {
  usePlatformTemplates,
  useCreatePlatformTemplate,
  usePlatformTemplate,
  useTemplateVersions,
  useCreateTemplateVersion,
  usePublishTemplateVersion,
  usePlatformTenantTemplate,
  useAssignTemplate,
  useTemplateMigrationPreview,
  useTemplateMigrationExecute,
  useTenantUiConfig,
  useUpdateTenantUiConfig,
  useResetTenantUiConfig,
  useEffectiveFeatureFlags,
  useUpdateTenantFeatureFlagOverride,
} from "./templates";

export {
  useFiles,
  useUploadFile,
  useDeleteFile,
} from "./files";

export {
  useEInvoiceRequests,
  useEInvoiceLookup,
  useEInvoiceProfile,
  useSaveEInvoiceProfile,
  useCreateEInvoiceRequest,
  useSubmitEInvoice,
  useMarkEInvoiceSubmitted,
  useMarkEInvoiceRejected,
  useRevertEInvoiceToPending,
} from "./einvoice";
export type { EInvoiceRequest, EInvoiceProfile, EInvoiceLookupResponse } from "./einvoice";

export {
  useStaffMembers,
  useUpdateStaffRole,
  useRemoveStaffMember,
} from "./staff";

export {
  useMemberQrCode,
  useGenerateQrCode,
  useFaceEnrollmentStatus,
  useSubmitFacePhoto,
} from "./qr-code";

export {
  useCustomers,
  useCustomer,
  useUpdateCustomer,
} from "./customers";

export {
  useLoyaltyBalance,
  useLoyaltyHistory,
  useEarnPoints,
  useRedeemPoints,
} from "./loyalty";

export {
  useMyPaymentRequests,
  useCreatePaymentRequest,
  useUploadPaymentReceipt,
  usePaymentRequests,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  useSendPaymentReminder,
  useRequestPaymentReceipt,
} from "./payment-requests";
export type { PaymentRequest, PaymentRequestStatus, PaymentRequestPlanType } from "./payment-requests";

export {
  useInvoices,
  useMyInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useEmailInvoice,
} from "./invoices";
export type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  CreateInvoicePayload,
} from "./invoices";

export {
  useFeedBroadcasts,
  useDiscoverFeed,
  useTenantBroadcasts,
  useAdminBroadcasts,
  useCreateBroadcast,
  useToggleBroadcast,
  useDeleteBroadcast,
  useServiceCatalog,
} from "./feed";
export type { Broadcast, ServiceCatalogItem, DiscoverFeed } from "./feed";

export {
  useGymMembers,
  useMemberDetail,
  useCoaches,
  useUpdateMember,
} from "./gym";
export type {
  GymMember,
  CoachOption,
  MemberDetail,
  UpdateMemberPayload,
} from "./gym";

export {
  useMissionControl,
} from "./mission-control";
export type {
  MissionControlData,
  MissionControlMetrics,
  MissionControlCheckIn,
  HeatmapCell,
} from "./mission-control";

// ─── Stub exports for incomplete features ────────────────────────────────────
// TODO: Implement these features properly
export const useMyTrainingLogs = (tenantId: string) => ({ data: [] as any[], isLoading: false });
export const useMyCoach = (tenantId: string) => ({ data: null as any, isLoading: false });
