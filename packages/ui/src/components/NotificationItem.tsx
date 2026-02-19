import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Package,
  UserPlus,
  CreditCard,
  Info,
} from "lucide-react-native";
import { useTheme } from "../theme";

export interface NotificationItemProps {
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  onPress?: () => void;
  className?: string;
}

const typeConfig: Record<
  string,
  { icon: typeof CalendarCheck; color: string }
> = {
  booking_confirmed: { icon: CalendarCheck, color: "#059669" },
  booking_cancelled: { icon: CalendarX, color: "#DC2626" },
  booking_reminder: { icon: Clock, color: "#D97706" },
  order_update: { icon: Package, color: "#2563EB" },
  staff_invitation: { icon: UserPlus, color: "#7C3AED" },
  payment_received: { icon: CreditCard, color: "#059669" },
  system: { icon: Info, color: "#64748B" },
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

export function NotificationItem({
  type,
  title,
  body,
  read,
  createdAt,
  onPress,
  className,
}: NotificationItemProps) {
  const theme = useTheme();
  const config = typeConfig[type] ?? typeConfig.system;
  const Icon = config.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-start px-4 py-3 ${className ?? ""}`}
      style={{
        backgroundColor: read ? theme.colors.background : theme.colors.surface,
      }}
    >
      <View
        className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: config.color + "15" }}
      >
        <Icon size={18} color={config.color} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm ${read ? "font-medium" : "font-bold"}`}
            style={{ color: theme.colors.text }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!read && (
            <View
              className="ml-2 h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
        </View>
        <Text
          className="mt-0.5 text-sm"
          style={{ color: theme.colors.textSecondary }}
          numberOfLines={2}
        >
          {body}
        </Text>
        <Text
          className="mt-1 text-xs"
          style={{ color: theme.colors.textSecondary }}
        >
          {formatTimeAgo(createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
