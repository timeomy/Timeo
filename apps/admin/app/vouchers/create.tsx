import React, { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Input,
  Select,
  Button,
  Spacer,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useMutation } from "convex/react";

const TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Free Session", value: "free_session" },
];

const SOURCE_OPTIONS = [
  { label: "Internal", value: "internal" },
  { label: "Partner", value: "partner" },
  { label: "Public", value: "public" },
];

export default function CreateVoucherScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const createVoucher = useMutation(api.vouchers.create);

  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [source, setSource] = useState("internal");
  const [partnerName, setPartnerName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const handleCreate = useCallback(async () => {
    if (!code.trim()) {
      setToast({
        message: "Please enter a voucher code",
        type: "error",
        visible: true,
      });
      return;
    }

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setToast({
        message: "Please enter a valid value",
        type: "error",
        visible: true,
      });
      return;
    }

    // For fixed type, convert RM to cents
    const finalValue = type === "fixed" ? Math.round(parsedValue * 100) : parsedValue;

    const parsedMaxUses = maxUses ? parseInt(maxUses, 10) : undefined;
    if (maxUses && (isNaN(parsedMaxUses!) || parsedMaxUses! <= 0)) {
      setToast({
        message: "Max uses must be a positive number",
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);
    try {
      await createVoucher({
        tenantId: tenantId as any,
        code: code.trim(),
        type: type as any,
        value: finalValue,
        maxUses: parsedMaxUses,
        source: source as any,
        partnerName: source === "partner" ? partnerName.trim() || undefined : undefined,
        description: description.trim() || undefined,
      });

      setToast({
        message: "Voucher created successfully",
        type: "success",
        visible: true,
      });
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "Failed to create voucher";
      setToast({ message: errMessage, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [code, type, value, maxUses, source, partnerName, description, tenantId, createVoucher, router]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Create Voucher" onBack={() => router.back()} />
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

  return (
    <Screen scroll>
      <Header title="Create Voucher" onBack={() => router.back()} />

      <Card className="mb-4">
        <Input
          label="Voucher Code"
          value={code}
          onChangeText={setCode}
          placeholder="e.g., SUMMER2026"
          autoCapitalize="characters"
          className="mb-4"
        />

        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          className="mb-4"
        />

        <Input
          label={type === "percentage" ? "Value (%)" : type === "fixed" ? "Value (RM)" : "Value"}
          value={value}
          onChangeText={setValue}
          placeholder={type === "percentage" ? "10" : "25.00"}
          keyboardType="decimal-pad"
          className="mb-4"
        />

        <Input
          label="Max Uses (optional)"
          value={maxUses}
          onChangeText={setMaxUses}
          placeholder="Unlimited if empty"
          keyboardType="number-pad"
          className="mb-4"
        />

        <Select
          label="Source"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
          className="mb-4"
        />

        {source === "partner" && (
          <Input
            label="Partner Name"
            value={partnerName}
            onChangeText={setPartnerName}
            placeholder="Partner company name"
            className="mb-4"
          />
        )}

        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the voucher purpose"
          multiline
          numberOfLines={3}
          className="mb-4"
        />
      </Card>

      <Button onPress={handleCreate} loading={saving}>
        Create Voucher
      </Button>

      <Spacer size={20} />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
