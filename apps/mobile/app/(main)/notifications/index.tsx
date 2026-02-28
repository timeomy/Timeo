import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: Migrate full screen — shared across all roles
export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">Notifications</Text>
        <Text className="text-gray-500">TODO: Migrate notifications from original app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
