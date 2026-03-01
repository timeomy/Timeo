import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  useStaffMembers,
  useBookings,
  useUpdateStaffRole,
  useRemoveStaffMember,
  useStaffAvailability,
  useUpdateStaffAvailability,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Avatar,
  Badge,
  Select,
  Button,
  Input,
  Spacer,
  Modal,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

const ROLE_BADGE_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  admin: "info",
  staff: "default",
  customer: "success",
  platform_admin: "warning",
};

interface DayAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function StaffDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: members, isLoading: loadingMembers } = useStaffMembers(tenantId);
  const { data: bookings } = useBookings(tenantId);
  const updateRole = useUpdateStaffRole(tenantId ?? "");
  const removeMember = useRemoveStaffMember(tenantId ?? "");

  const member = useMemo(() => {
    if (!members) return null;
    return members.find((m) => m.id === id) ?? null;
  }, [members, id]);

  const staffUserId = member?.userId;

  const { data: availabilityData } = useStaffAvailability(tenantId, staffUserId);
  const updateAvailability = useUpdateStaffAvailability(tenantId ?? "", staffUserId ?? "");

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  useEffect(() => {
    if (availabilityData?.schedule && availability.length === 0) {
      setAvailability(
        availabilityData.schedule.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.openTime ?? "09:00",
          endTime: a.closeTime ?? "17:00",
          isAvailable: a.isOpen,
        })),
      );
    }
  }, [availabilityData, availability.length]);

  useEffect(() => {
    if (member && selectedRole === null) {
      setSelectedRole(member.role);
    }
  }, [member, selectedRole]);

  const staffBookings = useMemo(() => {
    if (!bookings || !member) return { total: 0, completed: 0 };
    const staffList = bookings.filter((b) => b.staffId === member.userId);
    return {
      total: staffList.length,
      completed: staffList.filter((b) => b.status === "completed").length,
    };
  }, [bookings, member]);

  const updateDayAvailability = useCallback(
    (dayOfWeek: number, field: keyof DayAvailability, value: string | boolean) => {
      setAvailability((prev) =>
        prev.map((a) =>
          a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a,
        ),
      );
    },
    [],
  );

  const handleSaveAvailability = useCallback(async () => {
    if (!tenantId || !staffUserId) return;
    setSavingAvailability(true);
    try {
      await updateAvailability.mutateAsync({
        schedule: availability.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          isOpen: a.isAvailable,
          openTime: a.startTime,
          closeTime: a.endTime,
        })),
      });
      setToast({ message: "Availability saved", type: "success", visible: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save availability";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingAvailability(false);
    }
  }, [tenantId, staffUserId, availability, updateAvailability]);

  const handleUpdateRole = useCallback(async () => {
    if (!selectedRole || !member || selectedRole === member.role) return;

    setUpdatingRole(true);
    try {
      await updateRole.mutateAsync({ memberId: member.id, role: selectedRole });
      setToast({ message: "Role updated successfully", type: "success", visible: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      setToast({ message, type: "error", visible: true });
    } finally {
      setUpdatingRole(false);
    }
  }, [selectedRole, member, updateRole]);

  const handleSuspend = useCallback(async () => {
    if (!member) return;

    setSuspending(true);
    try {
      await removeMember.mutateAsync(member.id);
      setShowSuspendModal(false);
      setToast({ message: "Member removed", type: "success", visible: true });
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSuspending(false);
    }
  }, [member, removeMember, router]);

  if (loadingMembers) {
    return <LoadingScreen message="Loading staff member..." />;
  }

  if (!member) {
    return (
      <Screen>
        <Header title="Staff Detail" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>Member not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Staff Detail" onBack={() => router.back()} />

      {/* Profile Card */}
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <View className="items-center">
          <Avatar fallback={getInitials(member.name)} size="lg" />
          <Spacer size={12} />
          <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
            {member.name}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
            {member.email}
          </Text>
          <Spacer size={8} />
          <Badge
            label={member.role}
            variant={ROLE_BADGE_VARIANTS[member.role] ?? "default"}
          />
        </View>
      </View>

      {/* Performance Stats */}
      <View className="mb-4 flex-row" style={{ gap: 12 }}>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Bookings Handled
          </Text>
          <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
            {staffBookings.total}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
          <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Completed
          </Text>
          <Text className="mt-1 text-xl font-bold" style={{ color: theme.colors.text }}>
            {staffBookings.completed}
          </Text>
        </View>
      </View>

      {/* Role Management */}
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
          Change Role
        </Text>
        <View style={{ marginBottom: 12 }}>
          <Select
            options={ROLE_OPTIONS}
            value={selectedRole ?? member.role}
            onChange={setSelectedRole}
            label="Role"
          />
        </View>
        <Button
          onPress={handleUpdateRole}
          loading={updatingRole}
          disabled={!selectedRole || selectedRole === member.role}
        >
          Update Role
        </Button>
      </View>

      {/* Availability Editor */}
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
          Weekly Availability
        </Text>
        {availability.length === 0 ? (
          <Text className="py-4 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading availability...
          </Text>
        ) : (
          <>
            {availability.map((day) => (
              <View
                key={day.dayOfWeek}
                className="mb-2 rounded-lg p-3"
                style={{ backgroundColor: theme.colors.background }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: day.isAvailable ? theme.colors.text : theme.colors.textSecondary,
                      width: 90,
                    }}
                  >
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                  <Switch
                    value={day.isAvailable}
                    onValueChange={(val) =>
                      updateDayAvailability(day.dayOfWeek, "isAvailable", val)
                    }
                  />
                </View>
                {day.isAvailable && (
                  <View className="mt-2 flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Input
                        label="Start"
                        value={day.startTime}
                        onChangeText={(val) =>
                          updateDayAvailability(day.dayOfWeek, "startTime", val)
                        }
                        placeholder="09:00"
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="End"
                        value={day.endTime}
                        onChangeText={(val) =>
                          updateDayAvailability(day.dayOfWeek, "endTime", val)
                        }
                        placeholder="17:00"
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
            <Spacer size={8} />
            <Button onPress={handleSaveAvailability} loading={savingAvailability}>
              Save Availability
            </Button>
          </>
        )}
      </View>

      {/* Actions */}
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: theme.colors.text }}>
          Actions
        </Text>
        <Button variant="destructive" onPress={() => setShowSuspendModal(true)}>
          Remove Member
        </Button>
      </View>

      <Spacer size={20} />

      <Modal
        visible={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Remove Member"
      >
        <Text className="mb-4 text-base" style={{ color: theme.colors.text }}>
          Are you sure you want to remove{" "}
          <Text className="font-bold">{member.name}</Text>? They will lose
          access to this organization.
        </Text>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button variant="outline" onPress={() => setShowSuspendModal(false)}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="destructive" onPress={handleSuspend} loading={suspending}>
              Remove
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
