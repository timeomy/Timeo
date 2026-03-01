import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Clock, DollarSign, CheckCircle, User } from "lucide-react-native";
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
import { useService, useCreateBooking, api } from "@timeo/api-client";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatTime } from "@timeo/shared";

interface AvailableSlot {
  startTime: number;
  endTime: number;
  staffId: string;
  staffName: string;
}

function getNext14Days(): number[] {
  const days: number[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(12, 0, 0, 0);
    days.push(d.getTime());
  }
  return days;
}

function formatSlotTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();

  const [selectedDate, setSelectedDate] = useState<number>(getNext14Days()[0]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { data: service, isLoading } = useService(activeTenantId, id);

  const { data: availableSlots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["availableSlots", activeTenantId, service?.id, selectedDate],
    queryFn: () =>
      api.get<AvailableSlot[]>(
        `/api/tenants/${activeTenantId}/scheduling/available-slots?serviceId=${service!.id}&date=${selectedDate}`
      ),
    enabled: !!activeTenantId && !!service?.id,
  });

  const createBooking = useCreateBooking(activeTenantId ?? "");

  const dates = useMemo(() => getNext14Days(), []);

  const groupedSlots = useMemo(() => {
    if (!availableSlots) return [];
    const map = new Map<number, AvailableSlot[]>();
    for (const slot of availableSlots) {
      const existing = map.get(slot.startTime);
      if (existing) {
        existing.push(slot);
      } else {
        map.set(slot.startTime, [slot]);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([time, slots]) => ({ time, slots }));
  }, [availableSlots]);

  const handleBook = useCallback(async () => {
    if (!selectedSlot || !service || !activeTenantId) return;

    Alert.alert(
      "Confirm Booking",
      `Book "${service.name}" on ${formatDate(selectedSlot.startTime)} at ${formatTime(selectedSlot.startTime)} with ${selectedSlot.staffName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book",
          onPress: async () => {
            try {
              setIsBooking(true);
              await createBooking.mutateAsync({
                serviceId: service.id,
                startTime: new Date(selectedSlot.startTime).toISOString(),
                staffId: selectedSlot.staffId,
              });
              setBookingSuccess(true);
              setTimeout(() => {
                setBookingSuccess(false);
                router.push("/(main)/(customer)/(tabs)/bookings");
              }, 1500);
            } catch (error: any) {
              Alert.alert(
                "Booking Failed",
                error?.message ?? "Unable to create booking. Please try again."
              );
            } finally {
              setIsBooking(false);
            }
          },
        },
      ]
    );
  }, [selectedSlot, service, activeTenantId, createBooking, router]);

  const handleDateSelect = useCallback((date: number) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  if (isLoading) {
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
              const isSelected =
                new Date(date).toDateString() ===
                new Date(selectedDate).toDateString();
              const d = new Date(date);
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
                      color: isSelected ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.textSecondary,
                    }}
                  >
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </Text>
                  <Text
                    className="mt-1 text-lg font-bold"
                    style={{
                      color: isSelected ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.text,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{
                      color: isSelected ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.textSecondary,
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

          {isLoadingSlots ? (
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
          ) : groupedSlots.length === 0 ? (
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
              {groupedSlots.map(({ time, slots }) => {
                const slot = slots[0];
                const isSelected =
                  selectedSlot?.startTime === slot.startTime &&
                  selectedSlot?.staffId === slot.staffId;
                return (
                  <TouchableOpacity
                    key={`${time}-${slot.staffId}`}
                    onPress={() => setSelectedSlot(slot)}
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
                        color: isSelected ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.text,
                      }}
                    >
                      {formatSlotTime(slot.startTime)}
                    </Text>
                    {slots.length > 1 ? (
                      <Text
                        className="mt-0.5 text-xs"
                        style={{
                          color: isSelected
                            ? (theme.dark ? "#0B0B0F" : "#FFFFFF")
                            : theme.colors.textSecondary,
                        }}
                      >
                        {slots.length} staff
                      </Text>
                    ) : (
                      <Text
                        className="mt-0.5 text-xs"
                        style={{
                          color: isSelected
                            ? (theme.dark ? "#0B0B0F" : "#FFFFFF")
                            : theme.colors.textSecondary,
                        }}
                      >
                        {slot.staffName}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Staff selection if multiple for same time */}
        {selectedSlot && groupedSlots.length > 0 && (() => {
          const group = groupedSlots.find(
            (g) => g.time === selectedSlot.startTime
          );
          if (!group || group.slots.length <= 1) return null;
          return (
            <>
              <Spacer size={16} />
              <View className="px-4">
                <Text
                  className="mb-2 text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Select Staff
                </Text>
                <View className="gap-2">
                  {group.slots.map((slot) => {
                    const isStaffSelected =
                      selectedSlot.staffId === slot.staffId;
                    return (
                      <TouchableOpacity
                        key={slot.staffId}
                        onPress={() => setSelectedSlot(slot)}
                        className="flex-row items-center rounded-xl px-4 py-3"
                        style={{
                          backgroundColor: isStaffSelected
                            ? theme.colors.primary + "15"
                            : theme.colors.surface,
                          borderWidth: 1,
                          borderColor: isStaffSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <User
                          size={16}
                          color={
                            isStaffSelected
                              ? theme.colors.primary
                              : theme.colors.textSecondary
                          }
                        />
                        <Text
                          className="ml-2 text-sm font-medium"
                          style={{
                            color: isStaffSelected
                              ? theme.colors.primary
                              : theme.colors.text,
                          }}
                        >
                          {slot.staffName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          );
        })()}
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
                  ? `${formatSlotTime(selectedSlot.startTime)} · ${selectedSlot.staffName}`
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
              style={{ minWidth: 140 }}
            >
              Book Now
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}
