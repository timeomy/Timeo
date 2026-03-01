import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Users,
  CreditCard,
  DollarSign,
  Gift,
  FileText,
  Ticket,
  Bell,
  Clock,
  Building2,
  LogOut,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useTenant,
  useUpdateTenantSettings,
  useBusinessHours,
  useUpdateBusinessHours,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Button,
  Input,
  Spacer,
  Toast,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DayHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_HOURS: DayHours[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5,
  openTime: "09:00",
  closeTime: "18:00",
}));

export default function AdminSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, signOut } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId);
  const updateSettings = useUpdateTenantSettings(tenantId ?? "");
  const { data: businessHoursData, isLoading: loadingHours } = useBusinessHours(tenantId);
  const updateBusinessHours = useUpdateBusinessHours(tenantId ?? "");

  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [savingHours, setSavingHours] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.name);
      setBusinessSlug(tenant.slug);
    }
  }, [tenant]);

  useEffect(() => {
    if (businessHoursData && businessHoursData.length > 0) {
      setHours(
        businessHoursData.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime ?? "09:00",
          closeTime: h.closeTime ?? "18:00",
        })),
      );
    }
  }, [businessHoursData]);

  const toggleSection = useCallback(
    (section: string) => {
      setExpandedSection((prev) => (prev === section ? null : section));
    },
    [],
  );

  const handleSaveBusinessInfo = useCallback(async () => {
    if (!businessName.trim()) {
      Alert.alert("Required", "Business name is required.");
      return;
    }
    setSavingInfo(true);
    try {
      await updateSettings.mutateAsync({
        name: businessName.trim(),
        slug: businessSlug.trim(),
      });
      setToast({ message: "Business info updated", type: "success", visible: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingInfo(false);
    }
  }, [businessName, businessSlug, updateSettings]);

  const handleSaveHours = useCallback(async () => {
    setSavingHours(true);
    try {
      await updateBusinessHours.mutateAsync({
        hours: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      });
      setToast({ message: "Business hours updated", type: "success", visible: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update hours";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSavingHours(false);
    }
  }, [hours, updateBusinessHours]);

  const updateDayHours = useCallback(
    (dayOfWeek: number, field: keyof DayHours, value: string | boolean) => {
      setHours((prev) =>
        prev.map((h) =>
          h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h,
        ),
      );
    },
    [],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  }, [signOut]);

  if (!tenantId || loadingTenant) {
    return <LoadingScreen message="Loading settings..." />;
  }

  const quickLinks = [
    { label: "Customers", icon: Users, route: "/customers" },
    { label: "Memberships", icon: CreditCard, route: "/memberships" },
    { label: "Payments", icon: DollarSign, route: "/payments" },
    { label: "Gift Cards", icon: Gift, route: "/gift-cards" },
    { label: "e-Invoice", icon: FileText, route: "/e-invoice" },
    { label: "Vouchers", icon: Ticket, route: "/vouchers" },
  ];

  return (
    <Screen padded={false}>
      <Header title="Settings" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Quick Links */}
        <View className="px-4 pb-4">
          <Text className="mb-3 text-sm font-semibold" style={{ color: theme.colors.textSecondary }}>
            Quick Links
          </Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <View key={link.route}>
                  <TouchableOpacity
                    onPress={() => router.push(link.route as any)}
                    className="flex-row items-center p-4"
                  >
                    <Icon size={18} color={theme.colors.primary} />
                    <Text className="ml-3 flex-1 text-sm font-medium" style={{ color: theme.colors.text }}>
                      {link.label}
                    </Text>
                    <ChevronRight size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {index < quickLinks.length - 1 && (
                    <View className="mx-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Business Info Section */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={() => toggleSection("business")}
            className="flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Building2 size={18} color={theme.colors.primary} />
            <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
              Business Info
            </Text>
            <ChevronRight
              size={16}
              color={theme.colors.textSecondary}
              style={{
                transform: [{ rotate: expandedSection === "business" ? "90deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>
          {expandedSection === "business" && (
            <View
              className="mt-2 rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View style={{ marginBottom: 12 }}>
                <Input
                  label="Business Name"
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Your business name"
                />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Input
                  label="URL Slug"
                  value={businessSlug}
                  onChangeText={setBusinessSlug}
                  placeholder="your-business"
                  autoCapitalize="none"
                />
              </View>
              <Button onPress={handleSaveBusinessInfo} loading={savingInfo}>
                Save Changes
              </Button>
            </View>
          )}
        </View>

        {/* Business Hours Section */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={() => toggleSection("hours")}
            className="flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Clock size={18} color={theme.colors.primary} />
            <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
              Business Hours
            </Text>
            <ChevronRight
              size={16}
              color={theme.colors.textSecondary}
              style={{
                transform: [{ rotate: expandedSection === "hours" ? "90deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>
          {expandedSection === "hours" && (
            <View
              className="mt-2 rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {loadingHours ? (
                <Text className="py-4 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
                  Loading hours...
                </Text>
              ) : (
                <>
                  {hours.map((day) => (
                    <View
                      key={day.dayOfWeek}
                      className="mb-3 rounded-lg p-3"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color: day.isOpen ? theme.colors.text : theme.colors.textSecondary,
                            width: 90,
                          }}
                        >
                          {DAY_NAMES[day.dayOfWeek]}
                        </Text>
                        <Switch
                          value={day.isOpen}
                          onValueChange={(val) =>
                            updateDayHours(day.dayOfWeek, "isOpen", val)
                          }
                        />
                      </View>
                      {day.isOpen && (
                        <View className="mt-2 flex-row" style={{ gap: 8 }}>
                          <View className="flex-1">
                            <Input
                              label="Open"
                              value={day.openTime}
                              onChangeText={(val) =>
                                updateDayHours(day.dayOfWeek, "openTime", val)
                              }
                              placeholder="09:00"
                            />
                          </View>
                          <View className="flex-1">
                            <Input
                              label="Close"
                              value={day.closeTime}
                              onChangeText={(val) =>
                                updateDayHours(day.dayOfWeek, "closeTime", val)
                              }
                              placeholder="18:00"
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                  <Spacer size={8} />
                  <Button onPress={handleSaveHours} loading={savingHours}>
                    Save Business Hours
                  </Button>
                </>
              )}
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={() => router.push("/notifications" as any)}
            className="flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Bell size={18} color={theme.colors.primary} />
            <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
              Notifications
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <LogOut size={18} color={theme.colors.error} />
            <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.colors.error }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
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
