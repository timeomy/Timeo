import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Ban,
  Trash2,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Button,
  Input,
  Badge,
  Modal,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import {
  useBookings,
  useBlockedSlots,
  useCreateBlockedSlot,
  useDeleteBlockedSlot,
} from "@timeo/api-client";

const DAY_MS = 24 * 60 * 60 * 1000;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatHourMinute(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StaffScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [weekOffset, setWeekOffset] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const weekRange = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    return { start: weekStart.getTime(), end: weekEnd.getTime() };
  }, [weekOffset]);

  const { data: allBookings, isLoading: loadingBookings } = useBookings(tenantId);
  const { data: allBlockedSlots, isLoading: loadingSlots } = useBlockedSlots(tenantId);
  const createBlockedSlot = useCreateBlockedSlot(tenantId ?? "");
  const deleteBlockedSlot = useDeleteBlockedSlot(tenantId ?? "");

  const dayEvents = useMemo(() => {
    const staffId = user?.id;
    const bookings = allBookings?.filter((b) => b.staffId === staffId) ?? [];
    const blocked = allBlockedSlots?.filter((bs) => !bs.staffId || bs.staffId === staffId) ?? [];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = weekRange.start + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const dayDate = new Date(dayStart);

      const dayBookings = bookings.filter((b) => {
        const t = new Date(b.startTime).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const dayBlocked = blocked.filter((bs) => {
        const t = new Date(bs.startTime).getTime();
        return t >= dayStart && t < dayEnd;
      });

      days.push({
        date: dayStart,
        dayName: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: dayDate.getDate(),
        month: dayDate.toLocaleDateString("en-US", { month: "short" }),
        bookings: dayBookings,
        blockedSlots: dayBlocked,
        isToday: dayDate.toDateString() === new Date().toDateString(),
      });
    }
    return days;
  }, [allBookings, allBlockedSlots, weekRange, user?.id]);

  const handleCreateBlock = useCallback(async () => {
    if (!tenantId || !blockDate || !blockStartTime || !blockEndTime) {
      setToast({ message: "Please fill in all fields", type: "error", visible: true });
      return;
    }

    setBlocking(true);
    try {
      const startIso = new Date(`${blockDate}T${blockStartTime}`).toISOString();
      const endIso = new Date(`${blockDate}T${blockEndTime}`).toISOString();

      if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
        throw new Error("Invalid date/time range");
      }

      await createBlockedSlot.mutateAsync({
        staffId: user?.id,
        startTime: startIso,
        endTime: endIso,
        reason: blockReason || "Blocked",
      });

      setShowBlockModal(false);
      setBlockDate("");
      setBlockStartTime("");
      setBlockEndTime("");
      setBlockReason("");
      setToast({ message: "Time blocked successfully", type: "success", visible: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to block time";
      setToast({ message, type: "error", visible: true });
    } finally {
      setBlocking(false);
    }
  }, [tenantId, user?.id, blockDate, blockStartTime, blockEndTime, blockReason, createBlockedSlot]);

  const handleDeleteBlock = useCallback(
    (slotId: string, reason: string) => {
      Alert.alert("Remove Block", `Remove "${reason}" block?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBlockedSlot.mutateAsync(slotId);
              setToast({ message: "Block removed", type: "success", visible: true });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to remove block";
              setToast({ message, type: "error", visible: true });
            }
          },
        },
      ]);
    },
    [deleteBlockedSlot],
  );

  if (!tenantId || loadingBookings || loadingSlots) {
    return <LoadingScreen message="Loading schedule..." />;
  }

  const weekLabel = `${formatShortDate(weekRange.start)} — ${formatShortDate(weekRange.end - DAY_MS)}`;

  return (
    <Screen padded={false}>
      <Header title="My Schedule" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-4">
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setWeekOffset((p) => p - 1)}
              className="rounded-lg p-2"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <ChevronLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.colors.text }}
            >
              {weekLabel}
            </Text>
            <TouchableOpacity
              onPress={() => setWeekOffset((p) => p + 1)}
              className="rounded-lg p-2"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <ChevronRight size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {weekOffset !== 0 && (
            <TouchableOpacity
              onPress={() => setWeekOffset(0)}
              className="mb-3 items-center"
            >
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.primary }}
              >
                Go to current week
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="mb-4 px-4">
          <Button variant="outline" onPress={() => setShowBlockModal(true)}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ban size={16} color={theme.colors.primary} />
              <Text className="text-sm font-semibold" style={{ color: theme.colors.primary }}>
                Block Time
              </Text>
            </View>
          </Button>
        </View>

        <View className="px-4 pt-3">
          {dayEvents.map((day) => (
            <View key={day.date} className="mb-4">
              <View className="mb-2 flex-row items-center" style={{ gap: 8 }}>
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: day.isToday ? theme.colors.primary : theme.colors.surface,
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{
                      color: day.isToday ? (theme.dark ? "#0B0B0F" : "#FFFFFF") : theme.colors.text,
                    }}
                  >
                    {day.dayNum}
                  </Text>
                </View>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: day.isToday ? theme.colors.primary : theme.colors.text }}
                >
                  {day.dayName} {day.month}
                </Text>
                {day.bookings.length === 0 && day.blockedSlots.length === 0 && (
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    No events
                  </Text>
                )}
              </View>

              {day.bookings.map((booking) => (
                <View key={booking.id} className="mb-1.5 ml-10">
                  <Card>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                          {booking.serviceName}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {formatHourMinute(booking.startTime)} –{" "}
                          {formatHourMinute(booking.endTime)} · {booking.customerName}
                        </Text>
                      </View>
                      <Badge
                        label={booking.status}
                        variant={
                          booking.status === "confirmed"
                            ? "success"
                            : booking.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      />
                    </View>
                  </Card>
                </View>
              ))}

              {day.blockedSlots.map((bs) => (
                <View key={bs.id} className="mb-1.5 ml-10">
                  <Card>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                          <Ban size={12} color={theme.colors.error} />
                          <Text className="text-sm font-medium" style={{ color: theme.colors.error }}>
                            {bs.reason}
                          </Text>
                        </View>
                        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {formatHourMinute(bs.startTime)} – {formatHourMinute(bs.endTime)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteBlock(bs.id, bs.reason ?? "Block")}
                        className="rounded-lg p-2"
                      >
                        <Trash2 size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="Block Time"
      >
        <View style={{ marginBottom: 12 }}>
          <Input
            label="Date (YYYY-MM-DD)"
            value={blockDate}
            onChangeText={setBlockDate}
            placeholder="2026-03-01"
          />
        </View>
        <View className="flex-row" style={{ gap: 8, marginBottom: 12 }}>
          <View className="flex-1">
            <Input
              label="Start Time"
              value={blockStartTime}
              onChangeText={setBlockStartTime}
              placeholder="09:00"
            />
          </View>
          <View className="flex-1">
            <Input
              label="End Time"
              value={blockEndTime}
              onChangeText={setBlockEndTime}
              placeholder="12:00"
            />
          </View>
        </View>
        <View style={{ marginBottom: 16 }}>
          <Input
            label="Reason"
            value={blockReason}
            onChangeText={setBlockReason}
            placeholder="e.g., Personal appointment"
          />
        </View>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button variant="outline" onPress={() => setShowBlockModal(false)}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleCreateBlock} loading={blocking}>
              Block
            </Button>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
