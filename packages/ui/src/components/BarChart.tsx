import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../theme";

export interface BarChartData {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartData[];
  height?: number;
  barColor?: string;
  showLabels?: boolean;
  showValues?: boolean;
  className?: string;
}

export function BarChart({
  data,
  height = 120,
  barColor,
  showLabels = true,
  showValues = false,
  className,
}: BarChartProps) {
  const theme = useTheme();
  const color = barColor ?? theme.colors.primary;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View className={className}>
      <View
        style={{ height, flexDirection: "row", alignItems: "flex-end" }}
        className="gap-1"
      >
        {data.map((item, i) => {
          const barHeight = Math.max((item.value / maxValue) * height, 2);
          return (
            <View key={i} className="flex-1 items-center">
              {showValues && item.value > 0 ? (
                <Text
                  className="mb-1 text-center text-[10px]"
                  style={{ color: theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              ) : null}
              <View
                style={{
                  height: barHeight,
                  backgroundColor: color,
                  borderRadius: 4,
                  width: "100%",
                  minWidth: 4,
                  opacity: item.value === 0 ? 0.2 : 1,
                }}
              />
            </View>
          );
        })}
      </View>
      {showLabels ? (
        <View className="mt-1.5 flex-row gap-1">
          {data.map((item, i) => (
            <View key={i} className="flex-1 items-center">
              <Text
                className="text-center text-[9px]"
                style={{ color: theme.colors.textSecondary }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
