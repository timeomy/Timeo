import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  LoadingScreen,
  Toast,
  Section,
  Row,
  Spacer,
  Separator,
  useTheme,
} from "@timeo/ui";
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { usePayments } from "@timeo/api-client";

function getStatusColor(status: string, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case "completed":
      return theme.colors.success;
    case "failed":
      return theme.colors.error;
    case "refunded":
      return theme.colors.warning;
    case "pending":
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "failed":
      return XCircle;
    case "pending":
      return Clock;
    default:
      return DollarSign;
  }
}

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "refunded":
      return "warning";
    case "pending":
      return "info";
    default:
      return "default";
  }
}

function formatCents(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: payments, isLoading } = usePayments(tenantId);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Payments" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading payments..." />;
  }

  const paymentList = payments ?? [];

  return (
    <Screen scroll={false}>
      <Header title="Payments" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Summary Cards */}
        <Row gap={12} className="mb-4">
          <Card className="flex-1">
            <View className="items-center py-3">
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                Total Received
              </Text>
              <Text
                className="mt-1 text-lg font-bold"
                style={{ color: theme.colors.success }}
              >
                {formatCents(
                  paymentList
                    .filter((p) => p.status === "completed")
                    .reduce((sum, p) => sum + p.amount, 0),
                  "MYR"
                )}
              </Text>
            </View>
          </Card>
          <Card className="flex-1">
            <View className="items-center py-3">
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                Refunded
              </Text>
              <Text
                className="mt-1 text-lg font-bold"
                style={{ color: theme.colors.warning }}
              >
                {formatCents(
                  paymentList
                    .filter((p) => p.status === "refunded")
                    .reduce((sum, p) => sum + p.amount, 0),
                  "MYR"
                )}
              </Text>
            </View>
          </Card>
        </Row>

        <Separator className="mb-4" />

        {/* Payment List */}
        {paymentList.length === 0 ? (
          <View className="items-center justify-center py-16">
            <CreditCard size={48} color={theme.colors.textSecondary + "50"} />
            <Text
              className="mt-4 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              No payments yet
            </Text>
            <Text
              className="mt-1 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Payments will appear here once customers make purchases.
            </Text>
          </View>
        ) : (
          <Section title={`${paymentList.length} Payments`}>
            {paymentList.map((payment) => {
              const StatusIcon = getStatusIcon(payment.status);
              const statusColor = getStatusColor(payment.status, theme);

              return (
                <Card key={payment.id} className="mb-3">
                  <Row justify="between" align="start">
                    <Row align="center" gap={12} className="flex-1">
                      <View
                        className="h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: statusColor + "15" }}
                      >
                        <StatusIcon size={20} color={statusColor} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.colors.text }}
                        >
                          {payment.provider} · {payment.method ?? "—"}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatDate(payment.createdAt)}
                        </Text>
                        <View className="mt-1">
                          <Badge
                            label={payment.status}
                            variant={getStatusVariant(payment.status)}
                          />
                        </View>
                      </View>
                    </Row>
                    <View className="items-end">
                      <Text
                        className="text-base font-bold"
                        style={{ color: theme.colors.text }}
                      >
                        {formatCents(payment.amount, payment.currency)}
                      </Text>
                    </View>
                  </Row>
                </Card>
              );
            })}
          </Section>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
