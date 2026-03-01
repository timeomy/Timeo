import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  User,
  FileText,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Button,
  PriceDisplay,
  StatusBadge,
  LoadingScreen,
  ErrorScreen,
  Card,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { useBooking, useCancelBooking } from "@timeo/api-client";

function formatBookingDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBookingTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();

  const [isCancelling, setIsCancelling] = useState(false);

  const { data: booking, isLoading } = useBooking(activeTenantId, id);
  const cancelBooking = useCancelBooking(activeTenantId ?? "");

  const handleCancel = useCallback(() => {
    if (!booking) return;

    Alert.alert(
      "Cancel Booking",
      `Are you sure you want to cancel your booking for "${booking.serviceName}"?`,
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);
              await cancelBooking.mutateAsync({
                bookingId: booking.id,
                reason: "Cancelled by customer",
              });
              Alert.alert("Booking Cancelled", "Your booking has been cancelled.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "Unable to cancel booking. Please try again."
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [booking, cancelBooking]);

  if (isLoading) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (!booking) {
    return (
      <ErrorScreen
        title="Booking not found"
        message="This booking may have been removed."
        onRetry={() => router.back()}
      />
    );
  }

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <Screen padded={false}>
      <Header title="Booking Details" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: canCancel ? 120 : 40 }}
      >
        {/* Status Header */}
        <View className="mt-2 flex-row items-center justify-between">
          <Text
            className="text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {booking.serviceName}
          </Text>
          <StatusBadge status={booking.status} />
        </View>

        {booking.staffName ? (
          <View className="mt-2 flex-row items-center">
            <User size={14} color={theme.colors.textSecondary} />
            <Text
              className="ml-1.5 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              with {booking.staffName}
            </Text>
          </View>
        ) : null}

        <Spacer size={16} />

        {/* Date & Time Card */}
        <Card>
          <Text
            className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Appointment
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center">
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Calendar size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatBookingDate(booking.startTime)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Clock size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatBookingTime(booking.startTime)} - {formatBookingTime(booking.endTime)}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {booking.serviceDuration} minutes
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Spacer size={12} />

        {/* Price Card */}
        {booking.servicePrice != null ? (
          <>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Price
                </Text>
                <PriceDisplay amount={booking.servicePrice} size="lg" />
              </View>
            </Card>
            <Spacer size={12} />
          </>
        ) : null}

        {/* Notes */}
        {booking.notes ? (
          <>
            <Card>
              <View className="flex-row items-center">
                <FileText size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-2 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Notes
                </Text>
              </View>
              <Text
                className="mt-2 text-base leading-6"
                style={{ color: theme.colors.text }}
              >
                {booking.notes}
              </Text>
            </Card>
            <Spacer size={12} />
          </>
        ) : null}
      </ScrollView>

      {/* Cancel Button */}
      {canCancel ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-4"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <Button
            variant="destructive"
            size="lg"
            loading={isCancelling}
            onPress={handleCancel}
            style={{ width: "100%" }}
          >
            Cancel Booking
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}
