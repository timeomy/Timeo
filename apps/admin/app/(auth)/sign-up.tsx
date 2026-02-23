import { useRouter } from "expo-router";
import { SignUpScreen } from "@timeo/auth";

export default function SignUp() {
  const router = useRouter();

  return (
    <SignUpScreen
      appName="Timeo Admin"
      appSubtitle="Set up your business"
      onSignIn={() => router.replace("/(auth)/sign-in")}
      onSuccess={() => router.replace("/(tabs)")}
    />
  );
}
