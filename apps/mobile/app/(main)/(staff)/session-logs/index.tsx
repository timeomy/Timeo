import { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays, Clock3, Dumbbell, Filter, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useCoachClients, useSessionLogs } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Select,
  SearchInput,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return parsed.toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionType(type?: string): string {
  if (!type) return "Session";
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SessionLogsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: clients } = useCoachClients(tenantId);
  const {
    data: logs,
    isLoading,
    refetch,
    isRefetching,
  } = useSessionLogs(tenantId, {
    scope: "coach",
    clientId: selectedClientId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const clientOptions = useMemo(
    () => [
      { label: "All clients", value: "" },
      ...(clients ?? []).map((client) => ({
        label: client.name,
        value: client.id,
      })),
    ],
    [clients],
  );

  const filteredLogs = useMemo(() => {
    const list = logs ?? [];
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (log) =>
        log.clientName?.toLowerCase().includes(query) ||
        log.notes?.toLowerCase().includes(query),
    );
  }, [logs, searchQuery]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Session History" onBack={() => router.back()} />
        <EmptyState
          title="No organization selected"
          description="Please select an organization first."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading sessions..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Session History" onBack={() => router.back()} />

      <View className="px-4 pb-3" style={{ gap: 10 }}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notes or client"
        />

        <View>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Client
          </Text>
          <Select
            options={clientOptions}
            value={selectedClientId}
            onChange={setSelectedClientId}
            placeholder="Filter by client"
          />
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
              Date From
            </Text>
            <TextInput
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
                borderWidth: 1,
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
              value={dateFrom}
              onChangeText={setDateFrom}
              autoCapitalize="none"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
              Date To
            </Text>
            <TextInput
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
                borderWidth: 1,
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
              value={dateTo}
              onChangeText={setDateTo}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Filter size={13} color={theme.colors.textSecondary} />
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {filteredLogs.length} session{filteredLogs.length === 1 ? "" : "s"}
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push("/session-logs/create" as never)}>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Plus size={14} color={theme.colors.primary} />
              <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                New
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 10 }}
        ListEmptyComponent={
          <EmptyState
            title="No sessions found"
            description="Try adjusting filters or log a new session."
            icon={<Dumbbell size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                {item.clientName ?? "Client"}
              </Text>
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {item.duration ? `${item.duration} min` : "-"}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatSessionType(item.sessionType)}
                </Text>
              </View>
            </View>

            <View className="mt-2" style={{ gap: 6 }}>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <CalendarDays size={13} color={theme.colors.textSecondary} />
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Clock3 size={13} color={theme.colors.textSecondary} />
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Coach log entry
                </Text>
              </View>
            </View>

            {item.notes ? (
              <Text className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                {item.notes}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}
