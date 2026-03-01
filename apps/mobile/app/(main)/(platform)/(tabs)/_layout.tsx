import { Tabs } from "expo-router";
import { LayoutDashboard, Building2, Flag } from "lucide-react-native";

export default function PlatformTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFB300",
        tabBarInactiveTintColor: "#88878F",
        tabBarStyle: {
          backgroundColor: "#0B0B0F",
          borderTopColor: "#252530",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: "Tenants",
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="flags"
        options={{
          title: "Feature Flags",
          tabBarIcon: ({ color, size }) => <Flag size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
