import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";

export interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color,
  label,
  className,
}: ProgressRingProps) {
  const theme = useTheme();
  const ringColor = color ?? theme.colors.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset =
    circumference - (clampedProgress / 100) * circumference;

  return (
    <View className={`items-center ${className ?? ""}`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center text */}
        <View
          className="absolute items-center justify-center"
          style={{ width: size, height: size }}
        >
          <Text
            className="text-base font-bold"
            style={{ color: theme.colors.text }}
          >
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      </View>
      {label ? (
        <Text
          className="mt-1 text-xs"
          style={{ color: theme.colors.textSecondary }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
