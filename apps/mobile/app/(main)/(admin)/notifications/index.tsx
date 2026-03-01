import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: notifications } = useNotifications(tenantId);
  const markAsRead = useMarkNotificationRead(tenantId);
  const markAllAsRead = useMarkAllNotificationsRead(tenantId);

  const mappedNotifications = useMemo(
    () =>
      notifications?.map((n) => ({
        _id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.isRead,
        createdAt: new Date(n.createdAt).getTime(),
        data: n.data,
      })),
    [notifications],
  );

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead.mutate(notificationId);
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  return (
    <NotificationsScreen
      notifications={mappedNotifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onBack={() => router.back()}
    />
  );
}
