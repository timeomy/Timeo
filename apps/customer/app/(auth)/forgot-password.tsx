import { ForgotPasswordScreen } from "@timeo/auth";
import { useRouter } from "expo-router";

export default function ForgotPassword() {
  const router = useRouter();
  return (
    <ForgotPasswordScreen
      appName="Timeo"
      onBackToSignIn={() => router.back()}
    />
  );
}
