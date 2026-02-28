import { Tabs } from "expo-router";

export default function PlatformTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="tenants" options={{ title: "Tenants" }} />
      <Tabs.Screen name="clients" options={{ title: "Clients" }} />
      <Tabs.Screen name="flags" options={{ title: "Flags" }} />
    </Tabs>
  );
}
