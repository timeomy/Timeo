import { useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ticket, Tag, Percent } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  LoadingScreen,
  EmptyState,
  useTheme,
} from "@timeo/ui";

function formatRedemptionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
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
  const tenantId = activeTenantId as any;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const vouchers = useQuery(
    api.vouchers.getMyVouchers,
    tenantId ? { tenantId } : "skip"
  );

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

  if (vouchers === undefined) {
    return <LoadingScreen message="Loading vouchers..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="My Vouchers" onBack={() => router.back()} />

      <FlatList
        data={vouchers}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                {item.voucherType === "percentage" ? (
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
                    {item.voucherCode}
                  </Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.colors.success }}
                  >
                    -RM {(item.discountAmount / 100).toFixed(2)}
                  </Text>
                </View>
                <Text
                  className="mt-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {formatDiscount(item.voucherType, item.voucherValue)}
                </Text>
                <Text
                  className="mt-1 text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Redeemed {formatRedemptionDate(item.redeemedAt)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
