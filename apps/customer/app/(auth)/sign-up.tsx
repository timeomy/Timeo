import { SignUpScreen } from "@timeo/auth";
import { useRouter } from "expo-router";

export default function SignUp() {
  const router = useRouter();
  return (
    <SignUpScreen
      appName="Timeo"
      appSubtitle="Join the community"
      onSignIn={() => router.push("/(auth)/sign-in")}
    />
  );
}
