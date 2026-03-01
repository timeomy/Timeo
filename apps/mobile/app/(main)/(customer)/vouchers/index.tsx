import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ticket, Tag, Percent } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useVouchers } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function formatRedemptionDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDiscount(type: string | undefined, value: number | undefined): string {
  if (!type || value == null) return "";
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed") {
    return `RM ${(value / 100).toFixed(2)} off`;
  }
  if (type === "free_session") return "Free Session";
  return "";
}

export default function VouchersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: vouchers, isLoading, refetch, isRefetching } = useVouchers(tenantId);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="My Vouchers" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
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
      <Header title="My Vouchers" onBack={() => router.back()} />

      <FlatList
        data={vouchers ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 8,
          gap: 10,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No vouchers yet"
            description="Redeemed vouchers will appear here."
            icon={<Ticket size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start">
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                {item.discountType === "percentage" || item.voucherType === "percentage" ? (
                  <Percent size={20} color={theme.colors.primary} />
                ) : (
                  <Tag size={20} color={theme.colors.primary} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-base font-bold font-mono"
                    style={{ color: theme.colors.text }}
                  >
                    {item.voucherCode ?? item.code}
                  </Text>
                  {item.discountAmount != null && (
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.success }}
                    >
                      -RM {(item.discountAmount / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
                <Text
                  className="mt-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {formatDiscount(item.voucherType ?? item.discountType, item.voucherValue ?? item.discountValue)}
                </Text>
                {item.source === "partner" && item.partnerName ? (
                  <View className="mt-1 flex-row items-center">
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: theme.colors.info + "15" }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: theme.colors.info }}
                      >
                        Partner: {item.partnerName}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {item.description ? (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                {item.redeemedAt ? (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Redeemed {formatRedemptionDate(item.redeemedAt)}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
