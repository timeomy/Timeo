import React from "react";
import { View, type ViewProps } from "react-native";

export interface RowProps extends Omit<ViewProps, "style"> {
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  children: React.ReactNode;
}

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

export function Row({
  gap = 0,
  align = "center",
  justify = "start",
  wrap = false,
  children,
  className,
  ...props
}: RowProps) {
  return (
    <View
      className={`flex-row ${alignMap[align]} ${justifyMap[justify]} ${wrap ? "flex-wrap" : ""} ${className ?? ""}`}
      style={gap ? { gap } : undefined}
      {...props}
    >
      {children}
    </View>
  );
}
