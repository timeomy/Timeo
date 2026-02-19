import React from "react";
import { Badge, type BadgeProps } from "./Badge";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "label"> {
  status: string;
}

const statusVariantMap: Record<string, BadgeProps["variant"]> = {
  // Booking statuses
  pending: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "error",
  no_show: "error",
  // Order statuses
  processing: "info",
  shipped: "info",
  delivered: "success",
  refunded: "error",
  failed: "error",
  // Generic
  active: "success",
  inactive: "default",
  draft: "default",
  published: "success",
  archived: "default",
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const variant = statusVariantMap[status.toLowerCase()] ?? "default";
  return <Badge variant={variant} label={formatStatus(status)} {...props} />;
}
