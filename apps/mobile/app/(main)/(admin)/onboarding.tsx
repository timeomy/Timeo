import { useState, useCallback } from "react";
import { View, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Building2 } from "lucide-react-native";
import { useCreateTenant } from "@timeo/api-client";
import { Screen, Input, Button, Spacer, useTheme } from "@timeo/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createTenant = useCreateTenant();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNameChange = useCallback(
    (text: string) => {
      setName(text);
      if (!slugEdited) {
        setSlug(slugify(text));
      }
    },
    [slugEdited],
  );

  const handleSlugChange = useCallback((text: string) => {
    setSlugEdited(true);
    setSlug(slugify(text));
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      Alert.alert("Required", "Please enter your business name.");
      return;
    }
    if (!trimmedSlug || trimmedSlug.length < 3) {
      Alert.alert("Required", "Slug must be at least 3 characters.");
      return;
    }

    setCreating(true);
    try {
      await createTenant.mutateAsync({ name: trimmedName, slug: trimmedSlug });
      router.replace("/(tabs)");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create business";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  }, [name, slug, createTenant, router]);

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Spacer size={60} />

        <View className="items-center">
          <View
            className="h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <Building2 size={40} color={theme.colors.primary} />
          </View>
          <Spacer size={20} />
          <Text
            className="text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Create Your Business
          </Text>
          <Text
            className="mt-2 px-8 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Set up your business on Timeo to start managing bookings, products,
            and customers.
          </Text>
        </View>

        <Spacer size={32} />

        <View
          className="rounded-2xl p-4"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Input
            label="Business Name"
            placeholder="e.g. WS Fitness Studio"
            value={name}
            onChangeText={handleNameChange}
            autoCapitalize="words"
          />
          <Spacer size={16} />
          <Input
            label="URL Slug"
            placeholder="e.g. ws-fitness"
            value={slug}
            onChangeText={handleSlugChange}
            autoCapitalize="none"
          />
          <Text
            className="mt-2 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            Your customers will find you at: timeo.my/{slug || "your-slug"}
          </Text>

          <Spacer size={24} />

          <Button
            size="lg"
            onPress={handleCreate}
            loading={creating}
            disabled={!name.trim() || !slug.trim()}
          >
            Create Business
          </Button>
        </View>

        <Spacer size={40} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
