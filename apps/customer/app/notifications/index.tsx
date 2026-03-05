import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";

export default function NotificationsPage() {
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();

  const { data: rawNotifications } = useNotifications(activeTenantId);
  const { mutate: markAsRead } = useMarkNotificationRead(activeTenantId ?? "");
  const { mutate: markAllAsRead } = useMarkAllNotificationsRead(
    activeTenantId ?? ""
  );

  // Map API shape to the UI component's expected shape
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
