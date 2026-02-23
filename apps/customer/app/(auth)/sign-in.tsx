import { SignInScreen } from "@timeo/auth";
import { useRouter } from "expo-router";

export default function SignIn() {
  const router = useRouter();
  return (
    <SignInScreen
      appName="Timeo"
      appSubtitle="Book services & shop products"
      onSignUp={() => router.push("/(auth)/sign-up")}
      onForgotPassword={() => router.push("/(auth)/forgot-password")}
    />
  );
}
