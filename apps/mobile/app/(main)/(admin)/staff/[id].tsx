import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

// TODO: Migrate full screen from apps/admin/
export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">Staff Detail</Text>
        <Text className="text-gray-500">TODO: Migrate staff detail for ID: {id}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
