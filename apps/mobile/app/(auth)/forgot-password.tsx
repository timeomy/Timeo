import { useRouter } from "expo-router";
import { ForgotPasswordScreen } from "@timeo/auth";

export default function ForgotPassword() {
  const router = useRouter();

  return (
    <ForgotPasswordScreen
      onBackToSignIn={() => router.push("/(auth)/sign-in")}
    />
  );
}
