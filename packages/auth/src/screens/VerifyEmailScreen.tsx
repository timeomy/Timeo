import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import { Mail } from "lucide-react-native";

interface VerifyEmailScreenProps {
  email: string;
  onVerified?: () => void;
  onResend?: () => void;
}

export function VerifyEmailScreen({
  email,
  onVerified,
  onResend,
}: VerifyEmailScreenProps) {
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;

    setResending(true);
    try {
      onResend?.();
      setCooldown(60);
    } finally {
      setResending(false);
    }
  }, [cooldown, onResend]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: logoAnim,
              transform: [{ scale: logoAnim }],
            },
          ]}
        >
          <Mail size={48} color="#FFB300" />
        </Animated.View>

        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentSlide }],
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text style={styles.title}>Verify your email address</Text>
          <Text style={styles.description}>
            We sent a verification link to
          </Text>
          <Text style={styles.email}>{email}</Text>

          <TouchableOpacity
            style={[
              styles.resendButton,
              (cooldown > 0 || resending) && styles.buttonDisabled,
            ]}
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? (
              <ActivityIndicator color="#FFB300" />
            ) : (
              <Text style={styles.resendButtonText}>
                {cooldown > 0 ? `Resend Email (${cooldown}s)` : "Resend Email"}
              </Text>
            )}
          </TouchableOpacity>

          {onVerified && (
            <TouchableOpacity style={styles.button} onPress={onVerified}>
              <Text style={styles.buttonText}>I've Verified My Email</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
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
    alignItems: "center",
    paddingHorizontal: 24,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#EDECE8",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#88878F",
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EDECE8",
    marginBottom: 32,
    textAlign: "center",
  },
  resendButton: {
    borderWidth: 1,
    borderColor: "#FFB300",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  resendButtonText: {
    color: "#FFB300",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#FFB300",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
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
});
