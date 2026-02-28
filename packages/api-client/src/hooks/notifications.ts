import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client.js";
import { queryKeys } from "../query-keys.js";

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export function useNotifications(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.all(tenantId ?? ""),
    queryFn: () =>
      api.get<Notification[]>(`/api/tenants/${tenantId}/notifications`),
    enabled: !!tenantId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(
        `/api/tenants/${tenantId}/notifications/${notificationId}/read`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(tenantId),
      }),
  });
}

export function useMarkAllNotificationsRead(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch(`/api/tenants/${tenantId}/notifications/read-all`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(tenantId),
      }),
  });
}
