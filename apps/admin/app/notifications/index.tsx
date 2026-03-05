import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";

export default function NotificationsPage() {
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: rawNotifications } = useNotifications(tenantId);
  const { mutateAsync: markAsRead } = useMarkNotificationRead(tenantId ?? "");
  const { mutateAsync: markAllAsRead } = useMarkAllNotificationsRead(tenantId ?? "");

  // Map api-client Notification shape to the shape NotificationsScreen expects
  const notifications = useMemo(
    () =>
      rawNotifications?.map((n) => ({
        _id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.isRead,
        createdAt: new Date(n.createdAt).getTime(),
        data: n.data,
      })),
    [rawNotifications]
  );

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead(notificationId);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <NotificationsScreen
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onBack={() => router.back()}
    />
  );
}
