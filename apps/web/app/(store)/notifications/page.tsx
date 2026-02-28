"use client";

import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
} from "@timeo/ui/web";
import {
  Bell,
  CalendarCheck,
  CalendarX,
  Clock,
  Package,
  UserPlus,
  CreditCard,
  Info,
  CheckCheck,
} from "lucide-react";

const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  booking_confirmed: { icon: CalendarCheck, label: "Booking", color: "text-green-600" },
  booking_cancelled: { icon: CalendarX, label: "Cancelled", color: "text-red-600" },
  booking_reminder: { icon: Clock, label: "Reminder", color: "text-amber-600" },
  order_update: { icon: Package, label: "Order", color: "text-blue-600" },
  staff_invitation: { icon: UserPlus, label: "Invitation", color: "text-purple-600" },
  payment_received: { icon: CreditCard, label: "Payment", color: "text-green-600" },
  system: { icon: Info, label: "System", color: "text-gray-600" },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsPage() {
  const { activeTenantId } = useTimeoWebAuthContext();

  const { data: notifications, isLoading } = useNotifications(activeTenantId ?? "");
  const { mutateAsync: markAsRead } = useMarkNotificationRead(activeTenantId ?? "");
  const { mutateAsync: markAllAsRead } = useMarkAllNotificationsRead(activeTenantId ?? "");

  const unreadCount = notifications?.filter((n: any) => !n.read).length ?? 0;

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead(notificationId);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead(undefined);
  }, [markAllAsRead]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {!isLoading && unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        {!isLoading && unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll notify you when something happens.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: any) => {
                const config =
                  typeConfig[notification.type] ?? typeConfig.system;
                const Icon = config.icon;

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50 ${
                      !notification.read ? "bg-accent/30" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        notification.read ? "bg-muted" : "bg-primary/10"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${notification.read ? "text-muted-foreground" : config.color}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${notification.read ? "font-medium" : "font-semibold"}`}
                        >
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
