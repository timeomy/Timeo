import { useRouter } from "expo-router";
import { SignInScreen } from "@timeo/auth";

export default function SignIn() {
  const router = useRouter();

  return (
    <SignInScreen
      onSignUp={() => router.replace("/(auth)/sign-up")}
      onSuccess={() => router.replace("/(tabs)")}
    />
  );
}
