import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: Migrate full screen from apps/customer/
export default function CustomerBookingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">My Bookings</Text>
        <Text className="text-gray-500">TODO: Migrate bookings list from original app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
