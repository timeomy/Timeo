import { useRouter } from "expo-router";
import { SignUpScreen } from "@timeo/auth";

export default function SignUp() {
  const router = useRouter();

  return (
    <SignUpScreen
      appName="Timeo Staff"
      appSubtitle="Get started"
      onSignIn={() => router.push("/(auth)/sign-in")}
      onSuccess={() => router.replace("/(tabs)")}
    />
  );
}
