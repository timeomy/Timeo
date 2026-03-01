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
import { useTimeoAuth } from "@timeo/auth";
import {
  useBooking,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking,
  useMarkNoShow,
} from "@timeo/api-client";
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
  useTheme,
} from "@timeo/ui";

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: booking, isLoading } = useBooking(tenantId, id);

  const confirmBooking = useConfirmBooking(tenantId ?? "");
  const cancelBooking = useCancelBooking(tenantId ?? "");
  const completeBooking = useCompleteBooking(tenantId ?? "");
  const markNoShow = useMarkNoShow(tenantId ?? "");

  const handleConfirm = useCallback(async () => {
    if (!id) return;
    try {
      await confirmBooking.mutateAsync({ bookingId: id });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to confirm booking",
      );
    }
  }, [confirmBooking, id]);

  const handleCancel = useCallback(() => {
    if (!id) return;
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
              await cancelBooking.mutateAsync({ bookingId: id });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to cancel booking",
              );
            }
          },
        },
      ],
    );
  }, [cancelBooking, id]);

  const handleComplete = useCallback(async () => {
    if (!id) return;
    try {
      await completeBooking.mutateAsync({ bookingId: id });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to complete booking",
      );
    }
  }, [completeBooking, id]);

  const handleNoShow = useCallback(() => {
    if (!id) return;
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
              await markNoShow.mutateAsync({ bookingId: id });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to mark as no-show",
              );
            }
          },
        },
      ],
    );
  }, [markNoShow, id]);

  if (isLoading) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (!booking) {
    return (
      <Screen>
        <Header title="Booking Details" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            Booking not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const startMs = new Date(booking.startTime).getTime();
  const endMs = new Date(booking.endTime).getTime();
  const durationMinutes = Math.round((endMs - startMs) / (60 * 1000));

  return (
    <Screen padded={false}>
      <Header title="Booking Details" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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
              <PriceDisplay amount={booking.servicePrice} size="lg" />
            </View>
          )}
        </View>

        <Separator />

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
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
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
                  <UserCheck size={16} color={theme.colors.textSecondary} />
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

        {booking.notes && (
          <Section title="Notes">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-start">
                <FileText size={16} color={theme.colors.textSecondary} />
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

        <Spacer size={16} />

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
          {(booking.status === "pending" || booking.status === "confirmed") && (
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
