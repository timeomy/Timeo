import React, { useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Bell, CheckCheck } from "lucide-react-native";
import { useTheme } from "../theme";
import { Header } from "../components/Header";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { NotificationItem } from "../components/NotificationItem";
import { Separator } from "../components/Separator";
import { LoadingScreen } from "../components/LoadingScreen";

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  data?: any;
}

export interface NotificationsScreenProps {
  notifications: Notification[] | undefined;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationPress?: (notification: Notification) => void;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function NotificationsScreen({
  notifications,
  hasMore,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationPress,
  onBack,
  onRefresh,
  isRefreshing,
}: NotificationsScreenProps) {
  const theme = useTheme();

  const handlePress = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        onMarkAsRead(notification._id);
      }
      onNotificationPress?.(notification);
    },
    [onMarkAsRead, onNotificationPress]
  );

  if (notifications === undefined) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Screen>
      <Header
        title="Notifications"
        onBack={onBack}
        rightActions={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={onMarkAllAsRead}
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: theme.colors.primary + "15" }}
            >
              <CheckCheck size={14} color={theme.colors.primary} />
              <Text
                className="ml-1 text-xs font-semibold"
                style={{ color: theme.colors.primary }}
              >
                Read all
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItem
            type={item.type}
            title={item.title}
            body={item.body}
            read={item.read}
            createdAt={item.createdAt}
            onPress={() => handlePress(item)}
          />
        )}
        ItemSeparatorComponent={() => <Separator />}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing ?? false}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="No notifications"
            description="You're all caught up! We'll notify you when something happens."
            icon={
              <Bell size={32} color={theme.colors.textSecondary} />
            }
          />
        }
        contentContainerStyle={
          notifications.length === 0 ? { flex: 1 } : undefined
        }
      />
    </Screen>
  );
}
