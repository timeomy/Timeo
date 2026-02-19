import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Input,
  Select,
  Switch,
  Button,
  Spacer,
  LoadingScreen,
  ErrorScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

const INTERVAL_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

interface MembershipFormData {
  name: string;
  description: string;
  price: string;
  interval: string;
  features: string;
  isActive: boolean;
}

const EMPTY_FORM: MembershipFormData = {
  name: "",
  description: "",
  price: "",
  interval: "monthly",
  features: "",
  isActive: true,
};

export default function MembershipEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;
  const isNew = id === "new";

  const memberships = useQuery(
    api.memberships.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const createMembership = useMutation(api.memberships.create);
  const updateMembership = useMutation(api.memberships.update);

  const existingPlan = useMemo(() => {
    if (isNew || !memberships) return null;
    return memberships.find((m) => m._id === id) ?? null;
  }, [isNew, memberships, id]);

  const [form, setForm] = useState<MembershipFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  // Populate form from existing plan
  useEffect(() => {
    if (existingPlan && !initialized) {
      setForm({
        name: existingPlan.name,
        description: existingPlan.description,
        price: String(existingPlan.price / 100),
        interval: existingPlan.interval,
        features: existingPlan.features.join("\n"),
        isActive: existingPlan.isActive,
      });
      setInitialized(true);
    }
    if (isNew && !initialized) {
      setForm(EMPTY_FORM);
      setInitialized(true);
    }
  }, [existingPlan, isNew, initialized]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setToast({
        message: "Plan name is required",
        type: "error",
        visible: true,
      });
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setToast({
        message: "Price must be a valid number",
        type: "error",
        visible: true,
      });
      return;
    }

    if (!form.interval) {
      setToast({
        message: "Please select a billing interval",
        type: "error",
        visible: true,
      });
      return;
    }

    const features = form.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (isNew) {
        await createMembership({
          tenantId: tenantId as any,
          name: form.name.trim(),
          description: form.description.trim(),
          price: Math.round(price * 100),
          interval: form.interval as any,
          features,
        });
        setToast({
          message: "Membership plan created",
          type: "success",
          visible: true,
        });
        // Navigate back after a brief delay so toast is visible
        setTimeout(() => router.back(), 1200);
      } else {
        await updateMembership({
          membershipId: id as any,
          name: form.name.trim(),
          description: form.description.trim(),
          price: Math.round(price * 100),
          interval: form.interval as any,
          features,
        });
        setToast({
          message: "Membership plan updated",
          type: "success",
          visible: true,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save membership plan";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [form, isNew, id, tenantId, createMembership, updateMembership, router]);

  if (!tenantId) {
    return (
      <Screen>
        <Header
          title={isNew ? "New Plan" : "Edit Plan"}
          onBack={() => router.back()}
        />
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

  if (!isNew && memberships === undefined) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!isNew && memberships && !existingPlan) {
    return (
      <ErrorScreen
        title="Plan not found"
        message="This membership plan could not be found."
        onRetry={() => router.back()}
      />
    );
  }

  return (
    <Screen scroll>
      <Header
        title={isNew ? "New Membership Plan" : "Edit Membership Plan"}
        onBack={() => router.back()}
      />

      <Card className="mb-4">
        <Input
          label="Plan Name"
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          placeholder="e.g., Basic, Premium, VIP"
          className="mb-4"
        />

        <Input
          label="Description"
          value={form.description}
          onChangeText={(text) =>
            setForm((f) => ({ ...f, description: text }))
          }
          placeholder="What's included in this plan"
          multiline
          numberOfLines={3}
          className="mb-4"
        />

        <Input
          label="Price (RM)"
          value={form.price}
          onChangeText={(text) => setForm((f) => ({ ...f, price: text }))}
          placeholder="99.00"
          keyboardType="decimal-pad"
          className="mb-4"
        />

        <Select
          label="Billing Interval"
          options={INTERVAL_OPTIONS}
          value={form.interval}
          onChange={(value) => setForm((f) => ({ ...f, interval: value }))}
          className="mb-4"
        />

        <Input
          label="Features (one per line)"
          value={form.features}
          onChangeText={(text) =>
            setForm((f) => ({ ...f, features: text }))
          }
          placeholder={"Unlimited bookings\nPriority support\n10% discount on products"}
          multiline
          numberOfLines={5}
          className="mb-4"
        />

        {!isNew && (
          <View className="mb-4">
            <Switch
              label="Plan is active"
              value={form.isActive}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, isActive: value }))
              }
            />
          </View>
        )}
      </Card>

      <Button onPress={handleSave} loading={saving}>
        {isNew ? "Create Plan" : "Save Changes"}
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
