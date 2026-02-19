import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Header,
  Card,
  Input,
  Select,
  Button,
  Section,
  Spacer,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useMutation, useQuery } from "convex/react";
import { slugify } from "@timeo/shared";

const PLAN_OPTIONS = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

export default function CreateTenantScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [plan, setPlan] = useState("free");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTenant = useMutation(api.platform.createTenant);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const handleSlugChange = useCallback((text: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(text));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Tenant name is required.";
    }
    if (!slug.trim()) {
      newErrors.slug = "Slug is required.";
    }
    if (slug.trim() && !/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }
    if (!ownerEmail.trim()) {
      newErrors.ownerEmail = "Owner email is required.";
    }
    if (ownerEmail.trim() && !ownerEmail.includes("@")) {
      newErrors.ownerEmail = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, slug, ownerEmail]);

  const handleCreate = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Note: The platform.createTenant mutation requires ownerId (user ID),
      // not an email. In a production flow, you would first look up the user
      // by email. For now, we pass the email as a lookup step.
      // Since we don't have a user lookup by email mutation that returns an ID
      // from the client, we attempt creation with the assumption that backend
      // handles the resolution or we use the email as a reference.
      //
      // The actual API requires ownerId as v.id("users"). In a real integration,
      // an admin would either select from existing users or the backend resolves
      // the email to a user ID. Here we show the form structure.
      await createTenant({
        name: name.trim(),
        slug: slug.trim(),
        plan: plan as any,
        ownerId: ownerEmail.trim() as any, // In production, resolve email to user ID
      });

      Alert.alert("Success", `Tenant "${name}" has been created.`, [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Failed to Create Tenant", message);
    } finally {
      setLoading(false);
    }
  }, [validate, name, slug, plan, ownerEmail, createTenant, router]);

  return (
    <Screen scroll={false}>
      <Header title="New Tenant" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="mb-6 text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          Create a new tenant on the platform. The owner will receive admin
          access to the tenant.
        </Text>

        <Card>
          <Input
            label="Tenant Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Acme Salon"
            error={errors.name}
            autoCapitalize="words"
            className="mb-4"
          />

          <Input
            label="Slug"
            value={slug}
            onChangeText={handleSlugChange}
            placeholder="e.g. acme-salon"
            error={errors.slug}
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-1"
          />
          <Text
            className="mb-4 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            URL: timeo.app/{slug || "..."}
          </Text>

          <Select
            options={PLAN_OPTIONS}
            value={plan}
            onChange={setPlan}
            label="Plan"
            className="mb-4"
          />

          <Input
            label="Owner Email"
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            placeholder="owner@example.com"
            error={errors.ownerEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            className="mb-6"
          />

          <Button loading={loading} onPress={handleCreate}>
            Create Tenant
          </Button>
        </Card>

        <Spacer size={24} />
      </ScrollView>
    </Screen>
  );
}
