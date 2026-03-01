import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@timeo/api-client";

export default function StaffNotificationsPage() {
  const router = useRouter();

  const { data: notifications } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

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
      markAsRead.mutate({ notificationId });
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
