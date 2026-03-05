import { useCallback } from "react";
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
  const notifications = rawNotifications?.map((n) => ({
    ...n,
    _id: n.id,
    read: n.isRead,
    createdAt: new Date(n.createdAt).getTime(),
  }));
  const { mutateAsync: markAsRead } = useMarkNotificationRead(tenantId ?? "");
  const { mutateAsync: markAllAsRead } = useMarkAllNotificationsRead(tenantId ?? "");

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
