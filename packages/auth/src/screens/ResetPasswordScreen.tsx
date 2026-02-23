import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { CheckCircle } from "lucide-react-native";
import { authClient } from "../auth-client";

interface ResetPasswordScreenProps {
  token?: string;
  onSuccess?: () => void;
  onBackToSignIn?: () => void;
}

export function ResetPasswordScreen({
  token,
  onSuccess,
  onBackToSignIn,
}: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoAnim, contentAnim, contentSlide]);

  const handleReset = useCallback(async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (result.error) {
        const msg = result.error.message ?? "Failed to reset password";
        if (msg.toLowerCase().includes("expired")) {
          setError("Reset link has expired. Please request a new one.");
        } else if (msg.toLowerCase().includes("invalid")) {
          setError("Invalid reset link. Please request a new one.");
        } else {
          setError(msg);
        }
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, token]);

  if (success) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: contentAnim }]}>
          <View style={styles.iconContainer}>
            <CheckCircle size={48} color="#FFB300" />
          </View>
          <Text style={styles.title}>Password reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been successfully reset.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              onSuccess?.();
              onBackToSignIn?.();
            }}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [{ scale: logoAnim }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>T</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentSlide }],
          }}
        >
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Enter your new password</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#555560"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#555560"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />

          <Text style={styles.hint}>Minimum 8 characters</Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {onBackToSignIn && (
            <TouchableOpacity style={styles.link} onPress={onBackToSignIn}>
              <Text style={styles.linkText}>
                Back to <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFB300",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0B0B0F",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#EDECE8",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#88878F",
    marginBottom: 32,
    textAlign: "center",
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#252530",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#EDECE8",
    marginBottom: 12,
    backgroundColor: "#131318",
  },
  hint: {
    fontSize: 12,
    color: "#555560",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#FFB300",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: "#88878F",
    fontSize: 14,
  },
  linkBold: {
    color: "#FFB300",
    fontWeight: "600",
  },
});
