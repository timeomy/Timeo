import React, { useEffect, useRef } from "react";
import { Animated, type ViewProps } from "react-native";
import { useTheme } from "../theme";

export interface SkeletonProps extends Omit<ViewProps, "style"> {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className,
  ...props
}: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: theme.colors.border,
        opacity,
      }}
      {...props}
    />
  );
}
