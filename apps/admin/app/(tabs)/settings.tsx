import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  Palette,
  Clock,
  Bell,
  ChevronRight,
  Users,
  CreditCard,
  LogOut,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Input,
  Button,
  Switch,
  Section,
  Row,
  Spacer,
  Separator,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, signOut, activeOrg } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const tenant = useQuery(
    api.tenants.getById,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const updateTenant = useMutation(api.tenants.update);
  const updateBranding = useMutation(api.tenants.updateBranding);

  // Business info state
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Branding state
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  // Notification toggle state (placeholder)
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyStaff, setNotifyStaff] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "business"
  );

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.name ?? "");
      setBusinessDescription(tenant.branding?.businessName ?? "");
      setPrimaryColor(tenant.branding?.primaryColor ?? "");
      setSecondaryColor("");
    }
  }, [tenant]);

  const handleSaveBusinessInfo = useCallback(async () => {
    if (!businessName.trim()) {
      setToast({
        message: "Business name is required",
        type: "error",
        visible: true,
      });
      return;
    }

    setSavingInfo(true);
    try {
      await updateTenant({
        tenantId: tenantId as any,
        name: businessName.trim(),
      });
      setToast({
        message: "Business info saved",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save business info";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingInfo(false);
    }
  }, [businessName, tenantId, updateTenant]);

  const handleSaveBranding = useCallback(async () => {
    setSavingBranding(true);
    try {
      await updateBranding({
        tenantId: tenantId as any,
        branding: {
          primaryColor: primaryColor.trim() || undefined,
          businessName: businessDescription.trim() || undefined,
        },
      });
      setToast({
        message: "Branding saved",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save branding";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingBranding(false);
    }
  }, [primaryColor, businessDescription, tenantId, updateBranding]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }, [signOut, router]);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Settings" />
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

  if (tenant === undefined) {
    return <LoadingScreen message="Loading settings..." />;
  }

  return (
    <Screen scroll={false}>
      <Header title="Settings" />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Quick Links */}
        <View className="mb-4">
          <Card
            onPress={() => router.push("/customers/")}
          >
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.primary + "15" }}
                >
                  <Users size={20} color={theme.colors.primary} />
                </View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  Customer Directory
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
          <Spacer size={8} />
          <Card
            onPress={() => router.push("/memberships/")}
          >
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.success + "15" }}
                >
                  <CreditCard size={20} color={theme.colors.success} />
                </View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  Membership Plans
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
        </View>

        <Separator className="my-2" />

        {/* Business Info Section */}
        <Section title="">
          <TouchableOpacity
            onPress={() => toggleSection("business")}
            activeOpacity={0.7}
          >
            <Card>
              <Row justify="between" align="center">
                <Row align="center" gap={12}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.info + "15" }}
                  >
                    <Building2 size={20} color={theme.colors.info} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      Business Info
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Name, slug, description
                    </Text>
                  </View>
                </Row>
                <ChevronRight
                  size={20}
                  color={theme.colors.textSecondary}
                  style={{
                    transform: [
                      {
                        rotate:
                          expandedSection === "business" ? "90deg" : "0deg",
                      },
                    ],
                  }}
                />
              </Row>
            </Card>
          </TouchableOpacity>
          {expandedSection === "business" && (
            <View className="mt-3">
              <Input
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your business name"
                className="mb-3"
              />
              <Input
                label="Slug"
                value={tenant?.slug ?? ""}
                editable={false}
                placeholder="business-slug"
                className="mb-3"
              />
              <Input
                label="Display Name"
                value={businessDescription}
                onChangeText={setBusinessDescription}
                placeholder="Public-facing business name"
                className="mb-4"
              />
              <Button onPress={handleSaveBusinessInfo} loading={savingInfo}>
                Save Business Info
              </Button>
            </View>
          )}
        </Section>

        {/* Branding Section */}
        <Section title="">
          <TouchableOpacity
            onPress={() => toggleSection("branding")}
            activeOpacity={0.7}
          >
            <Card>
              <Row justify="between" align="center">
                <Row align="center" gap={12}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.warning + "15" }}
                  >
                    <Palette size={20} color={theme.colors.warning} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      Branding
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Colors and appearance
                    </Text>
                  </View>
                </Row>
                <ChevronRight
                  size={20}
                  color={theme.colors.textSecondary}
                  style={{
                    transform: [
                      {
                        rotate:
                          expandedSection === "branding" ? "90deg" : "0deg",
                      },
                    ],
                  }}
                />
              </Row>
            </Card>
          </TouchableOpacity>
          {expandedSection === "branding" && (
            <View className="mt-3">
              <Input
                label="Primary Color (hex)"
                value={primaryColor}
                onChangeText={setPrimaryColor}
                placeholder="#1A56DB"
                autoCapitalize="none"
                className="mb-3"
              />
              {primaryColor ? (
                <View className="mb-3 flex-row items-center">
                  <View
                    className="mr-2 h-6 w-6 rounded-full border"
                    style={{
                      backgroundColor: primaryColor,
                      borderColor: theme.colors.border,
                    }}
                  />
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Preview
                  </Text>
                </View>
              ) : null}
              <Button onPress={handleSaveBranding} loading={savingBranding}>
                Save Branding
              </Button>
            </View>
          )}
        </Section>

        {/* Business Hours Section */}
        <Section title="">
          <TouchableOpacity
            onPress={() => toggleSection("hours")}
            activeOpacity={0.7}
          >
            <Card>
              <Row justify="between" align="center">
                <Row align="center" gap={12}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.success + "15" }}
                  >
                    <Clock size={20} color={theme.colors.success} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      Business Hours
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Operating schedule
                    </Text>
                  </View>
                </Row>
                <ChevronRight
                  size={20}
                  color={theme.colors.textSecondary}
                  style={{
                    transform: [
                      {
                        rotate:
                          expandedSection === "hours" ? "90deg" : "0deg",
                      },
                    ],
                  }}
                />
              </Row>
            </Card>
          </TouchableOpacity>
          {expandedSection === "hours" && (
            <View className="mt-3">
              <Card variant="outlined">
                <View className="items-center py-6">
                  <Clock size={32} color={theme.colors.textSecondary} />
                  <Spacer size={8} />
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    Coming Soon
                  </Text>
                  <Text
                    className="mt-1 text-center text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Day-by-day schedule configuration will be available in a
                    future update.
                  </Text>
                </View>
              </Card>
            </View>
          )}
        </Section>

        {/* Notifications Section */}
        <Section title="">
          <TouchableOpacity
            onPress={() => toggleSection("notifications")}
            activeOpacity={0.7}
          >
            <Card>
              <Row justify="between" align="center">
                <Row align="center" gap={12}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.colors.error + "15" }}
                  >
                    <Bell size={20} color={theme.colors.error} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      Notifications
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Alerts and preferences
                    </Text>
                  </View>
                </Row>
                <ChevronRight
                  size={20}
                  color={theme.colors.textSecondary}
                  style={{
                    transform: [
                      {
                        rotate:
                          expandedSection === "notifications"
                            ? "90deg"
                            : "0deg",
                      },
                    ],
                  }}
                />
              </Row>
            </Card>
          </TouchableOpacity>
          {expandedSection === "notifications" && (
            <View className="mt-3">
              <Card>
                <Switch
                  label="New booking notifications"
                  value={notifyBookings}
                  onValueChange={setNotifyBookings}
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="New order notifications"
                  value={notifyOrders}
                  onValueChange={setNotifyOrders}
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="Staff activity alerts"
                  value={notifyStaff}
                  onValueChange={setNotifyStaff}
                />
              </Card>
              <Spacer size={8} />
              <Text
                className="text-center text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Notification settings are saved locally. Push notifications
                coming soon.
              </Text>
            </View>
          )}
        </Section>

        <Spacer size={24} />
        <Separator />
        <Spacer size={24} />

        {/* Sign Out */}
        <Button variant="destructive" onPress={handleSignOut}>
          <Row align="center" gap={8}>
            <LogOut size={18} color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">
              Sign Out
            </Text>
          </Row>
        </Button>

        <Spacer size={16} />
        <Text
          className="text-center text-xs"
          style={{ color: theme.colors.textSecondary }}
        >
          Timeo Admin v1.0.0
        </Text>
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
