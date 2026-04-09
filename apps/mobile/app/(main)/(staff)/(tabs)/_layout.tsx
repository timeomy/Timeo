import { Tabs, useRouter } from "expo-router";
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  ClipboardList,
  Users,
  History,
  PlusCircle,
} from "lucide-react-native";
import { AuthGuard, RoleGuard, useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { LoadingScreen, useTheme } from "@timeo/ui";
import { View, Text } from "react-native";
import { Building2 } from "lucide-react-native";

function AccessDenied() {
  const theme = useTheme();
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Text
        className="text-center text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        Access Denied
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: theme.colors.textSecondary }}
      >
        You need at least coach-level access to use this app.
      </Text>
    </View>
  );
}

function AuthFallback() {
  const router = useRouter();
  if (router) {
    router.replace("/(auth)/sign-in");
  }
  return <LoadingScreen message="Redirecting to sign in..." />;
}

function TenantAndRoleGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const { tenants, isLoading } = useTenantSwitcher();

  if (isLoading) {
    return <LoadingScreen message="Loading your organization..." />;
  }

  if (tenants.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: theme.colors.background }}
      >
        <Building2 size={32} color={theme.colors.primary} />
        <Text
          className="mt-4 text-xl font-bold text-center"
          style={{ color: theme.colors.text }}
        >
          No Organization Yet
        </Text>
        <Text
          className="mt-2 text-center text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          Ask your business admin to add you as a staff member.
        </Text>
      </View>
    );
  }

  if (!activeTenantId) {
    return <LoadingScreen message="Setting up..." />;
  }

  return (
    <RoleGuard minimumRole="coach" fallback={<AccessDenied />}>
      {children}
    </RoleGuard>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  const { activeRole } = useTimeoAuth();
  const isCoach = activeRole === "coach";

  return (
    <AuthGuard
      loading={<LoadingScreen message="Loading..." />}
      fallback={<AuthFallback />}
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
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: isCoach ? "My Clients" : "Dashboard",
              tabBarIcon: ({ color, size }) => (
                isCoach ? <Users size={size} color={color} /> : <LayoutDashboard size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: isCoach ? "Schedule" : "Bookings",
              tabBarIcon: ({ color, size }) => (
                <CalendarDays size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="products"
            options={{
              title: isCoach ? "Sessions" : "Products",
              href: isCoach ? "/session-logs" : undefined,
              tabBarIcon: ({ color, size }) => (
                isCoach ? <History size={size} color={color} /> : <Package size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="orders"
            options={{
              title: isCoach ? "Log Session" : "Orders",
              href: isCoach ? "/session-logs/create" : undefined,
              tabBarIcon: ({ color, size }) => (
                isCoach ? <PlusCircle size={size} color={color} /> : <ClipboardList size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </TenantAndRoleGate>
    </AuthGuard>
  );
}
