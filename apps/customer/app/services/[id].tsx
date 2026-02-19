import React, { useState, useCallback } from "react";
import { View, Text, Image, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Clock, DollarSign, FileText, CheckCircle } from "lucide-react-native";
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
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";
import { formatDate, formatTime } from "@timeo/shared";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();

  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const service = useQuery(
    api.services.getById,
    id ? { serviceId: id as any } : "skip"
  );

  const createBooking = useMutation(api.bookings.create);

  const handleBook = useCallback(async () => {
    if (!service || !activeTenantId) return;

    // Default to booking 1 hour from now (rounded to next 30 min)
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    const startTime = Math.ceil((now + 60 * 60 * 1000) / thirtyMin) * thirtyMin;

    Alert.alert(
      "Confirm Booking",
      `Book "${service.name}" for ${formatDate(startTime)} at ${formatTime(startTime)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book",
          onPress: async () => {
            try {
              setIsBooking(true);
              await createBooking({
                tenantId: activeTenantId as any,
                serviceId: service._id as any,
                startTime,
              });
              setBookingSuccess(true);
              setTimeout(() => {
                setBookingSuccess(false);
                router.push("/(tabs)/bookings");
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
  }, [service, activeTenantId, createBooking, router]);

  if (service === undefined) {
    return <LoadingScreen message="Loading service..." />;
  }

  if (service === null) {
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
        {/* Hero Image Placeholder */}
        <View
          className="mx-4 h-48 items-center justify-center rounded-2xl"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <FileText size={48} color={theme.colors.textSecondary} />
          <Text
            className="mt-2 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {service.name}
          </Text>
        </View>

        <View className="px-4">
          {/* Service Details */}
          <View className="mt-5">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {service.name}
            </Text>

            <View className="mt-3 flex-row items-center gap-4">
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

          <Separator className="my-4" />

          {/* Description */}
          <Card>
            <Text
              className="mb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              About this service
            </Text>
            <Text
              className="text-base leading-6"
              style={{ color: theme.colors.text }}
            >
              {service.description}
            </Text>
          </Card>

          <Spacer size={16} />

          {/* Additional Info */}
          <Card>
            <Text
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Details
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Duration
                </Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {service.durationMinutes} minutes
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Price
                </Text>
                <PriceDisplay
                  amount={service.price}
                  currency={service.currency}
                  size="sm"
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Status
                </Text>
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.success }}
                >
                  Available
                </Text>
              </View>
            </View>
          </Card>
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
          <View className="flex-row items-center justify-center rounded-xl py-3"
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
                Total
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
