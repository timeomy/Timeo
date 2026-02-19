import React from "react";
import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { LayoutDashboard, Building2, Flag, Settings } from "lucide-react-native";
import { AuthGuard, RoleGuard } from "@timeo/auth";
import { LoadingScreen, useTheme } from "@timeo/ui";

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
        You must be a platform administrator to access this app.
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard loading={<LoadingScreen message="Authenticating..." />}>
      <RoleGuard
        allowedRoles={["platform_admin"]}
        fallback={<AccessDenied />}
      >
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
            name="tenants"
            options={{
              title: "Tenants",
              tabBarIcon: ({ color, size }) => (
                <Building2 size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="flags"
            options={{
              title: "Flags",
              tabBarIcon: ({ color, size }) => (
                <Flag size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="config"
            options={{
              title: "Config",
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
