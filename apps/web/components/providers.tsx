"use client";

import { ReactNode } from "react";
import { TimeoWebAuthProvider } from "@timeo/auth/web";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TimeoWebAuthProvider
      convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL as string}
    >
      {children}
    </TimeoWebAuthProvider>
  );
}
