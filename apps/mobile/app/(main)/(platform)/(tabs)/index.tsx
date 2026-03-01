import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LayoutDashboard } from "lucide-react-native";

export default function PlatformDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LayoutDashboard size={48} color="#FFB300" />
        <Text style={styles.title}>Platform Dashboard</Text>
        <Text style={styles.subtitle}>Coming soon — migrating from platform app</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0F" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#EDECE8", marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#88878F", textAlign: "center" },
});
