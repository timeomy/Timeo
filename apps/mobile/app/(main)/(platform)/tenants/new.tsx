import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useCreatePlatformTenant } from "@timeo/api-client";
import { Screen, Header, Spacer, useTheme } from "@timeo/ui";

const PLAN_OPTIONS = ["free", "starter", "pro", "enterprise"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function NewTenantScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createTenant = useCreatePlatformTenant();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [plan, setPlan] = useState("starter");
  const [ownerEmail, setOwnerEmail] = useState("");

  const handleNameChange = (text: string) => {
    setName(text);
    if (!slugManual) {
      setSlug(slugify(text));
    }
  };

  const handleSlugChange = (text: string) => {
    setSlugManual(true);
    setSlug(slugify(text));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Tenant name is required.");
      return;
    }
    if (!slug.trim()) {
      Alert.alert("Validation", "Slug is required.");
      return;
    }
    if (!ownerEmail.trim() || !isValidEmail(ownerEmail.trim())) {
      Alert.alert("Validation", "A valid owner email is required.");
      return;
    }
    try {
      await createTenant.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        ownerEmail: ownerEmail.trim(),
        plan,
      });
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create tenant.";
      Alert.alert("Error", message);
    }
  };

  const inputStyle = {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  };

  return (
    <Screen padded={false}>
      <Header title="New Tenant" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Name */}
        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
          Business Name
        </Text>
        <Spacer size={6} />
        <TextInput
          value={name}
          onChangeText={handleNameChange}
          placeholder="e.g. Iron Gym KL"
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        <Spacer size={16} />

        {/* Slug */}
        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
          Slug
        </Text>
        <Spacer size={6} />
        <TextInput
          value={slug}
          onChangeText={handleSlugChange}
          placeholder="e.g. iron-gym-kl"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          style={inputStyle}
        />

        <Spacer size={16} />

        {/* Plan */}
        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
          Plan
        </Text>
        <Spacer size={6} />
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {PLAN_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPlan(p)}
              className="rounded-xl px-4 py-2.5"
              style={{
                backgroundColor: plan === p ? theme.colors.primary + "20" : theme.colors.surface,
              }}
            >
              <Text
                className="text-sm font-medium capitalize"
                style={{ color: plan === p ? theme.colors.primary : theme.colors.textSecondary }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Spacer size={16} />

        {/* Owner Email */}
        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
          Owner Email
        </Text>
        <Spacer size={6} />
        <TextInput
          value={ownerEmail}
          onChangeText={setOwnerEmail}
          placeholder="owner@example.com"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />

        <Spacer size={24} />

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createTenant.isPending}
          className="items-center rounded-xl py-3.5"
          style={{
            backgroundColor: createTenant.isPending
              ? theme.colors.textSecondary
              : theme.colors.primary,
          }}
        >
          <Text className="text-base font-bold" style={{ color: "#fff" }}>
            {createTenant.isPending ? "Creating..." : "Create Tenant"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
