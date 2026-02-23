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
import { authClient } from "../auth-client";

interface SignUpScreenProps {
  /** Navigate to sign-in screen */
  onSignIn?: () => void;
  /** Called after successful sign-up */
  onSuccess?: () => void;
  /** App display name shown in the header */
  appName?: string;
  /** Subtitle shown below the app name */
  appSubtitle?: string;
}

export function SignUpScreen({
  onSignIn,
  onSuccess,
  appName = "Timeo",
  appSubtitle = "Create your account",
}: SignUpScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(formSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoAnim, titleAnim, titleSlide, formAnim, formSlide, buttonAnim]);

  const handleSignUp = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message ?? "Sign-up failed. Please try again.");
        return;
      }

      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign-up failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [name, email, password, onSuccess]);

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
            opacity: titleAnim,
            transform: [{ translateY: titleSlide }],
          }}
        >
          <Text style={styles.title}>{appName}</Text>
          <Text style={styles.subtitle}>{appSubtitle}</Text>
        </Animated.View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Animated.View
          style={{
            opacity: formAnim,
            transform: [{ translateY: formSlide }],
          }}
        >
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#555560"
            value={name}
            onChangeText={setName}
            textContentType="name"
            autoComplete="name"
          />

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

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#555560"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
        </Animated.View>

        <Animated.View style={{ opacity: buttonAnim }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading || !name.trim() || !email.trim() || !password}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {onSignIn && (
            <TouchableOpacity style={styles.link} onPress={onSignIn}>
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={styles.linkBold}>Sign in</Text>
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
