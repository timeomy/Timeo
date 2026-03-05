import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";

export default function NotificationsPage() {
  const router = useRouter();

  const { data: rawNotifications } = useNotifications(null);
  const { mutate: markRead } = useMarkNotificationRead("");
  const { mutate: markAllRead } = useMarkAllNotificationsRead("");

  const notifications = useMemo(() => {
    if (!rawNotifications) return undefined;
    return rawNotifications.map((n) => ({
      _id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.isRead,
      createdAt: new Date(n.createdAt).getTime(),
      data: n.data,
    }));
  }, [rawNotifications]);

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markRead(notificationId);
    },
    [markRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <NotificationsScreen
      notifications={notifications}
      hasMore={false}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onBack={() => router.back()}
    />
  );
}
