import { ResetPasswordScreen } from "@timeo/auth";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ResetPasswordScreen
      token={token}
      onSuccess={() => router.replace("/(auth)/sign-in")}
      onBackToSignIn={() => router.replace("/(auth)/sign-in")}
    />
  );
}
