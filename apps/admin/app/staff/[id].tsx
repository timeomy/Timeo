import React, { useState, useCallback, useMemo } from "react";
import { View, Text, Alert } from "react-native";
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
  Row,
  Spacer,
  StatCard,
  Separator,
  Modal,
  LoadingScreen,
  ErrorScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { getInitials } from "@timeo/shared";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

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

export default function StaffDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const bookings = useQuery(
    api.bookings.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const updateRole = useMutation(api.tenantMemberships.updateRole);
  const suspendMember = useMutation(api.tenantMemberships.suspend);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const member = useMemo(() => {
    if (!members) return null;
    return members.find((m) => m._id === id) ?? null;
  }, [members, id]);

  const staffBookings = useMemo(() => {
    if (!bookings || !member) return { total: 0, completed: 0 };
    const staffBookingList = bookings.filter(
      (b) => b.staffId === member.userId
    );
    return {
      total: staffBookingList.length,
      completed: staffBookingList.filter((b) => b.status === "completed")
        .length,
    };
  }, [bookings, member]);

  // Initialize selectedRole from member data
  React.useEffect(() => {
    if (member && selectedRole === null) {
      setSelectedRole(member.role);
    }
  }, [member, selectedRole]);

  const handleUpdateRole = useCallback(async () => {
    if (!selectedRole || !member || selectedRole === member.role) return;

    setUpdatingRole(true);
    try {
      await updateRole({
        tenantId: tenantId as any,
        membershipId: member._id as any,
        role: selectedRole as any,
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
  }, [selectedRole, member, tenantId, updateRole]);

  const handleSuspend = useCallback(async () => {
    if (!member) return;

    setSuspending(true);
    try {
      await suspendMember({
        tenantId: tenantId as any,
        membershipId: member._id as any,
      });
      setShowSuspendModal(false);
      setToast({
        message: "Member suspended",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to suspend member";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSuspending(false);
    }
  }, [member, tenantId, suspendMember]);

  if (members === undefined || bookings === undefined) {
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

  const isSuspended = member.status === "suspended";

  return (
    <Screen scroll>
      <Header title="Staff Detail" onBack={() => router.back()} />

      {/* Profile Card */}
      <Card className="mb-4">
        <View className="items-center">
          <Avatar
            src={member.userAvatarUrl}
            fallback={getInitials(member.userName)}
            size="lg"
          />
          <Spacer size={12} />
          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {member.userName}
          </Text>
          <Text
            className="mt-1 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {member.userEmail}
          </Text>
          <Spacer size={8} />
          <Row gap={8}>
            <Badge
              label={member.role}
              variant={ROLE_BADGE_VARIANTS[member.role] ?? "default"}
            />
            {isSuspended && <Badge label="Suspended" variant="error" />}
            {member.status === "invited" && (
              <Badge label="Invited" variant="warning" />
            )}
          </Row>
        </View>
      </Card>

      {/* Performance Stats */}
      <Row gap={12} className="mb-4">
        <View className="flex-1">
          <StatCard
            label="Bookings Handled"
            value={staffBookings.total}
          />
        </View>
        <View className="flex-1">
          <StatCard
            label="Completed"
            value={staffBookings.completed}
          />
        </View>
      </Row>

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

      {/* Actions */}
      <Card className="mb-4">
        <Text
          className="mb-3 text-base font-semibold"
          style={{ color: theme.colors.text }}
        >
          Actions
        </Text>
        {!isSuspended ? (
          <Button
            variant="destructive"
            onPress={() => setShowSuspendModal(true)}
          >
            Suspend Member
          </Button>
        ) : (
          <View
            className="items-center rounded-xl py-3"
            style={{ backgroundColor: theme.colors.error + "10" }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.error }}
            >
              This member is currently suspended
            </Text>
          </View>
        )}
      </Card>

      <Spacer size={20} />

      {/* Suspend Confirmation Modal */}
      <Modal
        visible={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend Member"
      >
        <Text
          className="mb-4 text-base"
          style={{ color: theme.colors.text }}
        >
          Are you sure you want to suspend{" "}
          <Text className="font-bold">{member.userName}</Text>? They will lose
          access to this organization.
        </Text>
        <Row gap={12}>
          <View className="flex-1">
            <Button
              variant="outline"
              onPress={() => setShowSuspendModal(false)}
            >
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="destructive"
              onPress={handleSuspend}
              loading={suspending}
            >
              Suspend
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
