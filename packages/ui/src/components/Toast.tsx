import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { CheckCircle, XCircle, Info } from "lucide-react-native";
import { useTheme } from "../theme";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 3000,
  visible,
  onDismiss,
}: ToastProps) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-100);
    }
  }, [visible, duration, onDismiss, translateY]);

  if (!visible) return null;

  const colorMap = {
    success: theme.colors.success,
    error: theme.colors.error,
    info: theme.colors.info,
  };

  const IconComponent = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  }[type];

  return (
    <Animated.View
      className="absolute left-4 right-4 top-14 z-50"
      style={{ transform: [{ translateY }] }}
    >
      <View
        className="flex-row items-center rounded-xl px-4 py-3 shadow-lg"
        style={{ backgroundColor: theme.colors.background }}
      >
        <IconComponent size={20} color={colorMap[type]} />
        <Text
          className="ml-3 flex-1 text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
