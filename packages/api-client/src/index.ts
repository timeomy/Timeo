/**
 * @timeo/api-client
 *
 * TanStack Query hooks + Socket.io client for the Timeo Hono API.
 * Replaces all Convex useQuery/useMutation hooks across web and mobile apps.
 *
 * Migration pattern:
 *
 * BEFORE (Convex):
 *   const bookings = useQuery(api.bookings.listByTenant, tenantId ? { tenantId } : "skip");
 *   if (bookings === undefined) return <LoadingScreen />;
 *   const confirmBooking = useMutation(api.bookings.confirm);
 *   await confirmBooking({ bookingId });
 *
 * AFTER (TanStack Query):
 *   const { data: bookings, isLoading } = useBookings(tenantId);
 *   if (isLoading) return <LoadingScreen />;
 *   const { mutateAsync: confirmBooking } = useConfirmBooking(tenantId);
 *   await confirmBooking(bookingId);
 */

// Client
export { api, ApiError } from "./client.js";

// Query keys
export { queryKeys } from "./query-keys.js";

// All hooks
export * from "./hooks/index.js";

// Socket
export {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinTenantRoom,
  joinUserRoom,
} from "./socket/socket-client.js";
export { useSocket } from "./socket/use-socket.js";
export {
  useRealtimeInvalidation,
  useTenantRealtime,
} from "./socket/use-realtime-invalidation.js";
export { SocketEvents } from "./socket/events.js";
export type { SocketEvent } from "./socket/events.js";
