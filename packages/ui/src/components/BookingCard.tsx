import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Calendar, Clock, MapPin } from "lucide-react-native";
import { useTheme } from "../theme";
import { StatusBadge } from "./StatusBadge";
import { DateTimeDisplay } from "./DateTimeDisplay";
import { PriceDisplay } from "./PriceDisplay";

export interface BookingCardProps {
  serviceName: string;
  staffName?: string;
  status: string;
  startTime: number; // unix ms
  duration: number; // minutes
  price?: number; // cents
  currency?: string;
  location?: string;
  onPress?: () => void;
  showActions?: boolean;
  onCancel?: () => void;
  onReschedule?: () => void;
  className?: string;
}

export function BookingCard({
  serviceName,
  staffName,
  status,
  startTime,
  duration,
  price,
  currency,
  location,
  onPress,
  showActions,
  onCancel,
  onReschedule,
  className,
}: BookingCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`rounded-2xl p-4 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            {serviceName}
          </Text>
          {staffName ? (
            <Text
              className="mt-0.5 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              with {staffName}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={status} />
      </View>

      <View className="mt-3 gap-1.5">
        <View className="flex-row items-center">
          <Calendar size={14} color={theme.colors.textSecondary} />
          <DateTimeDisplay timestamp={startTime} format="absolute" className="ml-1.5" />
        </View>
        <View className="flex-row items-center">
          <Clock size={14} color={theme.colors.textSecondary} />
          <Text
            className="ml-1.5 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {duration} min
          </Text>
        </View>
        {location ? (
          <View className="flex-row items-center">
            <MapPin size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-1.5 text-sm"
              style={{ color: theme.colors.textSecondary }}
              numberOfLines={1}
            >
              {location}
            </Text>
          </View>
        ) : null}
      </View>

      {price != null ? (
        <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderColor: theme.colors.border }}>
          <PriceDisplay amount={price} currency={currency} />
        </View>
      ) : null}

      {showActions && (status === "pending" || status === "confirmed") ? (
        <View className="mt-3 flex-row gap-2 border-t pt-3" style={{ borderColor: theme.colors.border }}>
          {onReschedule ? (
            <TouchableOpacity
              onPress={onReschedule}
              className="flex-1 items-center rounded-xl border py-2"
              style={{ borderColor: theme.colors.border }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: theme.colors.text }}
              >
                Reschedule
              </Text>
            </TouchableOpacity>
          ) : null}
          {onCancel ? (
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 items-center rounded-xl border py-2"
              style={{ borderColor: theme.colors.error }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: theme.colors.error }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
