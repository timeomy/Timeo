import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTenantSwitcher } from "../hooks";
import type { TenantInfo } from "../types";

interface TenantSelectScreenProps {
  /** Called after a tenant is selected */
  onSelect?: (tenant: TenantInfo) => void;
}

export function TenantSelectScreen({ onSelect }: TenantSelectScreenProps) {
  const { tenants, activeTenant, switchTenant, isLoading } = useTenantSwitcher();

  const handleSelect = async (tenant: TenantInfo) => {
    await switchTenant(tenant.id);
    onSelect?.(tenant);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your organizations...</Text>
      </View>
    );
  }

  if (tenants.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No organizations</Text>
        <Text style={styles.emptySubtitle}>
          You haven't been added to any organization yet.
        </Text>
      </View>
    );
  }

  const renderTenant = ({ item }: { item: TenantInfo }) => {
    const isActive = item.id === activeTenant?.id;

    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardRole}>{item.role}</Text>
        </View>
        {isActive && <Text style={styles.activeBadge}>Active</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Organization</Text>
      <Text style={styles.subtitle}>
        Choose which organization to work with
      </Text>

      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        renderItem={renderTenant}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
  },
  cardActive: {
    borderColor: "#111827",
    backgroundColor: "#f9fafb",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardRole: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
    textTransform: "capitalize",
  },
  activeBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
