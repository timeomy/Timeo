import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRole, useTimeoAuth } from "@timeo/auth";

export default function RoleRouter() {
  const { isLoaded, isSignedIn } = useTimeoAuth();
  const { role, isPlatformAdmin, isAdmin, isStaff } = useRole();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FFB300" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isPlatformAdmin) {
    return <Redirect href="/(main)/(platform)/(tabs)" />;
  }

  if (isAdmin) {
    return <Redirect href="/(main)/(admin)/(tabs)" />;
  }

  if (isStaff) {
    return <Redirect href="/(main)/(staff)/(tabs)" />;
  }

  return <Redirect href="/(main)/(customer)/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
});
