import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

type Role = "customer" | "staff" | "admin" | "platform_admin";

// TODO: Replace with actual auth hook from @timeo/auth
function useActiveRole(): { role: Role | null; isLoading: boolean } {
  // Stub - will be replaced with real auth context
  return { role: "customer", isLoading: false };
}

export default function RoleRouter() {
  const { role, isLoading } = useActiveRole();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!role) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  switch (role) {
    case "platform_admin":
      return <Redirect href="/(main)/(platform)/(tabs)" />;
    case "admin":
      return <Redirect href="/(main)/(admin)/(tabs)" />;
    case "staff":
      return <Redirect href="/(main)/(staff)/(tabs)" />;
    case "customer":
    default:
      return <Redirect href="/(main)/(customer)/(tabs)" />;
  }
}
