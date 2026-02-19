import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useQuery, useAction } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Button,
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
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";

function getStatusColor(status: string, theme: any) {
  switch (status) {
    case "succeeded":
      return theme.colors.success;
    case "failed":
      return theme.colors.error;
    case "refunded":
      return theme.colors.warning;
    case "pending":
    case "processing":
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "succeeded":
      return CheckCircle2;
    case "failed":
      return XCircle;
    case "pending":
    case "processing":
      return Clock;
    case "refunded":
      return RotateCcw;
    default:
      return DollarSign;
  }
}

function formatCents(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
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

  const refundPayment = useAction(api.payments.refundPayment);

  const payments = useQuery(
    api.payments.listPaymentsByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const [refundingId, setRefundingId] = useState<string | null>(null);

  const handleRefund = useCallback(
    (paymentId: string, amount: number, currency: string) => {
      Alert.alert(
        "Confirm Refund",
        `Are you sure you want to refund ${formatCents(amount, currency)}? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Refund",
            style: "destructive",
            onPress: async () => {
              setRefundingId(paymentId);
              try {
                await refundPayment({ paymentId: paymentId as any });
                setToast({
                  message: "Refund processed successfully",
                  type: "success",
                  visible: true,
                });
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Failed to process refund";
                setToast({ message, type: "error", visible: true });
              } finally {
                setRefundingId(null);
              }
            },
          },
        ]
      );
    },
    [refundPayment]
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Payments" leftAction={{ onPress: () => router.back() }} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (payments === undefined) {
    return <LoadingScreen message="Loading payments..." />;
  }

  return (
    <Screen scroll={false}>
      <Header
        title="Payments"
        leftAction={{
          icon: ArrowLeft,
          onPress: () => router.back(),
        }}
      />
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
                  payments
                    .filter((p) => p.status === "succeeded")
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
                  payments
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
        {payments.length === 0 ? (
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
          <Section title={`${payments.length} Payments`}>
            {payments.map((payment) => {
              const StatusIcon = getStatusIcon(payment.status);
              const statusColor = getStatusColor(payment.status, theme);

              return (
                <Card key={payment._id} className="mb-3">
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
                          {payment.customerName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatDate(payment.createdAt)}
                        </Text>
                        <View className="mt-1 flex-row items-center gap-2">
                          <View
                            className="rounded-full px-2 py-0.5"
                            style={{ backgroundColor: statusColor + "15" }}
                          >
                            <Text
                              className="text-xs font-medium capitalize"
                              style={{ color: statusColor }}
                            >
                              {payment.status}
                            </Text>
                          </View>
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
                      {payment.status === "succeeded" && (
                        <TouchableOpacity
                          onPress={() =>
                            handleRefund(
                              payment._id,
                              payment.amount,
                              payment.currency
                            )
                          }
                          disabled={refundingId === payment._id}
                          className="mt-2"
                        >
                          <View
                            className="flex-row items-center gap-1 rounded px-2 py-1"
                            style={{ backgroundColor: theme.colors.error + "10" }}
                          >
                            <RotateCcw size={12} color={theme.colors.error} />
                            <Text
                              className="text-xs font-medium"
                              style={{ color: theme.colors.error }}
                            >
                              {refundingId === payment._id
                                ? "Refunding..."
                                : "Refund"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
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
