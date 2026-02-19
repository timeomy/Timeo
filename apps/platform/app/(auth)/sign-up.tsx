import { useRouter } from "expo-router";
import { SignUpScreen } from "@timeo/auth";

export default function SignUp() {
  const router = useRouter();

  return (
    <SignUpScreen
      onSignIn={() => router.replace("/(auth)/sign-in")}
      onSuccess={() => router.replace("/(tabs)")}
    />
  );
}
