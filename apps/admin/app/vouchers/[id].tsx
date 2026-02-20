import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Row,
  Spacer,
  Separator,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

const SOURCE_OPTIONS = [
  { label: "Internal", value: "internal" },
  { label: "Partner", value: "partner" },
  { label: "Public", value: "public" },
];

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VoucherDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const vouchers = useQuery(
    api.vouchers.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const redemptions = useQuery(
    api.vouchers.listRedemptions,
    tenantId && id
      ? { tenantId: tenantId as any, voucherId: id as any }
      : "skip"
  );

  const updateVoucher = useMutation(api.vouchers.update);
  const toggleActive = useMutation(api.vouchers.toggleActive);

  const voucher = useMemo(() => {
    if (!vouchers) return null;
    return vouchers.find((v) => v._id === id) ?? null;
  }, [vouchers, id]);

  // Editable fields
  const [editValue, setEditValue] = useState("");
  const [editMaxUses, setEditMaxUses] = useState("");
  const [editSource, setEditSource] = useState("internal");
  const [editPartnerName, setEditPartnerName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  useEffect(() => {
    if (voucher && !initialized) {
      if (voucher.type === "fixed") {
        setEditValue(String(voucher.value / 100));
      } else {
        setEditValue(String(voucher.value));
      }
      setEditMaxUses(voucher.maxUses ? String(voucher.maxUses) : "");
      setEditSource(voucher.source ?? "internal");
      setEditPartnerName(voucher.partnerName ?? "");
      setEditDescription(voucher.description ?? "");
      setInitialized(true);
    }
  }, [voucher, initialized]);

  const handleSave = useCallback(async () => {
    const parsedValue = parseFloat(editValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setToast({
        message: "Please enter a valid value",
        type: "error",
        visible: true,
      });
      return;
    }

    const finalValue =
      voucher?.type === "fixed" ? Math.round(parsedValue * 100) : parsedValue;

    const parsedMaxUses = editMaxUses ? parseInt(editMaxUses, 10) : undefined;
    if (editMaxUses && (isNaN(parsedMaxUses!) || parsedMaxUses! <= 0)) {
      setToast({
        message: "Max uses must be a positive number",
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);
    try {
      await updateVoucher({
        voucherId: id as any,
        value: finalValue,
        maxUses: parsedMaxUses,
        source: editSource as any,
        partnerName:
          editSource === "partner"
            ? editPartnerName.trim() || undefined
            : undefined,
        description: editDescription.trim() || undefined,
      });
      setToast({
        message: "Voucher updated",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update voucher";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [
    editValue,
    editMaxUses,
    editSource,
    editPartnerName,
    editDescription,
    voucher,
    id,
    updateVoucher,
  ]);

  const handleToggleActive = useCallback(async () => {
    setToggling(true);
    try {
      await toggleActive({ voucherId: id as any });
      setToast({
        message: voucher?.isActive
          ? "Voucher deactivated"
          : "Voucher activated",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to toggle voucher";
      setToast({ message, type: "error", visible: true });
    } finally {
      setToggling(false);
    }
  }, [id, voucher, toggleActive]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Voucher" onBack={() => router.back()} />
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
    return <LoadingScreen message="Loading voucher..." />;
  }

  if (!voucher) {
    return (
      <Screen>
        <Header title="Voucher" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            Voucher not found.
          </Text>
        </View>
      </Screen>
    );
  }

  const renderRedemption = ({ item }: { item: any }) => (
    <Card className="mb-2">
      <Row justify="between" align="center">
        <View>
          <Text
            className="text-sm font-semibold"
            style={{ color: theme.colors.text }}
          >
            {item.userName}
          </Text>
          <Text
            className="text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {formatDate(item.redeemedAt)}
          </Text>
        </View>
        <Text
          className="text-sm font-bold"
          style={{ color: theme.colors.success }}
        >
          -RM {(item.discountAmount / 100).toFixed(2)}
        </Text>
      </Row>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Header title="Voucher Details" onBack={() => router.back()} />

      <FlatList
        data={redemptions ?? []}
        keyExtractor={(item) => item._id}
        renderItem={renderRedemption}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Voucher Info */}
            <Card className="mb-4">
              <View className="items-center py-2">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.colors.text, fontFamily: "monospace" }}
                >
                  {voucher.code}
                </Text>
                <Spacer size={4} />
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Code (read-only)
                </Text>
                <Spacer size={8} />
                <Row gap={6}>
                  <Badge label={getTypeLabel(voucher.type)} variant="default" />
                  <Badge
                    label={voucher.isActive ? "Active" : "Inactive"}
                    variant={voucher.isActive ? "success" : "error"}
                  />
                </Row>
              </View>

              <Separator className="my-3" />

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Value
                </Text>
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text }}
                >
                  {formatValue(voucher.type, voucher.value)}
                </Text>
              </Row>

              <Row justify="between" className="mb-2">
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Usage
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.text }}
                >
                  {voucher.usedCount}/{voucher.maxUses ?? "\u221E"}
                </Text>
              </Row>

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
                  {formatDate(voucher.createdAt)}
                </Text>
              </Row>

              {voucher.expiresAt ? (
                <Row justify="between" className="mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Expires
                  </Text>
                  <Text
                    className="text-sm"
                    style={{
                      color:
                        voucher.expiresAt < Date.now()
                          ? theme.colors.error
                          : theme.colors.text,
                    }}
                  >
                    {formatDate(voucher.expiresAt)}
                  </Text>
                </Row>
              ) : null}
            </Card>

            {/* Edit Fields */}
            <Card className="mb-4">
              <Text
                className="mb-3 text-base font-semibold"
                style={{ color: theme.colors.text }}
              >
                Edit Voucher
              </Text>

              <Input
                label={
                  voucher.type === "percentage"
                    ? "Value (%)"
                    : voucher.type === "fixed"
                      ? "Value (RM)"
                      : "Value"
                }
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="decimal-pad"
                className="mb-4"
              />

              <Input
                label="Max Uses (blank = unlimited)"
                value={editMaxUses}
                onChangeText={setEditMaxUses}
                keyboardType="number-pad"
                placeholder="Unlimited"
                className="mb-4"
              />

              <Select
                label="Source"
                options={SOURCE_OPTIONS}
                value={editSource}
                onChange={setEditSource}
                className="mb-4"
              />

              {editSource === "partner" && (
                <Input
                  label="Partner Name"
                  value={editPartnerName}
                  onChangeText={setEditPartnerName}
                  placeholder="Partner company name"
                  className="mb-4"
                />
              )}

              <Input
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Voucher description"
                multiline
                numberOfLines={3}
                className="mb-4"
              />

              <Button onPress={handleSave} loading={saving}>
                Save Changes
              </Button>
            </Card>

            {/* Toggle Active */}
            <View className="mb-4">
              <Button
                variant={voucher.isActive ? "destructive" : "default"}
                onPress={handleToggleActive}
                loading={toggling}
              >
                {voucher.isActive ? "Deactivate Voucher" : "Activate Voucher"}
              </Button>
            </View>

            <Separator className="mb-3" />

            <Text
              className="mb-3 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              Redemption History
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              No redemptions yet.
            </Text>
          </View>
        }
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
