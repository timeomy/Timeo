import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Scissors, Plus, Clock } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  SearchInput,
  Switch,
  PriceDisplay,
  Badge,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";
import type { Id } from "@timeo/api";

export default function ServicesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as Id<"tenants"> | null;

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const services = useQuery(
    api.services.list,
    tenantId ? { tenantId } : "skip"
  );

  const toggleActive = useMutation(api.services.toggleActive);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery.trim()) return services;

    const query = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  const handleToggleActive = useCallback(
    async (serviceId: Id<"services">) => {
      try {
        await toggleActive({ serviceId });
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to toggle service status"
        );
      }
    },
    [toggleActive]
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState
          title="No organization selected"
          description="Please select an organization to manage services."
        />
      </Screen>
    );
  }

  if (services === undefined) {
    return <LoadingScreen message="Loading services..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title="Services"
        onBack={() => router.back()}
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/services/new/edit")}
            className="rounded-full p-2"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View className="px-4 pb-3">
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search services..."
        />
      </View>

      {/* Service List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No services"
            description="Add your first service to get started."
            icon={<Scissors size={32} color={theme.colors.textSecondary} />}
            action={{
              label: "Add Service",
              onPress: () => router.push("/services/new/edit"),
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/services/${item._id}/edit`)}
            activeOpacity={0.7}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    className="mt-0.5 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row items-center">
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text
                    className="ml-1 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {item.durationMinutes} min
                  </Text>
                  <View
                    className="mx-2 h-1 w-1 rounded-full"
                    style={{ backgroundColor: theme.colors.border }}
                  />
                  <PriceDisplay
                    amount={item.price}
                    currency={item.currency}
                    size="sm"
                  />
                </View>
              </View>

              <View className="items-end" style={{ gap: 8 }}>
                <Badge
                  variant={item.isActive ? "success" : "default"}
                  label={item.isActive ? "Active" : "Inactive"}
                />
                <Switch
                  value={item.isActive}
                  onValueChange={() =>
                    handleToggleActive(item._id as Id<"services">)
                  }
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/services/new/edit")}
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: theme.colors.primary, elevation: 8 }}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </Screen>
  );
}
