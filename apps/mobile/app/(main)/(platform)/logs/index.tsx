import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ClipboardList, User, Clock, Filter, ChevronDown } from "lucide-react-native";
import { usePlatformLogs } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  SearchInput,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

const ACTION_FILTER_OPTIONS = [
  { label: "All Actions", value: "all" },
  { label: "Tenant Created", value: "platform.tenant_created" },
  { label: "Tenant Updated", value: "tenant.updated" },
  { label: "Config Set", value: "platform.config_set" },
  { label: "Feature Flag Set", value: "platform.feature_flag_set" },
  { label: "Membership Invited", value: "membership.invited" },
  { label: "Role Updated", value: "membership.role_updated" },
  { label: "Suspended", value: "membership.suspended" },
];

function getActionVariant(action: string): "default" | "success" | "warning" | "error" {
  if (action.includes("created") || action.includes("activated")) return "success";
  if (action.includes("suspended") || action.includes("deleted")) return "error";
  if (action.includes("invited")) return "warning";
  return "default";
}

function formatAction(action: string): string {
  return action
    .replace(/^(platform|tenant|membership)\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AuditLogsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs, isLoading, refetch, isRefetching } = usePlatformLogs();

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    let filtered = logs;

    if (actionFilter !== "all") {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.actorEmail.toLowerCase().includes(query) ||
          e.targetName.toLowerCase().includes(query) ||
          e.action.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [logs, actionFilter, search]);

  if (isLoading) {
    return <LoadingScreen message="Loading audit logs..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Audit Logs" onBack={() => router.back()} />

      {/* Search */}
      <View className="px-4 pb-2">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search by actor, target, action..." />
      </View>

      {/* Filter Toggle */}
      <View className="px-4 pb-3">
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="flex-row items-center"
          activeOpacity={0.7}
        >
          <Filter size={14} color={theme.colors.textSecondary} />
          <Text className="ml-1.5 text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
            Filter by action
          </Text>
          <ChevronDown
            size={14}
            color={theme.colors.textSecondary}
            style={{ transform: [{ rotate: showFilters ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>

        {showFilters && (
          <View className="mt-2 flex-row flex-wrap" style={{ gap: 6 }}>
            {ACTION_FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setActionFilter(opt.value)}
                className="rounded-xl px-3 py-1.5"
                style={{
                  backgroundColor:
                    actionFilter === opt.value ? theme.colors.primary + "20" : theme.colors.surface,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{
                    color:
                      actionFilter === opt.value ? theme.colors.primary : theme.colors.textSecondary,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Count */}
      <View className="mb-1 px-4">
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Log List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No audit logs"
            description={
              search.trim() || actionFilter !== "all"
                ? "No logs match your current filters."
                : "No audit log entries found."
            }
            icon={<ClipboardList size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item: entry }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Badge label={formatAction(entry.action)} variant={getActionVariant(entry.action)} />

                <View className="mt-2 flex-row items-center" style={{ gap: 4 }}>
                  <User size={12} color={theme.colors.textSecondary} />
                  <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                    {entry.actorEmail}
                  </Text>
                </View>

                <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                  Target:{" "}
                  <Text style={{ color: theme.colors.text }}>{entry.targetName}</Text>
                </Text>

                {Object.keys(entry.details).length > 0 && (
                  <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                    {Object.entries(entry.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </Text>
                )}
              </View>

              <View className="items-end">
                <View className="flex-row items-center" style={{ gap: 3 }}>
                  <Clock size={11} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {formatRelativeTime(entry.createdAt)}
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(entry.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
