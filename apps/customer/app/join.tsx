import { useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Building2, Search, CheckCircle } from "lucide-react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@timeo/api";
import { Screen, Card, Input, Button, Spacer, useTheme } from "@timeo/ui";

export default function JoinBusinessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const joinAsCustomer = useMutation(api.tenants.joinAsCustomer);

  const [slug, setSlug] = useState("");
  const [searchSlug, setSearchSlug] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<{ name: string } | null>(null);

  const tenant = useQuery(
    api.tenants.getBySlug,
    searchSlug ? { slug: searchSlug } : "skip"
  );

  const handleSearch = useCallback(() => {
    const trimmed = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!trimmed) {
      Alert.alert("Required", "Please enter a business slug or link.");
      return;
    }
    setSearchSlug(trimmed);
  }, [slug]);

  const handleJoin = useCallback(async () => {
    if (!searchSlug) return;

    setJoining(true);
    try {
      const result = await joinAsCustomer({ tenantSlug: searchSlug });
      if (result.alreadyMember) {
        Alert.alert(
          "Already a Member",
          `You're already a member of ${result.name}.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        setJoined({ name: result.name });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join business";
      Alert.alert("Error", message);
    } finally {
      setJoining(false);
    }
  }, [searchSlug, joinAsCustomer, router]);

  const handleGoHome = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  if (joined) {
    return (
      <Screen scroll>
        <Spacer size={80} />
        <View className="items-center px-8">
          <View
            className="rounded-full p-5"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle size={48} color={theme.colors.success} />
          </View>
          <Spacer size={20} />
          <Text
            className="text-center text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Welcome!
          </Text>
          <Text
            className="mt-2 text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            You've joined {joined.name}. You can now browse their services and
            products.
          </Text>
          <Spacer size={32} />
          <View className="w-full">
            <Button size="lg" onPress={handleGoHome}>
              Go to Home
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

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
            Join a Business
          </Text>
          <Text
            className="mt-2 text-center text-sm px-8"
            style={{ color: theme.colors.textSecondary }}
          >
            Enter the business slug to find and join their storefront on Timeo.
          </Text>
        </View>

        <Spacer size={32} />

        <Card>
          <Input
            label="Business Slug"
            placeholder="e.g. ws-fitness"
            value={slug}
            onChangeText={(text: string) => {
              setSlug(text);
              setSearchSlug(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <Text
            className="mt-2 text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            This is the short name in the business link: timeo.my/
            {slug.trim() || "slug"}
          </Text>

          <Spacer size={16} />

          {!searchSlug ? (
            <Button size="lg" onPress={handleSearch} disabled={!slug.trim()}>
              <View className="flex-row items-center">
                <Search
                  size={18}
                  color={theme.dark ? "#0B0B0F" : "#FFFFFF"}
                />
                <Text
                  className="ml-2 text-base font-semibold"
                  style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
                >
                  Find Business
                </Text>
              </View>
            </Button>
          ) : tenant === undefined ? (
            <View className="items-center py-4">
              <Text
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Searching...
              </Text>
            </View>
          ) : tenant === null ? (
            <View>
              <View
                className="rounded-xl p-4"
                style={{ backgroundColor: theme.colors.error + "10" }}
              >
                <Text
                  className="text-center text-sm"
                  style={{ color: theme.colors.error }}
                >
                  No business found with slug "{searchSlug}". Please check and
                  try again.
                </Text>
              </View>
              <Spacer size={12} />
              <Button
                variant="outline"
                size="lg"
                onPress={() => setSearchSlug(null)}
              >
                Try Again
              </Button>
            </View>
          ) : (
            <View>
              <View
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="mr-3 h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <Text
                      className="text-lg font-bold"
                      style={{ color: "#0B0B0F" }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-lg font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      {tenant.name}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      timeo.my/{tenant.slug}
                    </Text>
                  </View>
                </View>
              </View>
              <Spacer size={16} />
              <Button size="lg" onPress={handleJoin} loading={joining}>
                Join {tenant.name}
              </Button>
              <Spacer size={8} />
              <Button
                variant="ghost"
                size="md"
                onPress={() => setSearchSlug(null)}
              >
                Search Again
              </Button>
            </View>
          )}
        </Card>

        <Spacer size={16} />

        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>

        <Spacer size={40} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
