import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Clock, DollarSign, CheckCircle } from "lucide-react-native";
import {
  Screen,
  Header,
  Button,
  PriceDisplay,
  LoadingScreen,
  ErrorScreen,
  Card,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { useTrackEvent } from "@timeo/analytics";
import { useService, useAvailableSlots, useCreateBooking } from "@timeo/api-client";
import { formatDate, formatTime } from "@timeo/shared";

function getNext14Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
  }
  return days;
}

function formatSlotTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();

  const dates = useMemo(() => getNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { data: service, isLoading: serviceLoading } = useService(activeTenantId, id);
  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    activeTenantId,
    id,
    selectedDate
  );
  const { mutateAsync: createBooking } = useCreateBooking(activeTenantId ?? "");
  const track = useTrackEvent();

  const slots = slotsData?.slots ?? [];

  // Track service view
  useEffect(() => {
    if (service && activeTenantId) {
      track("service_viewed", {
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        currency: service.currency,
        duration_minutes: service.durationMinutes,
        tenant_id: activeTenantId,
      });
    }
  }, [service?.id, activeTenantId]);

  const handleBook = useCallback(async () => {
    if (!selectedSlot || !service || !activeTenantId) return;

    Alert.alert(
      "Confirm Booking",
      `Book "${service.name}" on ${formatDate(new Date(selectedSlot).getTime())} at ${formatTime(new Date(selectedSlot).getTime())}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book",
          onPress: async () => {
            try {
              setIsBooking(true);
              const bookingResult = await createBooking({
                serviceId: service.id,
                startTime: selectedSlot,
              });
              track("booking_created", {
                booking_id: bookingResult.bookingId,
                service_id: service.id,
                service_name: service.name,
                price: service.price,
                currency: service.currency,
                tenant_id: activeTenantId,
              });
              setBookingSuccess(true);
              setTimeout(() => {
                setBookingSuccess(false);
                router.push("/(tabs)/bookings");
              }, 1500);
            } catch (error: unknown) {
              Alert.alert(
                "Booking Failed",
                error instanceof Error
                  ? error.message
                  : "Unable to create booking. Please try again."
              );
            } finally {
              setIsBooking(false);
            }
          },
        },
      ]
    );
  }, [selectedSlot, service, activeTenantId, createBooking, router, track]);

  // Reset selected slot when date changes
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  if (serviceLoading) {
    return <LoadingScreen message="Loading service..." />;
  }

  if (!service) {
    return (
      <ErrorScreen
        title="Service not found"
        message="This service may have been removed or is no longer available."
        onRetry={() => router.back()}
      />
    );
  }

  return (
    <Screen padded={false}>
      <Header title={service.name} onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Service Info */}
        <View className="px-4">
          <View className="mt-2">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {service.name}
            </Text>
            <View className="mt-2 flex-row items-center gap-4">
              <View className="flex-row items-center">
                <Clock size={16} color={theme.colors.primary} />
                <Text
                  className="ml-1.5 text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {service.durationMinutes} min
                </Text>
              </View>
              <View className="flex-row items-center">
                <DollarSign size={16} color={theme.colors.primary} />
                <PriceDisplay
                  amount={service.price}
                  currency={service.currency}
                  size="sm"
                />
              </View>
            </View>
          </View>

          {service.description ? (
            <>
              <Spacer size={12} />
              <Text
                className="text-sm leading-5"
                style={{ color: theme.colors.textSecondary }}
              >
                {service.description}
              </Text>
            </>
          ) : null}
        </View>

        <Separator className="my-4" />

        {/* Date Picker */}
        <View className="px-4">
          <Text
            className="mb-3 text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Select Date
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {dates.map((date) => {
              const isSelected = date === selectedDate;
              const d = new Date(date + "T12:00:00");
              return (
                <TouchableOpacity
                  key={date}
                  onPress={() => handleDateSelect(date)}
                  className="items-center rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surface,
                    minWidth: 72,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color: isSelected
                        ? theme.dark
                          ? "#0B0B0F"
                          : "#FFFFFF"
                        : theme.colors.textSecondary,
                    }}
                  >
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </Text>
                  <Text
                    className="mt-1 text-lg font-bold"
                    style={{
                      color: isSelected
                        ? theme.dark
                          ? "#0B0B0F"
                          : "#FFFFFF"
                        : theme.colors.text,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{
                      color: isSelected
                        ? theme.dark
                          ? "#0B0B0F"
                          : "#FFFFFF"
                        : theme.colors.textSecondary,
                    }}
                  >
                    {d.toLocaleDateString("en-US", { month: "short" })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Spacer size={20} />

        {/* Available Slots */}
        <View className="px-4">
          <Text
            className="mb-3 text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Available Times
          </Text>

          {slotsLoading ? (
            <Card>
              <View className="items-center py-6">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Loading available slots...
                </Text>
              </View>
            </Card>
          ) : slots.length === 0 ? (
            <Card>
              <View className="items-center py-6">
                <Clock size={32} color={theme.colors.textSecondary} />
                <Spacer size={8} />
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  No slots available
                </Text>
                <Text
                  className="mt-1 text-center text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Try selecting a different date
                </Text>
              </View>
            </Card>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.startTime;
                return (
                  <TouchableOpacity
                    key={slot.startTime}
                    onPress={() => setSelectedSlot(slot.startTime)}
                    className="items-center rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                      minWidth: 90,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: isSelected
                          ? theme.dark
                            ? "#0B0B0F"
                            : "#FFFFFF"
                          : theme.colors.text,
                      }}
                    >
                      {formatSlotTime(slot.startTime)}
                    </Text>
                    {slot.availableStaffCount > 1 ? (
                      <Text
                        className="mt-0.5 text-xs"
                        style={{
                          color: isSelected
                            ? theme.dark
                              ? "#0B0B0F"
                              : "#FFFFFF"
                            : theme.colors.textSecondary,
                        }}
                      >
                        {slot.availableStaffCount} staff
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Book Button */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-4"
        style={{
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
        }}
      >
        {bookingSuccess ? (
          <View
            className="flex-row items-center justify-center rounded-xl py-3"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle size={20} color={theme.colors.success} />
            <Text
              className="ml-2 text-base font-semibold"
              style={{ color: theme.colors.success }}
            >
              Booking Created!
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {selectedSlot
                  ? formatSlotTime(selectedSlot)
                  : "Select a time slot"}
              </Text>
              <PriceDisplay
                amount={service.price}
                currency={service.currency}
                size="lg"
              />
            </View>
            <Button
              size="lg"
              loading={isBooking}
              onPress={handleBook}
              disabled={!selectedSlot}
              className="min-w-[140px]"
            >
              Book Now
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}
