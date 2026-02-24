import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Settings,
  Building2,
} from "lucide-react-native";
import { AuthGuard, RoleGuard, useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { LoadingScreen, useTheme } from "@timeo/ui";
import { View, Text } from "react-native";

function AccessDenied() {
  const theme = useTheme();
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Text
        className="text-center text-lg font-bold"
        style={{ color: theme.colors.text }}
      >
        Access Denied
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: theme.colors.textSecondary }}
      >
        You need admin permissions to use this app.
      </Text>
    </View>
  );
}

function AuthRedirect() {
  const router = useRouter();
  const { isLoaded } = useTimeoAuth();

  if (isLoaded) {
    setTimeout(() => router.replace("/(auth)/sign-in"), 0);
  }

  return <LoadingScreen message="Redirecting..." />;
}

/**
 * Redirects to onboarding when user has no tenant memberships.
 * Shows loading while tenants are being fetched.
 */
function OnboardingRedirect() {
  const router = useRouter();
  const theme = useTheme();
  const { tenants, isLoading } = useTenantSwitcher();

  useEffect(() => {
    if (!isLoading && tenants.length === 0) {
      router.replace("/onboarding" as any);
    }
  }, [isLoading, tenants.length, router]);

  if (isLoading) {
    return <LoadingScreen message="Loading your organization..." />;
  }

  // tenants.length > 0 but activeTenantId still null — waiting for auto-select
  if (tenants.length > 0) {
    return <LoadingScreen message="Setting up..." />;
  }

  // Redirect in progress
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Building2 size={32} color={theme.colors.primary} />
      <Text
        className="mt-4 text-base"
        style={{ color: theme.colors.textSecondary }}
      >
        Redirecting to setup...
      </Text>
    </View>
  );
}

/**
 * Wraps children and handles:
 * 1. No tenants → redirect to onboarding
 * 2. Has tenant but not admin → show Access Denied
 * 3. Has tenant + admin → show children
 */
function TenantAndRoleGate({ children }: { children: React.ReactNode }) {
  const { activeTenantId } = useTimeoAuth();

  if (!activeTenantId) {
    return <OnboardingRedirect />;
  }

  return (
    <RoleGuard minimumRole="admin" fallback={<AccessDenied />}>
      {children}
    </RoleGuard>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard
      loading={<LoadingScreen message="Loading..." />}
      fallback={<AuthRedirect />}
    >
      <TenantAndRoleGate>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <LayoutDashboard size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="staff"
            options={{
              title: "Staff",
              tabBarIcon: ({ color, size }) => (
                <Users size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="services"
            options={{
              title: "Services",
              tabBarIcon: ({ color, size }) => (
                <Briefcase size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="products"
            options={{
              title: "Products",
              tabBarIcon: ({ color, size }) => (
                <Package size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ color, size }) => (
                <Settings size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </TenantAndRoleGate>
    </AuthGuard>
  );
}
