import React from "react";
import { cn } from "../lib/cn";

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
  height = 160,
  barColor = "hsl(var(--primary))",
  showLabels = true,
  showValues = false,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-1"
        style={{ height }}
      >
        {data.map((item, i) => {
          const barHeight = Math.max((item.value / maxValue) * height, 2);
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              {showValues && item.value > 0 ? (
                <span className="mb-1 text-[10px] text-muted-foreground">
                  {item.value}
                </span>
              ) : null}
              <div
                className="w-full rounded-sm"
                style={{
                  height: barHeight,
                  backgroundColor: barColor,
                  minWidth: 4,
                  opacity: item.value === 0 ? 0.2 : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      {showLabels ? (
        <div className="mt-1.5 flex gap-1">
          {data.map((item, i) => (
            <div
              key={i}
              className="flex-1 truncate text-center text-[10px] text-muted-foreground"
            >
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
