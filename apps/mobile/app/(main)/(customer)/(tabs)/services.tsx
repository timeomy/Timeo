import React, { useState, useMemo, useCallback } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Briefcase } from "lucide-react-native";
import {
  Screen,
  Header,
  SearchInput,
  ServiceCard,
  LoadingScreen,
  EmptyState,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { useServices } from "@timeo/api-client";

export default function ServicesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");

  const { data: services, isLoading, refetch, isRefetching } = useServices(activeTenantId);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!search.trim()) return services;
    const query = search.toLowerCase().trim();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.description ?? "").toLowerCase().includes(query)
    );
  }, [services, search]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <LoadingScreen message="Loading services..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Services" />
      <View className="px-4 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search services..."
        />
      </View>

      {filteredServices.length === 0 ? (
        <EmptyState
          title={search ? "No results found" : "No services available"}
          description={
            search
              ? `No services match "${search}". Try a different search.`
              : "This business hasn't added any services yet."
          }
          icon={<Briefcase size={32} color={theme.colors.textSecondary} />}
          action={
            search
              ? { label: "Clear Search", onPress: () => setSearch("") }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <Spacer size={12} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ServiceCard
              name={item.name}
              description={item.description}
              duration={item.durationMinutes}
              price={item.price}
              currency={item.currency}
              onPress={() => router.push(`/services/${item.id}` as any)}
              onBook={() => router.push(`/services/${item.id}` as any)}
            />
          )}
        />
      )}
    </Screen>
  );
}
