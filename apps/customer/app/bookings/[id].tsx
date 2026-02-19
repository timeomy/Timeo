import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  CircleDot,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Button,
  PriceDisplay,
  StatusBadge,
  DateTimeDisplay,
  LoadingScreen,
  ErrorScreen,
  Card,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";
import { formatDate, formatTime, formatRelativeTime } from "@timeo/shared";

// ─── Event Timeline Icon ───────────────────────────────────────────────
function EventIcon({
  type,
  color,
}: {
  type: string;
  color: string;
}) {
  const size = 16;
  switch (type) {
    case "created":
      return <CircleDot size={size} color={color} />;
    case "confirmed":
      return <CheckCircle size={size} color={color} />;
    case "cancelled":
      return <XCircle size={size} color={color} />;
    case "completed":
      return <CheckCircle size={size} color={color} />;
    case "no_show":
      return <AlertCircle size={size} color={color} />;
    default:
      return <CircleDot size={size} color={color} />;
  }
}

function getEventColor(type: string, theme: any): string {
  switch (type) {
    case "created":
      return theme.colors.info;
    case "confirmed":
      return theme.colors.success;
    case "cancelled":
      return theme.colors.error;
    case "completed":
      return theme.colors.success;
    case "no_show":
      return theme.colors.warning;
    default:
      return theme.colors.textSecondary;
  }
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [isCancelling, setIsCancelling] = useState(false);

  const booking = useQuery(
    api.bookings.getById,
    id ? { bookingId: id as any } : "skip"
  );

  const events = useQuery(
    api.bookingEvents.listByBooking,
    id ? { bookingId: id as any } : "skip"
  );

  const cancelBooking = useMutation(api.bookings.cancel);

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
              await cancelBooking({
                bookingId: booking._id as any,
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

  if (booking === undefined) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (booking === null) {
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
                  {formatDate(booking.startTime)}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  <DateTimeDisplay timestamp={booking.startTime} format="relative" />
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
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
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

        {/* Event Timeline */}
        <Card>
          <Text
            className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Timeline
          </Text>
          {events === undefined ? (
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Loading timeline...
            </Text>
          ) : events.length === 0 ? (
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              No events recorded.
            </Text>
          ) : (
            <View className="gap-4">
              {events.map((event, index) => {
                const eventColor = getEventColor(event.type, theme);
                const isLast = index === events.length - 1;

                return (
                  <View key={event._id} className="flex-row">
                    {/* Timeline Indicator */}
                    <View className="mr-3 items-center">
                      <View
                        className="rounded-full p-1"
                        style={{ backgroundColor: eventColor + "20" }}
                      >
                        <EventIcon type={event.type} color={eventColor} />
                      </View>
                      {!isLast ? (
                        <View
                          className="mt-1 w-px flex-1"
                          style={{ backgroundColor: theme.colors.border, minHeight: 20 }}
                        />
                      ) : null}
                    </View>

                    {/* Event Content */}
                    <View className="flex-1 pb-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {formatEventType(event.type)}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {event.actorName} -- {formatRelativeTime(event.timestamp)}
                      </Text>
                      {event.metadata?.reason ? (
                        <Text
                          className="mt-1 text-xs italic"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          Reason: {event.metadata.reason}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
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
            className="w-full"
          >
            Cancel Booking
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}
