import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Button,
  LoadingScreen,
  Toast,
  Section,
  Row,
  Separator,
  useTheme,
} from "@timeo/ui";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  Send,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

function getStatusColor(status: string, theme: any) {
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

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <Row justify="between" className="py-2">
      <Text
        className="text-sm"
        style={{ color: theme.colors.textSecondary }}
      >
        {label}
      </Text>
      <Text
        className="text-sm font-medium"
        style={{ color: theme.colors.text }}
      >
        {value}
      </Text>
    </Row>
  );
}

export default function EInvoiceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const einvoice = useQuery(
    api.einvoice.getById,
    id ? { einvoiceId: id as any } : "skip"
  );

  const cancelMutation = useMutation(api.einvoice.markCancelled);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const [cancelling, setCancelling] = useState(false);

  const handleCancel = useCallback(() => {
    if (!einvoice) return;

    Alert.prompt(
      "Cancel E-Invoice",
      "Enter a reason for cancellation (required, max 300 characters):",
      [
        { text: "Back", style: "cancel" },
        {
          text: "Cancel Invoice",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              setToast({
                message: "Cancellation reason is required",
                type: "error",
                visible: true,
              });
              return;
            }
            setCancelling(true);
            try {
              await cancelMutation({
                einvoiceId: einvoice._id,
                reason: reason.trim(),
              });
              setToast({
                message: "E-invoice cancelled successfully",
                type: "success",
                visible: true,
              });
            } catch (err) {
              setToast({
                message:
                  err instanceof Error
                    ? err.message
                    : "Failed to cancel e-invoice",
                type: "error",
                visible: true,
              });
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
      "plain-text"
    );
  }, [einvoice, cancelMutation]);

  const handleCopyUuid = useCallback(async () => {
    if (einvoice?.myinvoisUuid) {
      await Clipboard.setStringAsync(einvoice.myinvoisUuid);
      setToast({
        message: "UUID copied to clipboard",
        type: "success",
        visible: true,
      });
    }
  }, [einvoice]);

  if (!id) {
    return (
      <Screen>
        <Header
          title="E-Invoice"
          leftAction={{ icon: ArrowLeft, onPress: () => router.back() }}
        />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            Invalid e-invoice ID
          </Text>
        </View>
      </Screen>
    );
  }

  if (einvoice === undefined) {
    return <LoadingScreen message="Loading e-invoice..." />;
  }

  if (einvoice === null) {
    return (
      <Screen>
        <Header
          title="E-Invoice"
          leftAction={{ icon: ArrowLeft, onPress: () => router.back() }}
        />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            E-invoice not found
          </Text>
        </View>
      </Screen>
    );
  }

  const statusColor = getStatusColor(einvoice.status, theme);
  const canCancel =
    einvoice.status === "valid" &&
    einvoice.validatedAt &&
    Date.now() - einvoice.validatedAt < 72 * 60 * 60 * 1000;

  return (
    <Screen scroll={false}>
      <Header
        title={einvoice.invoiceNumber}
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
        {/* Status Banner */}
        <Card className="mb-4">
          <View className="items-center py-4">
            <View
              className="mb-3 h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: statusColor + "15" }}
            >
              {einvoice.status === "valid" && (
                <CheckCircle2 size={32} color={statusColor} />
              )}
              {einvoice.status === "invalid" && (
                <XCircle size={32} color={statusColor} />
              )}
              {einvoice.status === "cancelled" && (
                <Ban size={32} color={statusColor} />
              )}
              {einvoice.status === "submitted" && (
                <Send size={32} color={statusColor} />
              )}
              {(einvoice.status === "draft" ||
                einvoice.status === "pending") && (
                <Clock size={32} color={statusColor} />
              )}
            </View>
            <View
              className="rounded-full px-4 py-1"
              style={{ backgroundColor: statusColor + "15" }}
            >
              <Text
                className="text-sm font-bold capitalize"
                style={{ color: statusColor }}
              >
                {einvoice.status}
              </Text>
            </View>
            <Text
              className="mt-3 text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              {formatCents(einvoice.totalAmount, einvoice.currency)}
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Tax: {formatCents(einvoice.taxAmount, einvoice.currency)}
            </Text>
          </View>
        </Card>

        {/* Invoice Details */}
        <Section title="Invoice Details">
          <Card>
            <DetailRow
              label="Invoice No."
              value={einvoice.invoiceNumber}
              theme={theme}
            />
            <Separator />
            <DetailRow
              label="Buyer"
              value={einvoice.buyerName}
              theme={theme}
            />
            <Separator />
            <DetailRow
              label="Buyer TIN"
              value={einvoice.buyerTin}
              theme={theme}
            />
            <Separator />
            <DetailRow
              label="Supplier TIN"
              value={einvoice.supplierTin}
              theme={theme}
            />
            <Separator />
            <DetailRow
              label="Created"
              value={formatDate(einvoice.createdAt)}
              theme={theme}
            />
            {einvoice.submittedAt && (
              <>
                <Separator />
                <DetailRow
                  label="Submitted"
                  value={formatDate(einvoice.submittedAt)}
                  theme={theme}
                />
              </>
            )}
            {einvoice.validatedAt && (
              <>
                <Separator />
                <DetailRow
                  label="Validated"
                  value={formatDate(einvoice.validatedAt)}
                  theme={theme}
                />
              </>
            )}
            {einvoice.cancelledAt && (
              <>
                <Separator />
                <DetailRow
                  label="Cancelled"
                  value={formatDate(einvoice.cancelledAt)}
                  theme={theme}
                />
              </>
            )}
          </Card>
        </Section>

        {/* MyInvois Reference */}
        {einvoice.myinvoisUuid && (
          <Section title="MyInvois Reference">
            <Card>
              <Row justify="between" align="center" className="py-2">
                <View className="flex-1">
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Document UUID
                  </Text>
                  <Text
                    className="mt-0.5 text-xs font-mono"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                  >
                    {einvoice.myinvoisUuid}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={handleCopyUuid}
                  icon={Copy}
                />
              </Row>
              {einvoice.myinvoisSubmissionUid && (
                <>
                  <Separator />
                  <DetailRow
                    label="Submission UID"
                    value={einvoice.myinvoisSubmissionUid}
                    theme={theme}
                  />
                </>
              )}
            </Card>
          </Section>
        )}

        {/* Validation Errors */}
        {einvoice.status === "invalid" && einvoice.validationErrors && (
          <Section title="Validation Errors">
            <Card>
              <View className="flex-row items-start gap-3 py-2">
                <AlertTriangle size={20} color={theme.colors.error} />
                <View className="flex-1">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.error }}
                  >
                    {typeof einvoice.validationErrors === "string"
                      ? einvoice.validationErrors
                      : JSON.stringify(einvoice.validationErrors, null, 2)}
                  </Text>
                </View>
              </View>
            </Card>
          </Section>
        )}

        {/* Cancellation Reason */}
        {einvoice.status === "cancelled" && einvoice.cancelReason && (
          <Section title="Cancellation Reason">
            <Card>
              <Text
                className="text-sm py-2"
                style={{ color: theme.colors.textSecondary }}
              >
                {einvoice.cancelReason}
              </Text>
            </Card>
          </Section>
        )}

        {/* Actions */}
        {canCancel && (
          <View className="mt-4">
            <Button
              variant="destructive"
              onPress={handleCancel}
              loading={cancelling}
              disabled={cancelling}
            >
              Cancel E-Invoice
            </Button>
          </View>
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
