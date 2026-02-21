import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  leftAction?: {
    icon?: IconComponent;
    onPress: () => void;
  };
  rightActions?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  onBack,
  leftAction,
  rightActions,
  className,
}: HeaderProps) {
  const theme = useTheme();

  const backHandler = leftAction?.onPress ?? onBack;
  const BackIcon = leftAction?.icon ?? ChevronLeft;

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${className ?? ""}`}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View className="min-w-[40px]">
        {backHandler ? (
          <TouchableOpacity
            onPress={backHandler}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <BackIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text
        className="flex-1 text-center text-lg font-bold"
        style={{ color: theme.colors.text }}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View className="min-w-[40px] items-end">{rightActions ?? null}</View>
    </View>
  );
}
