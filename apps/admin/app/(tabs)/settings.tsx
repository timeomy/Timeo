import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
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
  Banknote,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Gift,
  FileText,
  Ticket,
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
  ImageUploader,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation, useAction } from "convex/react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, signOut, activeOrg } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const tenant = useQuery(
    api.tenants.getById,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const businessHoursData = useQuery(
    api.scheduling.getBusinessHours,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const setBusinessHoursMutation = useMutation(api.scheduling.setBusinessHours);

  const updateTenant = useMutation(api.tenants.update);
  const updateBranding = useMutation(api.tenants.updateBranding);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateEntityImage = useMutation(api.files.updateEntityImage);
  const saveFileMutation = useMutation(api.files.saveFile);

  // Business hours state
  const [hours, setHours] = useState<DayHours[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // Business info state
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Branding state
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  // Notification preferences
  const notifPrefs = useQuery(
    api.notifications.getPreferences,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );
  const updateNotifPrefs = useMutation(api.notifications.updatePreferences);

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

  useEffect(() => {
    if (businessHoursData && hours.length === 0) {
      setHours(
        businessHoursData.map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isOpen: h.isOpen,
        }))
      );
    }
  }, [businessHoursData, hours.length]);

  const updateDayHours = useCallback(
    (dayOfWeek: number, field: keyof DayHours, value: any) => {
      setHours((prev) =>
        prev.map((h) =>
          h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
        )
      );
    },
    []
  );

  const handleSaveBusinessHours = useCallback(async () => {
    if (!tenantId) return;
    setSavingHours(true);
    try {
      await setBusinessHoursMutation({
        tenantId: tenantId as any,
        hours,
      });
      setToast({
        message: "Business hours saved",
        type: "success",
        visible: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save business hours";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingHours(false);
    }
  }, [tenantId, hours, setBusinessHoursMutation]);

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

  const handleLogoUpload = useCallback(
    async (storageId: string) => {
      if (!tenantId) return;
      try {
        await saveFileMutation({
          tenantId: tenantId as any,
          filename: "tenant-logo",
          mimeType: "image/jpeg",
          size: 0,
          type: "logo" as const,
          entityId: tenantId,
          storageId,
        });
        await updateEntityImage({
          entityType: "tenant",
          entityId: tenantId,
          storageId,
        });
        setToast({
          message: "Logo uploaded",
          type: "success",
          visible: true,
        });
      } catch {
        setToast({
          message: "Failed to upload logo",
          type: "error",
          visible: true,
        });
      }
    },
    [tenantId, saveFileMutation, updateEntityImage]
  );

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
          <Spacer size={8} />
          <Card
            onPress={() => router.push("/payments/")}
          >
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.warning + "15" }}
                >
                  <Banknote size={20} color={theme.colors.warning} />
                </View>
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  Payment History
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
          <Spacer size={8} />
          <Card onPress={() => router.push("/gift-cards/" as any)}>
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.info + "15" }}
                >
                  <Gift size={20} color={theme.colors.info} />
                </View>
                <Text className="text-base font-medium" style={{ color: theme.colors.text }}>
                  Gift Cards
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
          <Spacer size={8} />
          <Card onPress={() => router.push("/e-invoice/" as any)}>
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.error + "15" }}
                >
                  <FileText size={20} color={theme.colors.error} />
                </View>
                <Text className="text-base font-medium" style={{ color: theme.colors.text }}>
                  e-Invoice
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
          <Spacer size={8} />
          <Card onPress={() => router.push("/vouchers/" as any)}>
            <Row justify="between" align="center">
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.colors.secondary + "15" }}
                >
                  <Ticket size={20} color={theme.colors.secondary} />
                </View>
                <Text className="text-base font-medium" style={{ color: theme.colors.text }}>
                  Vouchers
                </Text>
              </Row>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Row>
          </Card>
        </View>

        <Separator className="my-2" />

        {/* Payment Settings Section */}
        <StripeConnectSection
          tenantId={tenantId}
          theme={theme}
          expandedSection={expandedSection}
          toggleSection={toggleSection}
          setToast={setToast}
        />

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
              <ImageUploader
                label="Business Logo"
                generateUploadUrl={generateUploadUrl}
                currentImageUrl={tenant?.branding?.logoUrl}
                onUpload={(storageId) => handleLogoUpload(storageId)}
                onRemove={() => {}}
                size={100}
              />
              <Spacer size={12} />
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
              {hours.length === 0 ? (
                <Card>
                  <View className="items-center py-4">
                    <Text
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Loading business hours...
                    </Text>
                  </View>
                </Card>
              ) : (
                <>
                  {hours.map((day) => (
                    <Card key={day.dayOfWeek} className="mb-2">
                      <Row justify="between" align="center">
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color: day.isOpen
                              ? theme.colors.text
                              : theme.colors.textSecondary,
                            width: 90,
                          }}
                        >
                          {DAY_NAMES[day.dayOfWeek]}
                        </Text>
                        <Switch
                          value={day.isOpen}
                          onValueChange={(val: boolean) =>
                            updateDayHours(day.dayOfWeek, "isOpen", val)
                          }
                        />
                      </Row>
                      {day.isOpen && (
                        <Row gap={8} className="mt-2">
                          <View className="flex-1">
                            <Input
                              label="Open"
                              value={day.openTime}
                              onChangeText={(val: string) =>
                                updateDayHours(day.dayOfWeek, "openTime", val)
                              }
                              placeholder="09:00"
                            />
                          </View>
                          <View className="flex-1">
                            <Input
                              label="Close"
                              value={day.closeTime}
                              onChangeText={(val: string) =>
                                updateDayHours(day.dayOfWeek, "closeTime", val)
                              }
                              placeholder="17:00"
                            />
                          </View>
                        </Row>
                      )}
                    </Card>
                  ))}
                  <Spacer size={8} />
                  <Button
                    onPress={handleSaveBusinessHours}
                    loading={savingHours}
                  >
                    Save Business Hours
                  </Button>
                </>
              )}
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
                  label="Booking confirmation emails"
                  value={notifPrefs?.emailBookingConfirm ?? true}
                  onValueChange={(val: boolean) =>
                    updateNotifPrefs({
                      tenantId: tenantId as any,
                      emailBookingConfirm: val,
                    })
                  }
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="Booking reminder emails"
                  value={notifPrefs?.emailBookingReminder ?? true}
                  onValueChange={(val: boolean) =>
                    updateNotifPrefs({
                      tenantId: tenantId as any,
                      emailBookingReminder: val,
                    })
                  }
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="Order update emails"
                  value={notifPrefs?.emailOrderUpdate ?? true}
                  onValueChange={(val: boolean) =>
                    updateNotifPrefs({
                      tenantId: tenantId as any,
                      emailOrderUpdate: val,
                    })
                  }
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="Push notifications"
                  value={notifPrefs?.pushEnabled ?? true}
                  onValueChange={(val: boolean) =>
                    updateNotifPrefs({
                      tenantId: tenantId as any,
                      pushEnabled: val,
                    })
                  }
                  className="mb-4"
                />
                <Separator className="mb-4" />
                <Switch
                  label="In-app notifications"
                  value={notifPrefs?.inAppEnabled ?? true}
                  onValueChange={(val: boolean) =>
                    updateNotifPrefs({
                      tenantId: tenantId as any,
                      inAppEnabled: val,
                    })
                  }
                />
              </Card>
              <Spacer size={8} />
              <Text
                className="text-center text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Changes are saved automatically.
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

// ─── Stripe Connect Section ───

function StripeConnectSection({
  tenantId,
  theme,
  expandedSection,
  toggleSection,
  setToast,
}: {
  tenantId: string;
  theme: any;
  expandedSection: string | null;
  toggleSection: (s: string) => void;
  setToast: (t: { message: string; type: "success" | "error"; visible: boolean }) => void;
}) {
  const [connecting, setConnecting] = useState(false);

  const stripeAccount = useQuery(
    api.payments.getStripeAccount,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const createConnectAccount = useAction(api.payments.createConnectAccount);
  const getOnboardingLink = useAction(api.payments.getConnectOnboardingLink);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      if (!stripeAccount) {
        await createConnectAccount({ tenantId: tenantId as any });
      }

      const result = await getOnboardingLink({
        tenantId: tenantId as any,
        refreshUrl: "timeo://settings",
        returnUrl: "timeo://settings",
      });

      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect Stripe";
      setToast({ message, type: "error", visible: true });
    } finally {
      setConnecting(false);
    }
  }, [tenantId, stripeAccount, createConnectAccount, getOnboardingLink, setToast]);

  const isConnected = stripeAccount?.status === "active" && stripeAccount?.chargesEnabled;

  return (
    <Section title="">
      <TouchableOpacity
        onPress={() => toggleSection("payments")}
        activeOpacity={0.7}
      >
        <Card>
          <Row justify="between" align="center">
            <Row align="center" gap={12}>
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.colors.warning + "15" }}
              >
                <Banknote size={20} color={theme.colors.warning} />
              </View>
              <View>
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Payment Settings
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Stripe Connect for payouts
                </Text>
              </View>
            </Row>
            <Row align="center" gap={8}>
              {isConnected && (
                <CheckCircle2 size={16} color={theme.colors.success} />
              )}
              <ChevronRight
                size={20}
                color={theme.colors.textSecondary}
                style={{
                  transform: [
                    {
                      rotate:
                        expandedSection === "payments" ? "90deg" : "0deg",
                    },
                  ],
                }}
              />
            </Row>
          </Row>
        </Card>
      </TouchableOpacity>
      {expandedSection === "payments" && (
        <View className="mt-3">
          <Card>
            {stripeAccount ? (
              <View>
                <Row align="center" gap={8} className="mb-3">
                  {isConnected ? (
                    <CheckCircle2 size={18} color={theme.colors.success} />
                  ) : (
                    <AlertCircle size={18} color={theme.colors.warning} />
                  )}
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    {isConnected ? "Stripe Connected" : "Setup Incomplete"}
                  </Text>
                </Row>
                <View className="mb-3 rounded-lg p-3" style={{ backgroundColor: theme.colors.background }}>
                  <Row justify="between" className="mb-1">
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      Status
                    </Text>
                    <Text
                      className="text-xs font-medium capitalize"
                      style={{
                        color: isConnected
                          ? theme.colors.success
                          : theme.colors.warning,
                      }}
                    >
                      {stripeAccount.status}
                    </Text>
                  </Row>
                  <Row justify="between" className="mb-1">
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      Charges
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: theme.colors.text }}>
                      {stripeAccount.chargesEnabled ? "Enabled" : "Disabled"}
                    </Text>
                  </Row>
                  <Row justify="between">
                    <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      Payouts
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: theme.colors.text }}>
                      {stripeAccount.payoutsEnabled ? "Enabled" : "Disabled"}
                    </Text>
                  </Row>
                </View>
                {!isConnected && (
                  <Button
                    onPress={handleConnect}
                    loading={connecting}
                  >
                    <Row align="center" gap={8}>
                      <ExternalLink size={16} color="#FFFFFF" />
                      <Text className="text-sm font-semibold text-white">
                        Complete Setup
                      </Text>
                    </Row>
                  </Button>
                )}
              </View>
            ) : (
              <View>
                <Text
                  className="mb-2 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Connect a Stripe account to accept payments and receive payouts
                  directly to your bank account.
                </Text>
                <Spacer size={8} />
                <Button
                  onPress={handleConnect}
                  loading={connecting}
                >
                  <Row align="center" gap={8}>
                    <Banknote size={16} color="#FFFFFF" />
                    <Text className="text-sm font-semibold text-white">
                      Connect Stripe Account
                    </Text>
                  </Row>
                </Button>
              </View>
            )}
          </Card>
        </View>
      )}
    </Section>
  );
}
