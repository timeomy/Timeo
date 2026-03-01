import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useBookings,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  BookingCard,
  Button,
  SearchInput,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";
import { BookingStatus } from "@timeo/shared";

const STATUS_TABS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_TO_STATUS: Record<StatusTab, string | null> = {
  All: null,
  Pending: BookingStatus.PENDING,
  Confirmed: BookingStatus.CONFIRMED,
  Completed: BookingStatus.COMPLETED,
  Cancelled: BookingStatus.CANCELLED,
};

export default function BookingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings, isLoading, refetch, isRefetching } = useBookings(tenantId);
  const confirmBooking = useConfirmBooking(tenantId ?? "");
  const cancelBooking = useCancelBooking(tenantId ?? "");
  const completeBooking = useCompleteBooking(tenantId ?? "");

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    let filtered = bookings;
    const statusFilter = TAB_TO_STATUS[activeTab];
    if (statusFilter) {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.serviceName.toLowerCase().includes(query) ||
          b.customerName?.toLowerCase().includes(query) ||
          (b.staffName && b.staffName.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [bookings, activeTab, searchQuery]);

  const handleConfirm = useCallback(
    async (bookingId: string) => {
      try {
        await confirmBooking.mutateAsync({ bookingId });
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to confirm booking");
      }
    },
    [confirmBooking]
  );

  const handleCancel = useCallback(
    (bookingId: string) => {
      Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking.mutateAsync({ bookingId });
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to cancel booking");
            }
          },
        },
      ]);
    },
    [cancelBooking]
  );

  const handleComplete = useCallback(
    async (bookingId: string) => {
      try {
        await completeBooking.mutateAsync({ bookingId });
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to complete booking");
      }
    },
    [completeBooking]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization to view bookings." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading bookings..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Bookings" />

      <View className="px-4 pb-2">
        <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search bookings..." />
      </View>

      <View className="px-4 pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS as unknown as StatusTab[]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isActive = item === activeTab;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isActive ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.textSecondary,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No bookings found"
            description={activeTab === "All" ? "There are no bookings yet." : `No ${activeTab.toLowerCase()} bookings.`}
            icon={<CalendarDays size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View>
            <BookingCard
              serviceName={item.serviceName}
              staffName={item.staffName}
              status={item.status}
              startTime={new Date(item.startTime).getTime()}
              duration={Math.round(
                (new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) / (60 * 1000)
              )}
              onPress={() => router.push(`/bookings/${item.id}`)}
            />
            {(item.status === "pending" || item.status === "confirmed") && (
              <View className="mt-1 flex-row px-1" style={{ gap: 8 }}>
                {item.status === "pending" && (
                  <Button size="sm" onPress={() => handleConfirm(item.id)}>
                    Confirm
                  </Button>
                )}
                {item.status === "confirmed" && (
                  <Button size="sm" onPress={() => handleComplete(item.id)}>
                    Complete
                  </Button>
                )}
                <Button variant="destructive" size="sm" onPress={() => handleCancel(item.id)}>
                  Cancel
                </Button>
              </View>
            )}
          </View>
        )}
      />
    </Screen>
  );
}
