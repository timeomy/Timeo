import React from "react";
import { Text } from "react-native";
import { useTheme } from "../theme";

export interface DateTimeDisplayProps {
  timestamp: number; // unix ms
  format?: "relative" | "absolute";
  className?: string;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    // Future
    const absDays = Math.abs(days);
    const absHours = Math.abs(hours);
    const absMinutes = Math.abs(minutes);
    if (absDays > 0) return `in ${absDays}d`;
    if (absHours > 0) return `in ${absHours}h`;
    if (absMinutes > 0) return `in ${absMinutes}m`;
    return "just now";
  }

  if (days > 30) return new Date(timestamp).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function getAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DateTimeDisplay({
  timestamp,
  format = "relative",
  className,
}: DateTimeDisplayProps) {
  const theme = useTheme();
  const text =
    format === "relative"
      ? getRelativeTime(timestamp)
      : getAbsoluteTime(timestamp);

  return (
    <Text
      className={`text-sm ${className ?? ""}`}
      style={{ color: theme.colors.textSecondary }}
    >
      {text}
    </Text>
  );
}
