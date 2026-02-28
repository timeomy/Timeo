import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

// TODO: Replace with full sign-in form using @timeo/auth screens
export default function SignInScreen() {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-2xl font-bold mb-8">Sign In to Timeo</Text>
      <Text className="text-gray-500 mb-4">TODO: Implement sign-in form</Text>
      <Link href="/(auth)/sign-up" asChild>
        <TouchableOpacity>
          <Text className="text-primary">Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
