import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ticket } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useVouchers } from "@timeo/api-client";
import {
  Screen,
  Header,
  Badge,
  Spacer,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function getTypeLabel(type: string): string {
  switch (type) {
    case "percentage":
      return "Percentage";
    case "fixed":
      return "Fixed Amount";
    default:
      return type ?? "Discount";
  }
}

function getTypeVariant(type: string): "default" | "success" | "warning" {
  switch (type) {
    case "percentage":
      return "default";
    case "fixed":
      return "success";
    default:
      return "warning";
  }
}

function formatValue(voucher: { discountType?: string; discountValue: number }): string {
  if (voucher.discountType === "percentage") return `${voucher.discountValue}%`;
  return `RM ${(voucher.discountValue / 100).toFixed(2)}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VouchersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const { data: vouchers, isLoading, refetch, isRefetching } = useVouchers(tenantId);

  const filteredVouchers = useMemo(() => {
    if (!vouchers) return [];
    if (showActiveOnly) return vouchers.filter((v) => v.isActive);
    return vouchers;
  }, [vouchers, showActiveOnly]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Vouchers" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading vouchers..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Vouchers" onBack={() => router.back()} />

      <View className="px-4">
        {/* Active/All Toggle */}
        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowActiveOnly(false)}
            className="rounded-xl px-3 py-2"
            style={{
              backgroundColor: !showActiveOnly ? theme.colors.primary + "20" : theme.colors.surface,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: !showActiveOnly ? theme.colors.primary : theme.colors.textSecondary }}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowActiveOnly(true)}
            className="rounded-xl px-3 py-2"
            style={{
              backgroundColor: showActiveOnly ? theme.colors.primary + "20" : theme.colors.surface,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: showActiveOnly ? theme.colors.primary : theme.colors.textSecondary }}
            >
              Active Only
            </Text>
          </TouchableOpacity>
        </View>

        <Spacer size={8} />
        <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
          {filteredVouchers.length} voucher{filteredVouchers.length !== 1 ? "s" : ""}
        </Text>
        <Spacer size={12} />
      </View>

      <FlatList
        data={filteredVouchers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.colors.primary} />}
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
        renderItem={({ item }) => (
          <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text, fontFamily: "monospace" }}
                >
                  {item.code}
                </Text>
                <View className="mt-1 flex-row" style={{ gap: 6 }}>
                  <Badge
                    label={getTypeLabel(item.discountType)}
                    variant={getTypeVariant(item.discountType)}
                  />
                  <Badge
                    label={item.isActive ? "Active" : "Inactive"}
                    variant={item.isActive ? "success" : "error"}
                  />
                </View>
                {item.description ? (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {formatValue(item)}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                  {item.usedCount}/{item.maxUses ?? "\u221E"} used
                </Text>
                {item.expiresAt && (
                  <Text
                    className="mt-1 text-xs"
                    style={{
                      color:
                        new Date(item.expiresAt).getTime() < Date.now()
                          ? theme.colors.error
                          : theme.colors.textSecondary,
                    }}
                  >
                    {new Date(item.expiresAt).getTime() < Date.now()
                      ? "Expired"
                      : `Exp: ${formatDate(item.expiresAt)}`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
