import { useRouter } from "expo-router";
import { ResetPasswordScreen } from "@timeo/auth";

export default function ResetPassword() {
  const router = useRouter();

  return (
    <ResetPasswordScreen
      onBackToSignIn={() => router.push("/(auth)/sign-in")}
    />
  );
}
