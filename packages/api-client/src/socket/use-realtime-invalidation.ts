import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./socket-client";
import { queryKeys } from "../query-keys";

export function useRealtimeInvalidation(
  event: string,
  keys: readonly unknown[],
  enabled = true,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: [...keys] });
    };

    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event, JSON.stringify(keys), enabled, queryClient]);
}

/**
 * Sets up all real-time invalidations for a tenant's data.
 * Call once at the layout level when a tenant is active.
 */
export function useTenantRealtime(tenantId: string) {
  useRealtimeInvalidation("booking:created", queryKeys.bookings.all(tenantId));
  useRealtimeInvalidation("booking:updated", queryKeys.bookings.all(tenantId));
  useRealtimeInvalidation("order:created", queryKeys.orders.all(tenantId));
  useRealtimeInvalidation("order:updated", queryKeys.orders.all(tenantId));
  useRealtimeInvalidation(
    "pos:transaction_created",
    queryKeys.pos.all(tenantId),
  );
  useRealtimeInvalidation("checkin:created", queryKeys.checkIns.all(tenantId));
  useRealtimeInvalidation(
    "notification:new",
    queryKeys.notifications.all(tenantId),
  );
}
