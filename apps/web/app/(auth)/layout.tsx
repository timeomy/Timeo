import Link from "next/link";
import { TimeoLogo } from "@/timeo-logo";
import { ThemeToggle } from "@/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TimeoLogo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Timeo. All rights reserved.
      </footer>
    </div>
  );
}
