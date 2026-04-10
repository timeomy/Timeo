"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/theme-toggle";

const ROUTES_WITH_LOCAL_THEME_TOGGLE = [
  "/admin",
  "/bookings",
  "/change-password",
  "/dashboard",
  "/forgot-password",
  "/join",
  "/notifications",
  "/onboarding",
  "/orders",
  "/platform",
  "/portal",
  "/post-login",
  "/products",
  "/profile",
  "/reset-password",
  "/services",
  "/sign-in",
  "/sign-up",
  "/verify-email",
] as const;

function routeHasLocalToggle(pathname: string): boolean {
  return ROUTES_WITH_LOCAL_THEME_TOGGLE.some((route) => {
    if (pathname === route) return true;
    return pathname.startsWith(`${route}/`);
  });
}

export function GlobalThemeToggle() {
  const pathname = usePathname();

  if (routeHasLocalToggle(pathname)) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[100]">
      <ThemeToggle />
    </div>
  );
}
