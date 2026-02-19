import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  ClipboardList,
  User,
  Clock,
  Filter,
  ChevronDown,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Badge,
  SearchInput,
  Select,
  EmptyState,
  LoadingScreen,
  Spacer,
  Separator,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { formatRelativeTime, formatDate, formatTime } from "@timeo/shared";

const ACTION_FILTER_OPTIONS = [
  { label: "All Actions", value: "all" },
  { label: "Tenant Created", value: "platform.tenant_created" },
  { label: "Tenant Updated", value: "tenant.updated" },
  { label: "Config Set", value: "platform.config_set" },
  { label: "Feature Flag Set", value: "platform.feature_flag_set" },
  { label: "Membership Invited", value: "membership.invited" },
  { label: "Membership Updated", value: "membership.role_updated" },
  { label: "Membership Suspended", value: "membership.suspended" },
  { label: "Tenant Branding Updated", value: "tenant.branding_updated" },
];

function getActionColor(action: string): "default" | "success" | "warning" | "error" | "info" {
  if (action.includes("created") || action.includes("activated")) return "success";
  if (action.includes("suspended") || action.includes("deleted")) return "error";
  if (action.includes("updated") || action.includes("set")) return "info";
  if (action.includes("invited")) return "warning";
  return "default";
}

function formatAction(action: string): string {
  return action
    .replace(/^(platform|tenant|membership)\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Since there is no dedicated listAuditLogs query, we query tenants to build
  // context. Audit logs in the DB are written by mutations; we simulate reading
  // them via platform queries where available. In a full implementation, you
  // would have a `platform.listAuditLogs` query. For now, we use the system
  // health query as a proxy and show a UI-ready audit log screen.
  //
  // Real integration would be:
  // const logs = useQuery(api.platform.listAuditLogs, { filter, cursor });
  //
  // For the complete UI, we'll show the screen structure with placeholder data
  // that matches the AuditLog schema shape.
  const systemHealth = useQuery(api.platform.getSystemHealth);
  const tenants = useQuery(api.tenants.list);

  // Build synthetic audit-like entries from available data for UI demonstration.
  // In production, replace this with real audit log query data.
  const auditEntries = useMemo(() => {
    if (!tenants) return undefined;

    const entries = tenants.map((tenant) => ({
      _id: `audit_${tenant._id}`,
      action: "platform.tenant_created",
      resource: "tenants",
      resourceId: tenant._id,
      actorName: "Platform Admin",
      targetName: tenant.name,
      timestamp: tenant.createdAt,
      metadata: { plan: tenant.plan },
    }));

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [tenants]);

  const filteredEntries = useMemo(() => {
    if (!auditEntries) return [];

    let filtered = auditEntries;

    if (actionFilter !== "all") {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.actorName.toLowerCase().includes(query) ||
          e.targetName.toLowerCase().includes(query) ||
          e.action.toLowerCase().includes(query) ||
          e.resource.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [auditEntries, actionFilter, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (auditEntries === undefined) {
    return <LoadingScreen message="Loading audit logs..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Audit Logs" onBack={() => router.back()} />

      {/* Search and Filters */}
      <View className="px-4 pb-2">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by actor, target, action..."
        />
      </View>

      <View className="px-4 pb-3">
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="flex-row items-center"
          activeOpacity={0.7}
        >
          <Filter size={14} color={theme.colors.textSecondary} />
          <Text
            className="ml-1.5 text-sm font-medium"
            style={{ color: theme.colors.textSecondary }}
          >
            Filter by action
          </Text>
          <ChevronDown
            size={14}
            color={theme.colors.textSecondary}
            style={{
              transform: [{ rotate: showFilters ? "180deg" : "0deg" }],
            }}
          />
        </TouchableOpacity>

        {showFilters ? (
          <View className="mt-2">
            <Select
              options={ACTION_FILTER_OPTIONS}
              value={actionFilter}
              onChange={setActionFilter}
              placeholder="Filter by action"
            />
          </View>
        ) : null}
      </View>

      {/* Results Count */}
      <View className="mb-1 px-4">
        <Text
          className="text-xs"
          style={{ color: theme.colors.textSecondary }}
        >
          {filteredEntries.length} log{filteredEntries.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Log List */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <Spacer size={8} />}
        ListEmptyComponent={
          <EmptyState
            title="No audit logs"
            description={
              search.trim() || actionFilter !== "all"
                ? "No logs match your current filters."
                : "No audit log entries found."
            }
            icon={
              <ClipboardList size={32} color={theme.colors.textSecondary} />
            }
          />
        }
        renderItem={({ item: entry }) => (
          <Card>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Badge
                    label={formatAction(entry.action)}
                    variant={getActionColor(entry.action)}
                  />
                </View>

                <View className="mt-2 flex-row items-center">
                  <User size={12} color={theme.colors.textSecondary} />
                  <Text
                    className="ml-1.5 text-sm font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {entry.actorName}
                  </Text>
                </View>

                <Text
                  className="mt-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {entry.resource}:{" "}
                  <Text style={{ color: theme.colors.text }}>
                    {entry.targetName}
                  </Text>
                </Text>

                {entry.metadata ? (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {Object.entries(entry.metadata)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </Text>
                ) : null}
              </View>

              <View className="items-end">
                <View className="flex-row items-center">
                  <Clock size={11} color={theme.colors.textSecondary} />
                  <Text
                    className="ml-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {formatRelativeTime(entry.timestamp)}
                  </Text>
                </View>
                <Text
                  className="mt-0.5 text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {formatDate(entry.timestamp)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
