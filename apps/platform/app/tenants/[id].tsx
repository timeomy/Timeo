import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  Globe,
  Camera,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Switch,
  Section,
  Separator,
  Spacer,
  Modal,
  LoadingScreen,
  ErrorScreen,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";
import { formatDate } from "@timeo/shared";

const PLAN_OPTIONS = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

function getPlanBadgeVariant(
  plan: string
): "default" | "info" | "success" | "warning" | "error" {
  switch (plan) {
    case "enterprise":
      return "warning";
    case "pro":
      return "success";
    case "starter":
      return "info";
    case "free":
    default:
      return "default";
  }
}

function getStatusBadgeVariant(
  status: string
): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
      return "error";
    case "trial":
      return "warning";
    default:
      return "default";
  }
}

export default function TenantDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Settings state
  const [timezone, setTimezone] = useState("");
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(false);
  const [bookingBuffer, setBookingBuffer] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Door camera state
  const [doorIp, setDoorIp] = useState("");
  const [doorPort, setDoorPort] = useState("");
  const [doorGpioPort, setDoorGpioPort] = useState("");
  const [doorDeviceSn, setDoorDeviceSn] = useState("");
  const [savingDoor, setSavingDoor] = useState(false);

  // Feature flags state
  const [showAddFlagModal, setShowAddFlagModal] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(true);
  const [addingFlag, setAddingFlag] = useState(false);
  const [, setTogglingFlagKey] = useState<string | null>(null);

  const tenant = useQuery(
    api.tenants.getById,
    id ? { tenantId: id as any } : "skip"
  );

  const updateTenant = useMutation(api.tenants.update);
  const updateTenantSettings = useMutation(api.platform.updateTenantSettings);
  const setFeatureFlag = useMutation(api.platform.setFeatureFlag);

  const memberships = useQuery(
    api.tenantMemberships.listByTenant,
    id ? { tenantId: id as any } : "skip"
  );

  const tenantFlags = useQuery(
    api.platform.listFeatureFlags,
    id ? { tenantId: id as any } : "skip"
  );

  // Initialize settings from tenant data
  useEffect(() => {
    if (tenant && !settingsInitialized) {
      setTimezone(tenant.settings?.timezone ?? "");
      setAutoConfirmBookings(tenant.settings?.autoConfirmBookings ?? false);
      setBookingBuffer(
        tenant.settings?.bookingBuffer != null
          ? String(tenant.settings.bookingBuffer)
          : ""
      );
      const cam = tenant.settings?.doorCamera;
      setDoorIp(cam?.ip ?? "");
      setDoorPort(cam?.port != null ? String(cam.port) : "");
      setDoorGpioPort(cam?.gpioPort != null ? String(cam.gpioPort) : "");
      setDoorDeviceSn(cam?.deviceSn ?? "");
      setSettingsInitialized(true);
    }
  }, [tenant, settingsInitialized]);

  const handleSaveSettings = useCallback(async () => {
    if (!id) return;
    setSavingSettings(true);
    try {
      const bufferNum = bookingBuffer.trim() ? parseInt(bookingBuffer, 10) : undefined;
      await updateTenantSettings({
        tenantId: id as any,
        settings: {
          timezone: timezone.trim() || undefined,
          autoConfirmBookings,
          bookingBuffer: bufferNum !== undefined && !isNaN(bufferNum) ? bufferNum : undefined,
        },
      });
      Alert.alert("Success", "Tenant settings have been updated.");
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to update settings. ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setSavingSettings(false);
    }
  }, [id, timezone, autoConfirmBookings, bookingBuffer, updateTenantSettings]);

  const handleToggleFlag = useCallback(
    async (key: string, enabled: boolean) => {
      if (!id) return;
      setTogglingFlagKey(key);
      try {
        await setFeatureFlag({ key, enabled, tenantId: id as any });
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to toggle flag. ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setTogglingFlagKey(null);
      }
    },
    [id, setFeatureFlag]
  );

  const handleAddFlag = useCallback(async () => {
    if (!newFlagKey.trim() || !id) return;
    setAddingFlag(true);
    try {
      await setFeatureFlag({
        key: newFlagKey.trim(),
        enabled: newFlagEnabled,
        tenantId: id as any,
      });
      setNewFlagKey("");
      setNewFlagEnabled(true);
      setShowAddFlagModal(false);
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to add flag. ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setAddingFlag(false);
    }
  }, [newFlagKey, newFlagEnabled, id, setFeatureFlag]);

  const handleSaveDoorCamera = useCallback(async () => {
    if (!id) return;
    setSavingDoor(true);
    try {
      const portNum = doorPort.trim() ? parseInt(doorPort, 10) : undefined;
      const gpioNum = doorGpioPort.trim() ? parseInt(doorGpioPort, 10) : undefined;
      await updateTenantSettings({
        tenantId: id as any,
        settings: {
          doorCamera: doorIp.trim()
            ? {
                ip: doorIp.trim(),
                port: portNum !== undefined && !isNaN(portNum) ? portNum : undefined,
                gpioPort: gpioNum !== undefined && !isNaN(gpioNum) ? gpioNum : undefined,
                deviceSn: doorDeviceSn.trim() || undefined,
              }
            : undefined,
        },
      });
      Alert.alert("Success", "Door camera settings have been saved.");
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to save door camera settings. ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setSavingDoor(false);
    }
  }, [id, doorIp, doorPort, doorGpioPort, doorDeviceSn, updateTenantSettings]);

  const handleChangePlan = useCallback(async () => {
    if (!selectedPlan || !id) return;
    setUpdatingPlan(true);
    try {
      await updateTenant({
        tenantId: id as any,
        plan: selectedPlan as any,
      });
      setSelectedPlan(null);
      Alert.alert("Success", "Tenant plan has been updated.");
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to update plan. ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setUpdatingPlan(false);
    }
  }, [selectedPlan, id, updateTenant]);

  const handleToggleStatus = useCallback(async () => {
    if (!tenant || !id) return;

    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const actionLabel =
      newStatus === "suspended" ? "suspend" : "activate";

    Alert.alert(
      `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} Tenant`,
      `Are you sure you want to ${actionLabel} "${tenant.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1),
          style: newStatus === "suspended" ? "destructive" : "default",
          onPress: async () => {
            setTogglingStatus(true);
            try {
              await updateTenant({
                tenantId: id as any,
                status: newStatus as any,
              });
            } catch (error) {
              Alert.alert(
                "Error",
                `Failed to ${actionLabel} tenant. ${error instanceof Error ? error.message : "Please try again."}`
              );
            } finally {
              setTogglingStatus(false);
            }
          },
        },
      ]
    );
  }, [tenant, id, updateTenant]);

  if (!id) {
    return <ErrorScreen title="Invalid Tenant" message="No tenant ID provided." />;
  }

  if (tenant === undefined) {
    return <LoadingScreen message="Loading tenant..." />;
  }

  if (tenant === null) {
    return (
      <ErrorScreen
        title="Tenant Not Found"
        message="This tenant does not exist or has been removed."
        onRetry={() => router.back()}
      />
    );
  }

  const memberCount = memberships?.length ?? 0;
  const currentPlan = selectedPlan ?? tenant.plan;

  return (
    <Screen scroll={false}>
      <Header title="Tenant Details" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Tenant Info Card */}
        <Card variant="elevated" className="mt-2">
          <View className="flex-row items-center">
            <View
              className="mr-4 rounded-2xl p-3"
              style={{ backgroundColor: theme.colors.primary + "15" }}
            >
              <Building2 size={28} color={theme.colors.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-xl font-bold"
                style={{ color: theme.colors.text }}
              >
                {tenant.name}
              </Text>
              <Text
                className="mt-0.5 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                /{tenant.slug}
              </Text>
            </View>
          </View>

          <Separator className="my-4" />

          {/* Status and Plan Badges */}
          <View className="flex-row items-center gap-2">
            <Badge
              label={tenant.plan}
              variant={getPlanBadgeVariant(tenant.plan)}
            />
            <Badge
              label={tenant.status}
              variant={getStatusBadgeVariant(tenant.status)}
            />
          </View>
        </Card>

        {/* Details Section */}
        <Section title="Details">
          <Card>
            <View className="flex-row items-center py-2">
              <Calendar size={16} color={theme.colors.textSecondary} />
              <Text
                className="ml-3 flex-1 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Created
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.text }}
              >
                {formatDate(tenant.createdAt)}
              </Text>
            </View>

            <Separator className="my-1" />

            <View className="flex-row items-center py-2">
              <Users size={16} color={theme.colors.textSecondary} />
              <Text
                className="ml-3 flex-1 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Members
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.text }}
              >
                {memberships === undefined ? "..." : memberCount}
              </Text>
            </View>

            <Separator className="my-1" />

            <View className="flex-row items-center py-2">
              <ShieldCheck size={16} color={theme.colors.textSecondary} />
              <Text
                className="ml-3 flex-1 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Plan
              </Text>
              <Text
                className="text-sm font-semibold capitalize"
                style={{ color: theme.colors.text }}
              >
                {tenant.plan}
              </Text>
            </View>

            <Separator className="my-1" />

            <View className="flex-row items-center py-2">
              <Globe size={16} color={theme.colors.textSecondary} />
              <Text
                className="ml-3 flex-1 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Timezone
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.text }}
              >
                {tenant.settings?.timezone ?? "Not set"}
              </Text>
            </View>
          </Card>
        </Section>

        {/* Change Plan */}
        <Section title="Change Plan">
          <Card>
            <Select
              options={PLAN_OPTIONS}
              value={currentPlan}
              onChange={setSelectedPlan}
              label="Select Plan"
              placeholder="Choose a plan"
              className="mb-3"
            />
            <Button
              onPress={handleChangePlan}
              loading={updatingPlan}
              disabled={!selectedPlan || selectedPlan === tenant.plan}
            >
              Update Plan
            </Button>
          </Card>
        </Section>

        {/* Status Toggle */}
        <Section title="Tenant Status">
          <Card>
            <Text
              className="mb-3 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {tenant.status === "active"
                ? "This tenant is currently active. Suspending will prevent all users from accessing the tenant."
                : tenant.status === "suspended"
                  ? "This tenant is currently suspended. Activating will restore access for all users."
                  : "This tenant is on a trial. You can activate or suspend it."}
            </Text>
            <Button
              variant={tenant.status === "active" ? "destructive" : "default"}
              loading={togglingStatus}
              onPress={handleToggleStatus}
            >
              {tenant.status === "active"
                ? "Suspend Tenant"
                : "Activate Tenant"}
            </Button>
          </Card>
        </Section>

        {/* Members Preview */}
        {memberships && memberships.length > 0 ? (
          <Section title="Members">
            <Card>
              {memberships.slice(0, 5).map((member, index) => (
                <View key={member._id}>
                  <View className="flex-row items-center justify-between py-2">
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {member.userName}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {member.userEmail}
                      </Text>
                    </View>
                    <Badge label={member.role} />
                  </View>
                  {index < Math.min(memberships.length, 5) - 1 ? (
                    <Separator />
                  ) : null}
                </View>
              ))}
              {memberships.length > 5 ? (
                <Text
                  className="mt-2 text-center text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  +{memberships.length - 5} more members
                </Text>
              ) : null}
            </Card>
          </Section>
        ) : null}

        {/* Tenant Settings */}
        <Section title="Settings">
          <Card>
            <Input
              label="Timezone"
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g. Asia/Kuala_Lumpur"
              autoCapitalize="none"
              className="mb-4"
            />
            <Input
              label="Booking Buffer (minutes)"
              value={bookingBuffer}
              onChangeText={setBookingBuffer}
              placeholder="e.g. 15"
              keyboardType="numeric"
              className="mb-4"
            />
            <Switch
              label="Auto-confirm Bookings"
              value={autoConfirmBookings}
              onValueChange={setAutoConfirmBookings}
              className="mb-4"
            />
            <Button loading={savingSettings} onPress={handleSaveSettings}>
              Save Settings
            </Button>
          </Card>
        </Section>

        {/* Door Camera */}
        <Section title="Door Camera">
          <Card>
            <Text
              className="mb-3 text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Configure the HA SDK face-recognition camera that controls door access. The camera must be reachable from Convex servers.
            </Text>
            <Input
              label="Camera IP Address"
              value={doorIp}
              onChangeText={setDoorIp}
              placeholder="e.g. 192.168.1.100"
              autoCapitalize="none"
              keyboardType="decimal-pad"
              className="mb-4"
            />
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Input
                  label="HTTP Port"
                  value={doorPort}
                  onChangeText={setDoorPort}
                  placeholder="8000"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="GPIO Port"
                  value={doorGpioPort}
                  onChangeText={setDoorGpioPort}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Input
              label="Device Serial (optional)"
              value={doorDeviceSn}
              onChangeText={setDoorDeviceSn}
              placeholder="e.g. SN1234567890"
              autoCapitalize="characters"
              className="mb-4 mt-4"
            />
            <Button loading={savingDoor} onPress={handleSaveDoorCamera}>
              Save Door Camera
            </Button>
          </Card>
        </Section>

        {/* Tenant Feature Flags */}
        <Section
          title="Feature Flags"
          seeAll={{ label: "+ Add", onPress: () => setShowAddFlagModal(true) }}
        >
          <Card>
            {tenantFlags && tenantFlags.length > 0 ? (
              tenantFlags.map((flag, index) => (
                <View key={flag._id}>
                  <View className="flex-row items-center justify-between py-2">
                    <Text
                      className="flex-1 text-sm font-medium"
                      style={{ color: theme.colors.text }}
                    >
                      {flag.key}
                    </Text>
                    <Switch
                      value={flag.enabled}
                      onValueChange={(enabled) =>
                        handleToggleFlag(flag.key, enabled)
                      }
                    />
                  </View>
                  {index < tenantFlags.length - 1 ? <Separator /> : null}
                </View>
              ))
            ) : (
              <Text
                className="py-2 text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No tenant-specific flags configured.
              </Text>
            )}
          </Card>
        </Section>

        <Spacer size={24} />
      </ScrollView>

      {/* Add Flag Modal */}
      <Modal
        visible={showAddFlagModal}
        onClose={() => {
          setShowAddFlagModal(false);
          setNewFlagKey("");
          setNewFlagEnabled(true);
        }}
        title="Add Feature Flag"
      >
        <Input
          label="Flag Key"
          value={newFlagKey}
          onChangeText={setNewFlagKey}
          placeholder="e.g. enable_pos"
          autoCapitalize="none"
          className="mb-4"
        />
        <Switch
          label="Enabled"
          value={newFlagEnabled}
          onValueChange={setNewFlagEnabled}
          className="mb-4"
        />
        <Button
          loading={addingFlag}
          onPress={handleAddFlag}
          disabled={!newFlagKey.trim()}
        >
          Add Flag
        </Button>
      </Modal>
    </Screen>
  );
}
