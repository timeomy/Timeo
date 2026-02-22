import React, { useState, useCallback, useMemo } from "react";
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
  Row,
  Separator,
  Badge,
  Modal,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";
// Uses local formatHourMinute instead of shared formatTime for schedule display

const DAY_MS = 24 * 60 * 60 * 1000;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sunday
  d.setDate(d.getDate() - day); // go to Sunday
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

function formatHourMinute(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
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

  // Calculate week range
  const weekRange = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    return { start: weekStart.getTime(), end: weekEnd.getTime() };
  }, [weekOffset]);

  // Get the Convex user to find internal userId
  const convexUser = useQuery(api.users.getCurrent);

  const staffSchedule = useQuery(
    api.scheduling.getStaffSchedule,
    convexUser && tenantId
      ? {
          tenantId: tenantId as any,
          staffId: convexUser._id as any,
          startDate: weekRange.start,
          endDate: weekRange.end,
        }
      : "skip"
  );

  const createBlockedSlot = useMutation(api.scheduling.createBlockedSlot);
  const deleteBlockedSlot = useMutation(api.scheduling.deleteBlockedSlot);

  // Group events by day
  const dayEvents = useMemo(() => {
    if (!staffSchedule) return [];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = weekRange.start + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const dayDate = new Date(dayStart);

      const bookings = staffSchedule.bookings.filter(
        (b: any) => b.startTime >= dayStart && b.startTime < dayEnd
      );
      const blocked = staffSchedule.blockedSlots.filter(
        (bs: any) => bs.startTime >= dayStart && bs.startTime < dayEnd
      );

      days.push({
        date: dayStart,
        dayName: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: dayDate.getDate(),
        month: dayDate.toLocaleDateString("en-US", { month: "short" }),
        bookings,
        blockedSlots: blocked,
        isToday: dayDate.toDateString() === new Date().toDateString(),
      });
    }
    return days;
  }, [staffSchedule, weekRange]);

  const handleCreateBlock = useCallback(async () => {
    if (!tenantId || !convexUser || !blockDate || !blockStartTime || !blockEndTime) {
      setToast({
        message: "Please fill in all fields",
        type: "error",
        visible: true,
      });
      return;
    }

    setBlocking(true);
    try {
      const startMs = new Date(`${blockDate}T${blockStartTime}`).getTime();
      const endMs = new Date(`${blockDate}T${blockEndTime}`).getTime();

      if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
        throw new Error("Invalid date/time range");
      }

      await createBlockedSlot({
        tenantId: tenantId as any,
        staffId: convexUser._id as any,
        startTime: startMs,
        endTime: endMs,
        reason: blockReason || "Blocked",
      });

      setShowBlockModal(false);
      setBlockDate("");
      setBlockStartTime("");
      setBlockEndTime("");
      setBlockReason("");
      setToast({
        message: "Time blocked successfully",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to block time";
      setToast({ message, type: "error", visible: true });
    } finally {
      setBlocking(false);
    }
  }, [tenantId, convexUser, blockDate, blockStartTime, blockEndTime, blockReason, createBlockedSlot]);

  const handleDeleteBlock = useCallback(
    (slotId: string, reason: string) => {
      Alert.alert("Remove Block", `Remove "${reason}" block?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBlockedSlot({ blockedSlotId: slotId as any });
              setToast({
                message: "Block removed",
                type: "success",
                visible: true,
              });
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Failed to remove block";
              setToast({ message, type: "error", visible: true });
            }
          },
        },
      ]);
    },
    [deleteBlockedSlot]
  );

  if (!tenantId || convexUser === undefined) {
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
        {/* Week Navigation */}
        <View className="px-4">
          <Row justify="between" align="center" className="mb-4">
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
          </Row>

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

        {/* Block Time Button */}
        <View className="mb-4 px-4">
          <Button
            variant="outline"
            onPress={() => setShowBlockModal(true)}
          >
            <Row align="center" gap={8}>
              <Ban size={16} color={theme.colors.primary} />
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.primary }}
              >
                Block Time
              </Text>
            </Row>
          </Button>
        </View>

        <Separator />

        {/* Daily Schedule */}
        {staffSchedule === undefined ? (
          <View className="items-center py-8">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Loading schedule...
            </Text>
          </View>
        ) : (
          <View className="px-4 pt-3">
            {dayEvents.map((day) => (
              <View key={day.date} className="mb-4">
                <Row align="center" gap={8} className="mb-2">
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: day.isToday
                        ? theme.colors.primary
                        : theme.colors.surface,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: day.isToday ? "#FFFFFF" : theme.colors.text,
                      }}
                    >
                      {day.dayNum}
                    </Text>
                  </View>
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: day.isToday
                        ? theme.colors.primary
                        : theme.colors.text,
                    }}
                  >
                    {day.dayName} {day.month}
                  </Text>
                  {day.bookings.length === 0 && day.blockedSlots.length === 0 && (
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      No events
                    </Text>
                  )}
                </Row>

                {/* Bookings */}
                {day.bookings.map((booking: any) => (
                  <Card key={booking._id} className="mb-1.5 ml-10">
                    <Row justify="between" align="center">
                      <View className="flex-1">
                        <Text
                          className="text-sm font-medium"
                          style={{ color: theme.colors.text }}
                        >
                          {booking.serviceName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatHourMinute(booking.startTime)} –{" "}
                          {formatHourMinute(booking.endTime)} ·{" "}
                          {booking.customerName}
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
                    </Row>
                  </Card>
                ))}

                {/* Blocked Slots */}
                {day.blockedSlots.map((bs: any) => (
                  <Card key={bs._id} className="mb-1.5 ml-10">
                    <Row justify="between" align="center">
                      <View className="flex-1">
                        <Row align="center" gap={4}>
                          <Ban size={12} color={theme.colors.error} />
                          <Text
                            className="text-sm font-medium"
                            style={{ color: theme.colors.error }}
                          >
                            {bs.reason}
                          </Text>
                        </Row>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatHourMinute(bs.startTime)} –{" "}
                          {formatHourMinute(bs.endTime)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteBlock(bs._id, bs.reason)}
                        className="rounded-lg p-2"
                      >
                        <Trash2 size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </Row>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Block Time Modal */}
      <Modal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="Block Time"
      >
        <Input
          label="Date (YYYY-MM-DD)"
          value={blockDate}
          onChangeText={setBlockDate}
          placeholder="2026-02-20"
          className="mb-3"
        />
        <Row gap={8} className="mb-3">
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
        </Row>
        <Input
          label="Reason"
          value={blockReason}
          onChangeText={setBlockReason}
          placeholder="e.g., Personal appointment"
          className="mb-4"
        />
        <Row gap={12}>
          <View className="flex-1">
            <Button
              variant="outline"
              onPress={() => setShowBlockModal(false)}
            >
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleCreateBlock} loading={blocking}>
              Block
            </Button>
          </View>
        </Row>
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
