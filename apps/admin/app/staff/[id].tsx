import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Avatar,
  Badge,
  Card,
  Select,
  Button,
  Input,
  Switch,
  Row,
  Spacer,
  Separator,
  Modal,
  LoadingScreen,
  ErrorScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { getInitials } from "@timeo/shared";
import {
  useStaffMembers,
  useUpdateStaffRole,
  useRemoveStaffMember,
  useStaffAvailability,
  useUpdateStaffAvailability,
} from "@timeo/api-client";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
];

const ROLE_BADGE_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  admin: "info",
  staff: "default",
  customer: "success",
  platform_admin: "warning",
};

export default function StaffDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const { data: staffMembers, isLoading } = useStaffMembers(tenantId);
  const { mutateAsync: updateRole } = useUpdateStaffRole(tenantId ?? "");
  const { mutateAsync: removeMember } = useRemoveStaffMember(tenantId ?? "");

  const member = useMemo(() => {
    if (!staffMembers) return null;
    return staffMembers.find((m) => m.id === id) ?? null;
  }, [staffMembers, id]);

  const staffUserId = member?.userId;

  const { data: availabilityData } = useStaffAvailability(tenantId, staffUserId);
  const { mutateAsync: updateAvailability } = useUpdateStaffAvailability(
    tenantId ?? "",
    staffUserId ?? ""
  );

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  useEffect(() => {
    if (availabilityData && availability.length === 0) {
      const defaultSchedule: DayAvailability[] = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: i > 0 && i < 6, // Mon-Fri
      }));

      const schedule = (availabilityData as Array<{ schedule?: Array<{ dayOfWeek: number; isOpen: boolean; openTime?: string; closeTime?: string }> }>)[0]?.schedule;
      if (schedule) {
        setAvailability(
          schedule.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.openTime ?? "09:00",
            endTime: s.closeTime ?? "17:00",
            isAvailable: s.isOpen,
          }))
        );
      } else {
        setAvailability(defaultSchedule);
      }
    } else if (!availabilityData && availability.length === 0 && member) {
      setAvailability(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: i > 0 && i < 6,
        }))
      );
    }
  }, [availabilityData, availability.length, member]);

  const updateDayAvailability = useCallback(
    (dayOfWeek: number, field: keyof DayAvailability, value: boolean | string) => {
      setAvailability((prev) =>
        prev.map((a) =>
          a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
        )
      );
    },
    []
  );

  const handleSaveAvailability = useCallback(async () => {
    if (!tenantId || !staffUserId) return;
    setSavingAvailability(true);
    try {
      await updateAvailability({
        schedule: availability.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          isOpen: a.isAvailable,
          openTime: a.startTime,
          closeTime: a.endTime,
        })),
      });
      setToast({
        message: "Availability saved",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save availability";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingAvailability(false);
    }
  }, [tenantId, staffUserId, availability, updateAvailability]);

  // Initialize selectedRole from member data
  useEffect(() => {
    if (member && selectedRole === null) {
      setSelectedRole(member.role);
    }
  }, [member, selectedRole]);

  const handleUpdateRole = useCallback(async () => {
    if (!selectedRole || !member || selectedRole === member.role) return;

    setUpdatingRole(true);
    try {
      await updateRole({
        memberId: member.id,
        role: selectedRole,
      });
      setToast({
        message: "Role updated successfully",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      setToast({ message, type: "error", visible: true });
    } finally {
      setUpdatingRole(false);
    }
  }, [selectedRole, member, updateRole]);

  const handleRemove = useCallback(async () => {
    if (!member) return;

    setRemoving(true);
    try {
      await removeMember(member.id);
      setShowRemoveModal(false);
      setToast({
        message: "Member removed",
        type: "success",
        visible: true,
      });
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      setToast({ message, type: "error", visible: true });
    } finally {
      setRemoving(false);
    }
  }, [member, removeMember, router]);

  if (isLoading) {
    return <LoadingScreen message="Loading staff member..." />;
  }

  if (!member) {
    return (
      <ErrorScreen
        title="Member not found"
        message="This team member could not be found."
        onRetry={() => router.back()}
      />
    );
  }

  return (
    <Screen scroll>
      <Header title="Staff Detail" onBack={() => router.back()} />

      {/* Profile Card */}
      <Card className="mb-4">
        <View className="items-center">
          <Avatar
            fallback={getInitials(member.name)}
            size="lg"
          />
          <Spacer size={12} />
          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {member.name}
          </Text>
          <Text
            className="mt-1 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {member.email}
          </Text>
          <Spacer size={8} />
          <Row gap={8}>
            <Badge
              label={member.role}
              variant={ROLE_BADGE_VARIANTS[member.role] ?? "default"}
            />
            {!member.isActive && <Badge label="Inactive" variant="error" />}
          </Row>
        </View>
      </Card>

      <Separator className="my-4" />

      {/* Role Management */}
      <Card className="mb-4">
        <Text
          className="mb-3 text-base font-semibold"
          style={{ color: theme.colors.text }}
        >
          Change Role
        </Text>
        <Select
          options={ROLE_OPTIONS}
          value={selectedRole ?? member.role}
          onChange={setSelectedRole}
          label="Role"
          className="mb-4"
        />
        <Button
          onPress={handleUpdateRole}
          loading={updatingRole}
          disabled={!selectedRole || selectedRole === member.role}
        >
          Update Role
        </Button>
      </Card>

      {/* Availability Editor */}
      <Card className="mb-4">
        <Text
          className="mb-3 text-base font-semibold"
          style={{ color: theme.colors.text }}
        >
          Weekly Availability
        </Text>
        {availability.length === 0 ? (
          <Text
            className="py-4 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Loading availability...
          </Text>
        ) : (
          <>
            {availability.map((day) => (
              <View
                key={day.dayOfWeek}
                className="mb-2 rounded-lg p-3"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Row justify="between" align="center">
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: day.isAvailable
                        ? theme.colors.text
                        : theme.colors.textSecondary,
                      width: 90,
                    }}
                  >
                    {DAY_NAMES[day.dayOfWeek]}
                  </Text>
                  <Switch
                    value={day.isAvailable}
                    onValueChange={(val: boolean) =>
                      updateDayAvailability(day.dayOfWeek, "isAvailable", val)
                    }
                  />
                </Row>
                {day.isAvailable && (
                  <Row gap={8} className="mt-2">
                    <View className="flex-1">
                      <Input
                        label="Start"
                        value={day.startTime}
                        onChangeText={(val: string) =>
                          updateDayAvailability(day.dayOfWeek, "startTime", val)
                        }
                        placeholder="09:00"
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="End"
                        value={day.endTime}
                        onChangeText={(val: string) =>
                          updateDayAvailability(day.dayOfWeek, "endTime", val)
                        }
                        placeholder="17:00"
                      />
                    </View>
                  </Row>
                )}
              </View>
            ))}
            <Spacer size={8} />
            <Button
              onPress={handleSaveAvailability}
              loading={savingAvailability}
            >
              Save Availability
            </Button>
          </>
        )}
      </Card>

      {/* Actions */}
      <Card className="mb-4">
        <Text
          className="mb-3 text-base font-semibold"
          style={{ color: theme.colors.text }}
        >
          Actions
        </Text>
        <Button
          variant="destructive"
          onPress={() => setShowRemoveModal(true)}
        >
          Remove from Team
        </Button>
      </Card>

      <Spacer size={20} />

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove Member"
      >
        <Text
          className="mb-4 text-base"
          style={{ color: theme.colors.text }}
        >
          Are you sure you want to remove{" "}
          <Text className="font-bold">{member.name}</Text> from the team? They will lose
          access to this organization.
        </Text>
        <Row gap={12}>
          <View className="flex-1">
            <Button
              variant="outline"
              onPress={() => setShowRemoveModal(false)}
            >
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="destructive"
              onPress={handleRemove}
              loading={removing}
            >
              Remove
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
