"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@timeo/ui/web";
import { useTheme } from "@/providers";

export function ThemeToggle({ className }: { className?: string }) {
  const { mounted, resolvedTheme, toggleTheme } = useTheme();

  if (!mounted) {
    return <div className={cn("h-9 w-9 rounded-md border border-border/70", className)} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/80 bg-card/80 text-foreground transition-colors hover:bg-muted",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}
