import { useRouter } from "expo-router";
import { SignInScreen } from "@timeo/auth";

export default function SignIn() {
  const router = useRouter();

  return (
    <SignInScreen
      appName="Timeo Admin"
      appSubtitle="Manage your business"
      onSignUp={() => router.replace("/(auth)/sign-up")}
      onSuccess={() => router.replace("/(tabs)")}
      onForgotPassword={() => router.push("/(auth)/forgot-password")}
    />
  );
}
