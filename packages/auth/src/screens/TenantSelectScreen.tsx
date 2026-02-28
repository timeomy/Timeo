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

  const handleSelect = (tenant: TenantInfo) => {
    switchTenant(tenant.id);
    onSelect?.(tenant);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFB300" />
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
    backgroundColor: "#0B0B0F",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0B0B0F",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#EDECE8",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#88878F",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#88878F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#252530",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#131318",
  },
  cardActive: {
    borderColor: "#FFB300",
    backgroundColor: "#1A1A22",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFB300",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  invitationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFB30040",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#0B0B0F",
    fontSize: 18,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EDECE8",
  },
  cardRole: {
    fontSize: 13,
    color: "#88878F",
    marginTop: 2,
    textTransform: "capitalize",
  },
  activeBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    backgroundColor: "#10B98120",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFB30040",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#131318",
  },
  acceptButton: {
    backgroundColor: "#FFB300",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#0B0B0F",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 12,
    color: "#88878F",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#EDECE8",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#88878F",
    textAlign: "center",
  },
});
