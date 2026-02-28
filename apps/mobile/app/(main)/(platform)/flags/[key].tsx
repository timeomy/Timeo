import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

// TODO: Migrate full screen from apps/platform/
export default function FlagDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">Feature Flag Detail</Text>
        <Text className="text-gray-500">TODO: Migrate flag detail for key: {key}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
