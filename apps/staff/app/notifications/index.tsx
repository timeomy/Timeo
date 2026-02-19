import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { NotificationsScreen } from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

export default function NotificationsPage() {
  const router = useRouter();

  const result = useQuery(api.notifications.listByUser, { limit: 50 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead({ notificationId: notificationId as any });
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead({});
  }, [markAllAsRead]);

  return (
    <NotificationsScreen
      notifications={result?.notifications}
      hasMore={result?.hasMore}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onBack={() => router.back()}
    />
  );
}
