import { useRouter } from "expo-router";
import { SignInScreen } from "@timeo/auth";

export default function SignIn() {
  const router = useRouter();

  return (
    <SignInScreen
      appName="Timeo Staff"
      appSubtitle="Manage daily operations"
      onSignUp={() => router.push("/(auth)/sign-up")}
      onSuccess={() => router.replace("/(tabs)")}
      onForgotPassword={() => router.push("/(auth)/forgot-password")}
    />
  );
}
