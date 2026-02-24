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
import { Mail } from "lucide-react-native";
import { authClient } from "../auth-client";

interface ForgotPasswordScreenProps {
  /** Navigate back to sign-in screen */
  onBackToSignIn?: () => void;
  /** App display name shown in the header */
  appName?: string;
}

export function ForgotPasswordScreen({
  onBackToSignIn,
  appName = "Timeo",
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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

  const handleSendReset = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "timeo://reset-password",
      });

      if (result.error) {
        const msg = result.error.message ?? "Failed to send reset link";
        if (msg.toLowerCase().includes("user not found") || msg.toLowerCase().includes("no user")) {
          setError("No account found with this email");
        } else {
          setError(msg);
        }
        return;
      }

      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email]);

  if (sent) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: contentAnim }]}>
          <View style={styles.iconContainer}>
            <Mail size={48} color="#FFB300" />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.sentEmail}>{email.trim()}</Text>
          <Text style={styles.description}>
            We've sent a password reset link to your email address.
          </Text>

          {onBackToSignIn && (
            <TouchableOpacity style={styles.button} onPress={onBackToSignIn}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}
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
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#555560"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendReset}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
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
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#EDECE8",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#88878F",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  sentEmail: {
    fontSize: 16,
    color: "#88878F",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#88878F",
    marginBottom: 32,
    lineHeight: 20,
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
