import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { Providers } from "../components/providers";
import { GlobalThemeToggle } from "@/global-theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeo - Business Operating System",
  description:
    "Multi-tenant platform for bookings and commerce operations",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

const themeInitializerScript = `
(() => {
  try {
    const storageKey = "timeo-theme";
    const savedTheme = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
      ? savedTheme
      : "system";
    const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  } catch (_) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <GlobalThemeToggle />
          <Suspense
            fallback={(
              <div className="p-6">
                <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
              </div>
            )}
          >
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
