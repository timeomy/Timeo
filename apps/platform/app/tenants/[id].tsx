import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  Globe,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Select,
  Section,
  Separator,
  Spacer,
  LoadingScreen,
  ErrorScreen,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";
import {
  formatDate,
  TenantPlan,
  TenantStatus,
} from "@timeo/shared";

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

  const tenant = useQuery(
    api.tenants.getById,
    id ? { tenantId: id as any } : "skip"
  );

  const updateTenant = useMutation(api.tenants.update);

  const memberships = useQuery(
    api.tenantMemberships.listByTenant,
    id ? { tenantId: id as any } : "skip"
  );

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

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
