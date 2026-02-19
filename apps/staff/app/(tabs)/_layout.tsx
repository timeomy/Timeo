import { Tabs, useRouter } from "expo-router";
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  ClipboardList,
} from "lucide-react-native";
import { AuthGuard, RoleGuard } from "@timeo/auth";
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
        className="text-center text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        Access Denied
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: theme.colors.textSecondary }}
      >
        You need at least staff-level access to use this app.
      </Text>
    </View>
  );
}

function AuthFallback() {
  const router = useRouter();
  // Redirect to sign-in when not authenticated
  if (router) {
    router.replace("/(auth)/sign-in");
  }
  return <LoadingScreen message="Redirecting to sign in..." />;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard
      loading={<LoadingScreen message="Loading..." />}
      fallback={<AuthFallback />}
    >
      <RoleGuard minimumRole="staff" fallback={<AccessDenied />}>
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
              title: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <LayoutDashboard size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: "Bookings",
              tabBarIcon: ({ color, size }) => (
                <CalendarDays size={size} color={color} />
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
            name="orders"
            options={{
              title: "Orders",
              tabBarIcon: ({ color, size }) => (
                <ClipboardList size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </RoleGuard>
    </AuthGuard>
  );
}
