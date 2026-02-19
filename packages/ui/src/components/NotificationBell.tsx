import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";
import { useTheme } from "../theme";

export interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
  size?: number;
  className?: string;
}

export function NotificationBell({
  unreadCount,
  onPress,
  size = 22,
  className,
}: NotificationBellProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-full ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
      accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      accessibilityRole="button"
    >
      <Bell size={size} color={theme.colors.text} />
      {unreadCount > 0 && (
        <View
          className="absolute -right-0.5 -top-0.5 min-w-[18px] items-center justify-center rounded-full px-1"
          style={{ backgroundColor: theme.colors.error }}
        >
          <Text className="text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
