import { useCallback } from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  Mail,
  FileText,
  UserCheck,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import {
  Screen,
  Header,
  Button,
  StatusBadge,
  PriceDisplay,
  Avatar,
  Section,
  Separator,
  Spacer,
  LoadingScreen,
  ErrorScreen,
  useTheme,
} from "@timeo/ui";
import {
  formatDate,
  formatTime,
  formatRelativeTime,
} from "@timeo/shared";
export default function BookingDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id as any;

  const booking = useQuery(api.bookings.getById, { bookingId });
  const events = useQuery(api.bookingEvents.listByBooking, { bookingId });

  const confirmBooking = useMutation(api.bookings.confirm);
  const cancelBooking = useMutation(api.bookings.cancel);
  const completeBooking = useMutation(api.bookings.complete);
  const markNoShow = useMutation(api.bookings.markNoShow);

  const handleConfirm = useCallback(async () => {
    try {
      await confirmBooking({ bookingId });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to confirm booking"
      );
    }
  }, [confirmBooking, bookingId]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking({ bookingId });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to cancel booking"
              );
            }
          },
        },
      ]
    );
  }, [cancelBooking, bookingId]);

  const handleComplete = useCallback(async () => {
    try {
      await completeBooking({ bookingId });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to complete booking"
      );
    }
  }, [completeBooking, bookingId]);

  const handleNoShow = useCallback(() => {
    Alert.alert(
      "Mark as No-Show",
      "Are you sure you want to mark this booking as a no-show?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, No-Show",
          style: "destructive",
          onPress: async () => {
            try {
              await markNoShow({ bookingId });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to mark as no-show"
              );
            }
          },
        },
      ]
    );
  }, [markNoShow, bookingId]);

  if (booking === undefined) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (booking === null) {
    return (
      <ErrorScreen
        title="Booking not found"
        message="This booking may have been deleted."
        onRetry={() => router.back()}
      />
    );
  }

  const durationMinutes = Math.round(
    (booking.endTime - booking.startTime) / (60 * 1000)
  );

  return (
    <Screen padded={false}>
      <Header title="Booking Details" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Status and Service */}
        <View className="items-center pb-4 pt-2">
          <StatusBadge status={booking.status} />
          <Text
            className="mt-3 text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {booking.serviceName}
          </Text>
          {booking.servicePrice != null && (
            <View className="mt-1">
              <PriceDisplay
                amount={booking.servicePrice}
                size="lg"
              />
            </View>
          )}
        </View>

        <Separator />

        {/* Customer Info */}
        <Section title="Customer">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-center">
              <Avatar fallback={booking.customerName} size="md" />
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {booking.customerName}
                </Text>
                {booking.customerEmail && (
                  <View className="mt-1 flex-row items-center">
                    <Mail size={13} color={theme.colors.textSecondary} />
                    <Text
                      className="ml-1.5 text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {booking.customerEmail}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Section>

        {/* Booking Details */}
        <Section title="Details">
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View style={{ gap: 12 }}>
              <View className="flex-row items-center">
                <Calendar size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-3 flex-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Date
                </Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatDate(booking.startTime)}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-3 flex-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Time
                </Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatTime(booking.startTime)} -{" "}
                  {formatTime(booking.endTime)}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-3 flex-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Duration
                </Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {durationMinutes} min
                </Text>
              </View>

              {booking.staffName && (
                <View className="flex-row items-center">
                  <UserCheck
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    className="ml-3 flex-1 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Staff
                  </Text>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {booking.staffName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Section>

        {/* Notes */}
        {booking.notes && (
          <Section title="Notes">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-start">
                <FileText
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text
                  className="ml-3 flex-1 text-sm leading-5"
                  style={{ color: theme.colors.text }}
                >
                  {booking.notes}
                </Text>
              </View>
            </View>
          </Section>
        )}

        {/* Event History Timeline */}
        {events && events.length > 0 && (
          <Section title="History">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {events.map((event, index) => (
                <View key={event._id}>
                  <View className="flex-row">
                    {/* Timeline dot and line */}
                    <View className="mr-3 items-center" style={{ width: 20 }}>
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            index === 0
                              ? theme.colors.primary
                              : theme.colors.border,
                        }}
                      />
                      {index < events.length - 1 && (
                        <View
                          className="w-0.5 flex-1"
                          style={{
                            backgroundColor: theme.colors.border,
                            minHeight: 30,
                          }}
                        />
                      )}
                    </View>
                    {/* Event content */}
                    <View className="flex-1 pb-4">
                      <Text
                        className="text-sm font-medium capitalize"
                        style={{ color: theme.colors.text }}
                      >
                        {event.type.replace(/_/g, " ")}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        by {event.actorName} --{" "}
                        {formatRelativeTime(event.timestamp)}
                      </Text>
                      {event.metadata?.reason && (
                        <Text
                          className="mt-1 text-xs italic"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          Reason: {event.metadata.reason}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Spacer size={16} />

        {/* Action Buttons */}
        <View style={{ gap: 10 }}>
          {booking.status === "pending" && (
            <Button onPress={handleConfirm}>Confirm Booking</Button>
          )}
          {booking.status === "confirmed" && (
            <>
              <Button onPress={handleComplete}>Mark as Completed</Button>
              <Button variant="outline" onPress={handleNoShow}>
                Mark as No-Show
              </Button>
            </>
          )}
          {(booking.status === "pending" ||
            booking.status === "confirmed") && (
            <Button variant="destructive" onPress={handleCancel}>
              Cancel Booking
            </Button>
          )}
        </View>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
