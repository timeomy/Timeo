import React, { useState, useMemo, useCallback } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Input,
  Row,
  Spacer,
  Separator,
  Modal,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "pending":
      return "warning";
    case "submitted":
      return "success";
    case "rejected":
      return "error";
    default:
      return "default";
  }
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

function formatIdType(idType: string): string {
  switch (idType) {
    case "nric":
      return "NRIC";
    case "passport":
      return "Passport";
    case "brn":
      return "BRN";
    case "army":
      return "Army ID";
    default:
      return idType;
  }
}

export default function EInvoiceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const requests = useQuery(
    api.eInvoice.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const markSubmitted = useMutation(api.eInvoice.markSubmitted);
  const markRejected = useMutation(api.eInvoice.markRejected);
  const revertToPending = useMutation(api.eInvoice.revertToPending);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const request = useMemo(() => {
    if (!requests) return null;
    return requests.find((r) => r._id === id) ?? null;
  }, [requests, id]);

  const handleMarkSubmitted = useCallback(async () => {
    setLoading(true);
    try {
      await markSubmitted({ requestId: id as any });
      setToast({
        message: "Marked as submitted",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to mark as submitted";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [id, markSubmitted]);

  const handleReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      setToast({
        message: "Please provide a rejection reason",
        type: "error",
        visible: true,
      });
      return;
    }

    setLoading(true);
    try {
      await markRejected({
        requestId: id as any,
        reason: rejectionReason.trim(),
      });
      setToast({
        message: "Request rejected",
        type: "success",
        visible: true,
      });
      setRejectModalVisible(false);
      setRejectionReason("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject request";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [id, rejectionReason, markRejected]);

  const handleRevertToPending = useCallback(async () => {
    setLoading(true);
    try {
      await revertToPending({ requestId: id as any });
      setToast({
        message: "Reverted to pending",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to revert to pending";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [id, revertToPending]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="e-Invoice Request" onBack={() => router.back()} />
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

  if (requests === undefined) {
    return <LoadingScreen message="Loading request..." />;
  }

  if (!request) {
    return (
      <Screen>
        <Header title="e-Invoice Request" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            Request not found.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Header title="e-Invoice Request" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Status */}
        <Card className="mb-4">
          <View className="items-center py-2">
            <Badge
              label={request.status}
              variant={getStatusVariant(request.status)}
            />
            <Spacer size={8} />
            <Text
              className="text-lg font-bold"
              style={{ color: theme.colors.text }}
            >
              {request.receiptNumber}
            </Text>
          </View>
        </Card>

        {/* Buyer Information */}
        <Card className="mb-4">
          <Text
            className="mb-3 text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Buyer Information
          </Text>

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Name
            </Text>
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {request.buyerName}
            </Text>
          </Row>

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Email
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.buyerEmail}
            </Text>
          </Row>

          {request.buyerPhone ? (
            <Row justify="between" className="mb-2">
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Phone
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                {request.buyerPhone}
              </Text>
            </Row>
          ) : null}

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              TIN
            </Text>
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {request.buyerTin}
            </Text>
          </Row>

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              ID Type
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {formatIdType(request.buyerIdType)}
            </Text>
          </Row>

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              ID Value
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.buyerIdValue}
            </Text>
          </Row>

          {request.buyerSstRegNo ? (
            <Row justify="between" className="mb-2">
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                SST Reg No
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                {request.buyerSstRegNo}
              </Text>
            </Row>
          ) : null}
        </Card>

        {/* Address */}
        {request.buyerAddress ? (
          <Card className="mb-4">
            <Text
              className="mb-3 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              Buyer Address
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.buyerAddress.line1}
            </Text>
            {request.buyerAddress.line2 ? (
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                {request.buyerAddress.line2}
              </Text>
            ) : null}
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.buyerAddress.postcode} {request.buyerAddress.city},{" "}
              {request.buyerAddress.state}
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.buyerAddress.country}
            </Text>
          </Card>
        ) : null}

        {/* Dates */}
        <Card className="mb-4">
          <Text
            className="mb-3 text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Dates
          </Text>

          <Row justify="between" className="mb-2">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Created
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {formatDate(request.createdAt)}
            </Text>
          </Row>

          {request.submittedAt ? (
            <Row justify="between" className="mb-2">
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Submitted
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                {formatDate(request.submittedAt)}
              </Text>
            </Row>
          ) : null}
        </Card>

        {/* Rejection Reason */}
        {request.status === "rejected" && request.rejectionReason ? (
          <Card className="mb-4">
            <Text
              className="mb-2 text-base font-semibold"
              style={{ color: theme.colors.error }}
            >
              Rejection Reason
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.text }}
            >
              {request.rejectionReason}
            </Text>
          </Card>
        ) : null}

        {/* Actions */}
        <View className="mb-4">
          {request.status === "pending" && (
            <>
              <Button onPress={handleMarkSubmitted} loading={loading}>
                Mark Submitted
              </Button>
              <Spacer size={8} />
              <Button
                variant="destructive"
                onPress={() => setRejectModalVisible(true)}
                loading={loading}
              >
                Reject
              </Button>
            </>
          )}

          {request.status === "submitted" && (
            <Button onPress={handleRevertToPending} loading={loading}>
              Revert to Pending
            </Button>
          )}

          {request.status === "rejected" && (
            <Button onPress={handleRevertToPending} loading={loading}>
              Revert to Pending
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setRejectionReason("");
        }}
        title="Reject Request"
      >
        <Input
          label="Rejection Reason"
          value={rejectionReason}
          onChangeText={setRejectionReason}
          placeholder="Enter reason for rejection..."
          multiline
          numberOfLines={3}
          className="mb-4"
        />
        <Button variant="destructive" onPress={handleReject} loading={loading}>
          Confirm Rejection
        </Button>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
