import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  Flag,
  ShieldAlert,
  LogOut,
} from "lucide-react-native";
import { AuthGuard, useTimeoAuth } from "@timeo/auth";
import { LoadingScreen, useTheme } from "@timeo/ui";
import { usePlatformStats } from "@timeo/api-client";

function PlatformAdminGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { signOut } = useTimeoAuth();
  const { isLoading, isError } = usePlatformStats();

  if (isLoading) {
    return <LoadingScreen message="Verifying access..." />;
  }

  if (isError) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: theme.colors.background }}
      >
        <ShieldAlert size={48} color={theme.colors.primary} />
        <Text
          className="mt-6 text-center text-xl font-bold"
          style={{ color: theme.colors.text }}
        >
          Platform Admin Required
        </Text>
        <Text
          className="mt-3 text-center text-sm leading-5"
          style={{ color: theme.colors.textSecondary }}
        >
          This app is for the Timeo platform team only.{"\n"}
          Contact your administrator to get platform admin access.
        </Text>
        <TouchableOpacity
          onPress={() => signOut()}
          className="mt-8 flex-row items-center gap-2 rounded-xl px-6 py-3"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <LogOut size={16} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, fontWeight: "600" }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AuthGuard loading={<LoadingScreen message="Authenticating..." />}>
      <PlatformAdminGate>
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
            name="clients"
            options={{
              title: "Clients",
              tabBarIcon: ({ color, size }) => (
                <Users size={size} color={color} />
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
        </Tabs>
      </PlatformAdminGate>
    </AuthGuard>
  );
}
