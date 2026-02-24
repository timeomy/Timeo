import { Redirect, Tabs } from "expo-router";
import { View, Text } from "react-native";
import {
  Home,
  Briefcase,
  ShoppingBag,
  CalendarDays,
  User,
  Building2,
} from "lucide-react-native";
import { useTheme, LoadingScreen } from "@timeo/ui";
import { AuthGuard, TenantGuard, useTenantSwitcher } from "@timeo/auth";

function NoTenantFallback() {
  const theme = useTheme();
  const { isLoading } = useTenantSwitcher();

  if (isLoading) {
    return <LoadingScreen message="Loading your organization..." />;
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: theme.colors.primary + "15",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Building2 size={32} color={theme.colors.primary} />
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: theme.colors.text,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        No Organization Yet
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: theme.colors.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        You haven't joined any organization.{"\n"}
        Ask the business to add you as a customer, or check back later.
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard
      loading={<LoadingScreen message="Loading..." />}
      fallback={<Redirect href="/(auth)/sign-in" />}
    >
      <TenantGuard fallback={<NoTenantFallback />}>
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
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} />
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
              <ShoppingBag size={size} color={color} />
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
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      </TenantGuard>
    </AuthGuard>
  );
}
