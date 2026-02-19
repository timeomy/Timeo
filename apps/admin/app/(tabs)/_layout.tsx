import { Tabs, useRouter } from "expo-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Settings,
} from "lucide-react-native";
import { AuthGuard, RoleGuard, useTimeoAuth } from "@timeo/auth";
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
    // Redirect to sign-in after render
    setTimeout(() => router.replace("/(auth)/sign-in"), 0);
  }

  return <LoadingScreen message="Redirecting..." />;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard
      loading={<LoadingScreen message="Loading..." />}
      fallback={<AuthRedirect />}
    >
      <RoleGuard minimumRole="admin" fallback={<AccessDenied />}>
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
      </RoleGuard>
    </AuthGuard>
  );
}
