import { useRouter } from "expo-router";
import { SignInScreen } from "@timeo/auth";

export default function SignIn() {
  const router = useRouter();

  return (
    <SignInScreen
      onSignUp={() => router.push("/(auth)/sign-up")}
      onForgotPassword={() => router.push("/(auth)/forgot-password")}
      onSuccess={() => router.replace("/(main)")}
    />
  );
}
