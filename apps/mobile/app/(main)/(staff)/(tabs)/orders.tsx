import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: Migrate full screen from apps/staff/
export default function StaffOrdersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">Orders</Text>
        <Text className="text-gray-500">TODO: Migrate staff orders from original app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
