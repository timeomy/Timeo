import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ticket, Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";

function getTypeLabel(type: string): string {
  switch (type) {
    case "percentage":
      return "Percentage";
    case "fixed":
      return "Fixed Amount";
    case "free_session":
      return "Free Session";
    default:
      return type;
  }
}

function getTypeVariant(type: string): "default" | "success" | "warning" | "error" {
  switch (type) {
    case "percentage":
      return "default";
    case "fixed":
      return "success";
    case "free_session":
      return "warning";
    default:
      return "default";
  }
}

function formatValue(type: string, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed") return `RM ${(value / 100).toFixed(2)}`;
  return "Free";
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VouchersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = activeTenantId as string;

  const vouchers = useQuery(
    api.vouchers.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const filteredVouchers = useMemo(() => {
    if (!vouchers) return [];
    if (showActiveOnly) return vouchers.filter((v) => v.isActive);
    return vouchers;
  }, [vouchers, showActiveOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Vouchers" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (vouchers === undefined) {
    return <LoadingScreen message="Loading vouchers..." />;
  }

  const renderVoucher = ({ item }: { item: (typeof filteredVouchers)[0] }) => (
    <Card
      className="mb-3"
      onPress={() => router.push(`/vouchers/${item._id}` as any)}
    >
      <Row justify="between" align="start">
        <View className="flex-1">
          <Text
            className="text-base font-bold"
            style={{ color: theme.colors.text, fontFamily: "monospace" }}
          >
            {item.code}
          </Text>
          <Spacer size={4} />
          <Row gap={6}>
            <Badge label={getTypeLabel(item.type)} variant={getTypeVariant(item.type)} />
            <Badge
              label={item.isActive ? "Active" : "Inactive"}
              variant={item.isActive ? "success" : "error"}
            />
          </Row>
          <Spacer size={6} />
          {item.source ? (
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Source: {item.source}
              {item.partnerName ? ` (${item.partnerName})` : ""}
            </Text>
          ) : null}
          {item.description ? (
            <Text
              className="mt-1 text-xs"
              style={{ color: theme.colors.textSecondary }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}
          <Text
            className="mt-1 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            {formatValue(item.type, item.value)}
          </Text>
          <Text
            className="mt-1 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {item.usedCount}/{item.maxUses ?? "\u221E"} used
          </Text>
          {item.expiresAt ? (
            <Text
              className="mt-1 text-xs"
              style={{
                color:
                  item.expiresAt < Date.now()
                    ? theme.colors.error
                    : theme.colors.textSecondary,
              }}
            >
              {item.expiresAt < Date.now() ? "Expired" : `Exp: ${formatDate(item.expiresAt)}`}
            </Text>
          ) : null}
        </View>
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header title="Vouchers" onBack={() => router.back()} />
      <View className="px-4">
        <Button onPress={() => router.push("/vouchers/create" as any)}>
          <Row align="center" gap={8}>
            <Plus size={18} color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">
              Create Voucher
            </Text>
          </Row>
        </Button>
        <Spacer size={12} />

        {/* Active/All Toggle */}
        <Row gap={8}>
          <Card
            onPress={() => setShowActiveOnly(false)}
            className="px-3 py-2"
            style={
              !showActiveOnly
                ? { backgroundColor: theme.colors.primary + "15" }
                : undefined
            }
          >
            <Text
              className="text-sm font-medium"
              style={{
                color: !showActiveOnly
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              }}
            >
              All
            </Text>
          </Card>
          <Card
            onPress={() => setShowActiveOnly(true)}
            className="px-3 py-2"
            style={
              showActiveOnly
                ? { backgroundColor: theme.colors.primary + "15" }
                : undefined
            }
          >
            <Text
              className="text-sm font-medium"
              style={{
                color: showActiveOnly
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              }}
            >
              Active Only
            </Text>
          </Card>
        </Row>

        <Spacer size={8} />
        <Text
          className="text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          {filteredVouchers.length} voucher{filteredVouchers.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredVouchers}
        keyExtractor={(item) => item._id}
        renderItem={renderVoucher}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No vouchers found"
            description={
              showActiveOnly
                ? "No active vouchers. Try showing all vouchers."
                : "Create your first voucher to get started."
            }
            icon={<Ticket size={32} color={theme.colors.textSecondary} />}
          />
        }
      />
    </Screen>
  );
}
