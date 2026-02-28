import { Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: Migrate full screen from apps/customer/
export default function QrCodeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-2">QR Code</Text>
        <Text className="text-gray-500">TODO: Migrate QR code screen from original app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
