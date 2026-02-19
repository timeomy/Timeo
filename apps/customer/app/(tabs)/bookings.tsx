import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import {
  Screen,
  Header,
  BookingCard,
  LoadingScreen,
  EmptyState,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

type TabType = "upcoming" | "past";

export default function BookingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  const bookings = useQuery(
    api.bookings.listByCustomer,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const now = Date.now();

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (b) =>
        b.startTime >= now &&
        (b.status === "pending" || b.status === "confirmed")
    );
  }, [bookings, now]);

  const pastBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (b) =>
        b.startTime < now ||
        b.status === "completed" ||
        b.status === "cancelled" ||
        b.status === "no_show"
    );
  }, [bookings, now]);

  const activeBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (bookings === undefined) {
    return <LoadingScreen message="Loading bookings..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="My Bookings" />

      {/* Tab Selector */}
      <View className="mx-4 mb-3 flex-row rounded-xl p-1"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("upcoming")}
          className="flex-1 items-center rounded-lg py-2.5"
          style={
            activeTab === "upcoming"
              ? { backgroundColor: theme.colors.background }
              : undefined
          }
        >
          <Text
            className="text-sm font-semibold"
            style={{
              color:
                activeTab === "upcoming"
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
            }}
          >
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("past")}
          className="flex-1 items-center rounded-lg py-2.5"
          style={
            activeTab === "past"
              ? { backgroundColor: theme.colors.background }
              : undefined
          }
        >
          <Text
            className="text-sm font-semibold"
            style={{
              color:
                activeTab === "past"
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
            }}
          >
            Past ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeBookings.length === 0 ? (
        <EmptyState
          title={
            activeTab === "upcoming"
              ? "No upcoming bookings"
              : "No past bookings"
          }
          description={
            activeTab === "upcoming"
              ? "Book a service to get started."
              : "Your completed and cancelled bookings will appear here."
          }
          icon={<CalendarDays size={32} color={theme.colors.textSecondary} />}
          action={
            activeTab === "upcoming"
              ? {
                  label: "Browse Services",
                  onPress: () => router.push("/(tabs)/services"),
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={activeBookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <Spacer size={12} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              serviceName={item.serviceName}
              staffName={item.staffName}
              status={item.status}
              startTime={item.startTime}
              duration={item.serviceDuration ?? 0}
              onPress={() => router.push(`/bookings/${item._id}` as any)}
            />
          )}
        />
      )}
    </Screen>
  );
}
