import React, { useCallback, useState } from "react";
import { View, Text, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  Users,
  CalendarCheck,
  Activity,
  Plus,
  Flag,
  ClipboardList,
  ChevronRight,
} from "lucide-react-native";
import {
  Screen,
  StatCard,
  Section,
  Card,
  Badge,
  Button,
  Spacer,
  Skeleton,
  ErrorScreen,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { formatRelativeTime } from "@timeo/shared";

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useTimeoAuth();
  const [refreshing, setRefreshing] = useState(false);

  const systemHealth = useQuery(api.platform.getSystemHealth);
  const tenants = useQuery(api.tenants.list);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries are live, so a brief delay is sufficient for UX
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (systemHealth === undefined || tenants === undefined) {
    return (
      <Screen scroll>
        <View className="mt-4">
          <Skeleton className="mb-2 h-8 w-48 rounded-lg" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </View>
        <View className="mt-6 flex-row flex-wrap gap-3">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </View>
        <View className="mt-3 flex-row flex-wrap gap-3">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </View>
        <View className="mt-8">
          <Skeleton className="mb-4 h-6 w-32 rounded-lg" />
          <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
          <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }

  const displayName = user?.firstName ?? "Admin";
  const healthStatus = systemHealth.totalTenants > 0 ? "Healthy" : "No Data";

  return (
    <Screen scroll={false}>
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="mb-2 mt-4">
          <Text
            className="text-sm font-medium"
            style={{ color: theme.colors.textSecondary }}
          >
            Platform Admin
          </Text>
          <Text
            className="mt-0.5 text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Hello, {displayName}
          </Text>
        </View>

        {/* Stat Cards */}
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              label="Total Tenants"
              value={systemHealth.totalTenants}
              icon={<Building2 size={18} color={theme.colors.primary} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="Total Users"
              value={systemHealth.totalUsers}
              icon={<Users size={18} color={theme.colors.secondary} />}
            />
          </View>
        </View>

        <View className="mt-3 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              label="Pending Bookings"
              value={systemHealth.pendingBookings}
              icon={<CalendarCheck size={18} color={theme.colors.warning} />}
            />
          </View>
          <View className="flex-1">
            <StatCard
              label="System Health"
              value={healthStatus}
              icon={<Activity size={18} color={theme.colors.success} />}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <Section title="Quick Actions">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={() => router.push("/tenants/new")}>
                <View className="flex-row items-center">
                  <Plus size={16} color="#FFFFFF" />
                  <Text className="ml-2 font-semibold text-white">
                    New Tenant
                  </Text>
                </View>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => router.push("/(tabs)/flags")}
              >
                <View className="flex-row items-center">
                  <Flag size={16} color={theme.colors.text} />
                  <Text
                    className="ml-2 font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    Flags
                  </Text>
                </View>
              </Button>
            </View>
          </View>
        </Section>

        {/* Recent Tenants */}
        <Section
          title="Recent Tenants"
          seeAll={{
            label: "View all",
            onPress: () => router.push("/(tabs)/tenants"),
          }}
        >
          {tenants.length === 0 ? (
            <Card>
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                No tenants yet. Create your first tenant to get started.
              </Text>
            </Card>
          ) : (
            tenants.slice(0, 5).map((tenant) => (
              <TouchableOpacity
                key={tenant._id}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(`/tenants/${tenant._id}` as any)
                }
              >
                <Card className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold"
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
                    <View className="flex-row items-center gap-2">
                      <Badge
                        label={tenant.plan}
                        variant={
                          tenant.plan === "enterprise"
                            ? "warning"
                            : tenant.plan === "pro"
                              ? "default"
                              : tenant.plan === "starter"
                                ? "info"
                                : "default"
                        }
                      />
                      <ChevronRight
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Audit Log Quick Link */}
        <Section title="Audit Logs">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/logs")}
          >
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="mr-3 rounded-full p-2"
                    style={{ backgroundColor: theme.colors.primary + "15" }}
                  >
                    <ClipboardList size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      View Audit Logs
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Track all platform activity
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        </Section>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
