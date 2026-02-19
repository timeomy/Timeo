import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  LoadingScreen,
  Section,
  Row,
  Separator,
  useTheme,
} from "@timeo/ui";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ArrowLeft,
  Send,
  AlertTriangle,
} from "lucide-react-native";
import { useRouter } from "expo-router";

type EInvoiceStatus =
  | "draft"
  | "pending"
  | "submitted"
  | "valid"
  | "invalid"
  | "cancelled";

function getStatusColor(status: EInvoiceStatus, theme: any) {
  switch (status) {
    case "valid":
      return theme.colors.success;
    case "invalid":
      return theme.colors.error;
    case "cancelled":
      return theme.colors.textSecondary;
    case "submitted":
      return theme.colors.primary;
    case "pending":
    case "draft":
      return theme.colors.warning;
    default:
      return theme.colors.textSecondary;
  }
}

function getStatusIcon(status: EInvoiceStatus) {
  switch (status) {
    case "valid":
      return CheckCircle2;
    case "invalid":
      return XCircle;
    case "cancelled":
      return Ban;
    case "submitted":
      return Send;
    case "pending":
      return Clock;
    case "draft":
      return FileText;
    default:
      return FileText;
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
  });
}

const STATUS_FILTERS: Array<{ label: string; value: EInvoiceStatus | "all" }> =
  [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Valid", value: "valid" },
    { label: "Invalid", value: "invalid" },
    { label: "Cancelled", value: "cancelled" },
  ];

export default function EInvoiceListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [statusFilter, setStatusFilter] = useState<EInvoiceStatus | "all">(
    "all"
  );

  const einvoices = useQuery(
    api.einvoice.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const stats = useQuery(
    api.einvoice.getStats,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header
          title="E-Invoices"
          leftAction={{ onPress: () => router.back() }}
        />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (einvoices === undefined || stats === undefined) {
    return <LoadingScreen message="Loading e-invoices..." />;
  }

  const filteredInvoices =
    statusFilter === "all"
      ? einvoices
      : einvoices.filter((inv) => inv.status === statusFilter);

  return (
    <Screen scroll={false}>
      <Header
        title="E-Invoices"
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
        <Row gap={12} className="mb-3">
          <Card className="flex-1">
            <View className="items-center py-3">
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                Validated
              </Text>
              <Text
                className="mt-1 text-lg font-bold"
                style={{ color: theme.colors.success }}
              >
                {stats.valid}
              </Text>
            </View>
          </Card>
          <Card className="flex-1">
            <View className="items-center py-3">
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                Tax Collected
              </Text>
              <Text
                className="mt-1 text-lg font-bold"
                style={{ color: theme.colors.primary }}
              >
                {formatCents(stats.totalTaxCents, "MYR")}
              </Text>
            </View>
          </Card>
          <Card className="flex-1">
            <View className="items-center py-3">
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                Pending
              </Text>
              <Text
                className="mt-1 text-lg font-bold"
                style={{ color: theme.colors.warning }}
              >
                {stats.draft + stats.pending + stats.submitted}
              </Text>
            </View>
          </Card>
        </Row>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
              >
                <View
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.colors.surface,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isActive ? "#FFFFFF" : theme.colors.textSecondary,
                    }}
                  >
                    {filter.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Separator className="mb-4" />

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <View className="items-center justify-center py-16">
            <FileText size={48} color={theme.colors.textSecondary + "50"} />
            <Text
              className="mt-4 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              No e-invoices
            </Text>
            <Text
              className="mt-1 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {statusFilter === "all"
                ? "E-invoices will appear here once created."
                : `No ${statusFilter} e-invoices found.`}
            </Text>
          </View>
        ) : (
          <Section title={`${filteredInvoices.length} E-Invoices`}>
            {filteredInvoices.map((invoice) => {
              const StatusIcon = getStatusIcon(invoice.status as EInvoiceStatus);
              const statusColor = getStatusColor(
                invoice.status as EInvoiceStatus,
                theme
              );

              return (
                <TouchableOpacity
                  key={invoice._id}
                  onPress={() => router.push(`/einvoice/${invoice._id}`)}
                >
                  <Card className="mb-3">
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
                            {invoice.invoiceNumber}
                          </Text>
                          <Text
                            className="text-xs"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {invoice.buyerName}
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
                                {invoice.status}
                              </Text>
                            </View>
                            <Text
                              className="text-xs"
                              style={{ color: theme.colors.textSecondary }}
                            >
                              {formatDate(invoice.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </Row>
                      <View className="items-end">
                        <Text
                          className="text-base font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {formatCents(invoice.totalAmount, invoice.currency)}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          Tax: {formatCents(invoice.taxAmount, invoice.currency)}
                        </Text>
                      </View>
                    </Row>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}
