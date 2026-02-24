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
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
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
  const tenantId = activeTenantId as any;

  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const bookings = useQuery(
    api.bookings.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const confirmBooking = useMutation(api.bookings.confirm);
  const cancelBooking = useMutation(api.bookings.cancel);
  const completeBooking = useMutation(api.bookings.complete);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    let filtered = bookings;

    // Filter by status tab
    const statusFilter = TAB_TO_STATUS[activeTab];
    if (statusFilter) {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.serviceName.toLowerCase().includes(query) ||
          b.customerName.toLowerCase().includes(query) ||
          (b.staffName && b.staffName.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [bookings, activeTab, searchQuery]);

  const handleConfirm = useCallback(
    async (bookingId: any) => {
      try {
        await confirmBooking({ bookingId });
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to confirm booking"
        );
      }
    },
    [confirmBooking]
  );

  const handleCancel = useCallback(
    (bookingId: any) => {
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
    },
    [cancelBooking]
  );

  const handleComplete = useCallback(
    async (bookingId: any) => {
      try {
        await completeBooking({ bookingId });
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to complete booking"
        );
      }
    },
    [completeBooking]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to view bookings."
        />
      </Screen>
    );
  }

  if (bookings === undefined) {
    return <LoadingScreen message="Loading bookings..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Bookings" />

      {/* Search */}
      <View className="px-4 pb-2">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search bookings..."
        />
      </View>

      {/* Status Tabs */}
      <View className="px-4 pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isActive = item === activeTab;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.surface,
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

      {/* Booking List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No bookings found"
            description={
              activeTab === "All"
                ? "There are no bookings yet."
                : `No ${activeTab.toLowerCase()} bookings.`
            }
            icon={<CalendarDays size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <View>
            <BookingCard
              serviceName={item.serviceName}
              staffName={item.staffName}
              status={item.status}
              startTime={item.startTime}
              duration={Math.round(
                (item.endTime - item.startTime) / (60 * 1000)
              )}
              onPress={() => router.push(`/bookings/${item._id}`)}
            />
            {/* Action buttons below the card */}
            {(item.status === "pending" || item.status === "confirmed") && (
              <View
                className="mt-1 flex-row px-1"
                style={{ gap: 8 }}
              >
                {item.status === "pending" && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onPress={() => handleConfirm(item._id as any)}
                  >
                    Confirm
                  </Button>
                )}
                {item.status === "confirmed" && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onPress={() => handleComplete(item._id as any)}
                  >
                    Complete
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={() => handleCancel(item._id as any)}
                >
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
