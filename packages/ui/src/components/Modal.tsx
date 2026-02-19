import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const theme = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            className="rounded-t-3xl px-5 pb-8 pt-3"
            style={{ backgroundColor: theme.colors.background }}
          >
            <View className="mb-3 items-center">
              <View
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: theme.colors.border }}
              />
            </View>
            <View className="mb-4 flex-row items-center justify-between">
              {title ? (
                <Text
                  className="text-lg font-bold"
                  style={{ color: theme.colors.text }}
                >
                  {title}
                </Text>
              ) : (
                <View />
              )}
              <TouchableOpacity
                onPress={onClose}
                className="rounded-full p-1"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}
