import { CURRENCY_SYMBOL, DEFAULT_CURRENCY } from "./constants";

/** Format price from cents to display string (e.g. 1500 -> "RM 15.00") */
export function formatPrice(
  amountCents: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const amount = (amountCents / 100).toFixed(2);
  return `${symbol} ${amount}`;
}

/** Format unix ms timestamp or ISO string to locale date string */
export function formatDate(timestamp: number | string): string {
  return new Date(timestamp).toLocaleDateString();
}

/** Format unix ms timestamp or ISO string to locale time string */
export function formatTime(timestamp: number | string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format unix ms timestamp or ISO string to relative time (e.g. "2 hours ago") */
export function formatRelativeTime(timestamp: number | string): string {
  const timestampMs = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestampMs);
}

/** Generate slug from string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Get initials from name (e.g. "John Doe" -> "JD") */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
