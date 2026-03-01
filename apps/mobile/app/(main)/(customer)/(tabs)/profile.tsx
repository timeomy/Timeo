import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Mail,
  Building2,
  ChevronRight,
  LogOut,
  ShoppingCart,
  CalendarDays,
  Shield,
  Bell,
  QrCode,
  Dumbbell,
  Ticket,
  Package,
  Gift,
  Receipt,
  UserPlus,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Card,
  Separator,
  Spacer,
  Button,
  Avatar,
  useTheme,
} from "@timeo/ui";
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { useCart } from "@/providers/cart";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, activeRole, signOut } = useTimeoAuth();
  const { tenants, activeTenant, switchTenant, isLoading } =
    useTenantSwitcher();
  const { totalItems } = useCart();

  const displayName = user?.name || "User";

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch {
            Alert.alert("Error", "Unable to sign out. Please try again.");
          }
        },
      },
    ]);
  }, [signOut, router]);

  const handleSwitchTenant = useCallback(
    (orgId: string, orgName: string) => {
      Alert.alert(
        "Switch Organization",
        `Switch to "${orgName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            onPress: async () => {
              try {
                await switchTenant(orgId);
              } catch {
                Alert.alert("Error", "Unable to switch organization.");
              }
            },
          },
        ]
      );
    },
    [switchTenant]
  );

  return (
    <Screen scroll>
      <Header title="Profile" />

      {/* Profile Card */}
      <Card className="mt-2">
        <View className="items-center">
          <Avatar
            src={user?.imageUrl}
            fallback={displayName}
            size="lg"
          />
          <Text
            className="mt-3 text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {displayName}
          </Text>
          {user?.email ? (
            <View className="mt-1 flex-row items-center">
              <Mail size={14} color={theme.colors.textSecondary} />
              <Text
                className="ml-1.5 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {user.email}
              </Text>
            </View>
          ) : null}
          {activeTenant ? (
            <View className="mt-1 flex-row items-center">
              <Building2 size={14} color={theme.colors.primary} />
              <Text
                className="ml-1.5 text-sm font-medium"
                style={{ color: theme.colors.primary }}
              >
                {activeTenant.name}
              </Text>
            </View>
          ) : null}
          <View className="mt-2 flex-row items-center rounded-full px-3 py-1"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <Shield size={12} color={theme.colors.primary} />
            <Text
              className="ml-1 text-xs font-semibold capitalize"
              style={{ color: theme.colors.primary }}
            >
              {activeRole}
            </Text>
          </View>
        </View>
      </Card>

      <Spacer size={16} />

      {/* Quick Actions */}
      <Card>
        <Text
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Quick Actions
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/qr-code" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <QrCode size={18} color={theme.colors.success} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            My QR Code
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/(main)/(customer)/(tabs)/bookings")}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <CalendarDays size={18} color={theme.colors.primary} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            My Bookings
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/sessions" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.info + "15" }}
          >
            <Dumbbell size={18} color={theme.colors.info} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            My Sessions
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/vouchers" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.error + "15" }}
          >
            <Ticket size={18} color={theme.colors.error} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            My Vouchers
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/memberships" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.warning + "15" }}
          >
            <Package size={18} color={theme.colors.warning} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            Memberships
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/cart" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.secondary + "15" }}
          >
            <ShoppingCart size={18} color={theme.colors.secondary} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            Cart
          </Text>
          {totalItems > 0 ? (
            <View
              className="mr-2 rounded-full px-2 py-0.5"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
              >
                {totalItems}
              </Text>
            </View>
          ) : null}
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/notifications" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.warning + "15" }}
          >
            <Bell size={18} color={theme.colors.warning} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            Notifications
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/gift-cards" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.info + "15" }}
          >
            <Gift size={18} color={theme.colors.info} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            Gift Cards
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/receipts" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.secondary + "15" }}
          >
            <Receipt size={18} color={theme.colors.secondary} />
          </View>
          <Text className="flex-1 text-base" style={{ color: theme.colors.text }}>
            Receipts
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Spacer size={16} />

      {/* Organization / Tenant Switcher */}
      <Card>
        <Text
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Organization
        </Text>

        {isLoading ? (
          <Text className="py-3 text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading organizations...
          </Text>
        ) : tenants.length === 0 ? (
          <Text className="py-3 text-sm" style={{ color: theme.colors.textSecondary }}>
            No organizations found.
          </Text>
        ) : (
          tenants.map((tenant, index) => {
            const isActive = tenant.id === activeTenant?.id;
            return (
              <React.Fragment key={tenant.id}>
                {index > 0 ? <Separator /> : null}
                <TouchableOpacity
                  onPress={() => {
                    if (!isActive) {
                      handleSwitchTenant(tenant.id, tenant.name);
                    }
                  }}
                  className="flex-row items-center py-3"
                  disabled={isActive}
                >
                  <View
                    className="mr-3 rounded-lg p-2"
                    style={{
                      backgroundColor: isActive
                        ? theme.colors.primary + "15"
                        : theme.colors.surface,
                    }}
                  >
                    <Building2
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-medium"
                      style={{ color: isActive ? theme.colors.primary : theme.colors.text }}
                    >
                      {tenant.name}
                    </Text>
                    <Text
                      className="text-xs capitalize"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {tenant.role}
                    </Text>
                  </View>
                  {isActive ? (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: theme.colors.success + "15" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.colors.success }}
                      >
                        Active
                      </Text>
                    </View>
                  ) : (
                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })
        )}
        <Separator />
        <TouchableOpacity
          onPress={() => router.push("/join" as any)}
          className="flex-row items-center py-3"
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <UserPlus size={18} color={theme.colors.primary} />
          </View>
          <Text
            className="flex-1 text-base font-medium"
            style={{ color: theme.colors.primary }}
          >
            Join a Business
          </Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Spacer size={16} />

      {/* Account Info */}
      <Card>
        <Text
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Account
        </Text>
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Name</Text>
            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{displayName}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Email</Text>
            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{user?.email ?? "N/A"}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>Role</Text>
            <Text className="text-sm font-medium capitalize" style={{ color: theme.colors.text }}>{activeRole}</Text>
          </View>
        </View>
      </Card>

      <Spacer size={24} />

      {/* Sign Out */}
      <Button variant="destructive" size="lg" onPress={handleSignOut} className="w-full">
        <View className="flex-row items-center">
          <LogOut size={18} color="#FFFFFF" />
          <Text className="ml-2 text-base font-semibold text-white">Sign Out</Text>
        </View>
      </Button>

      <Spacer size={40} />
    </Screen>
  );
}
