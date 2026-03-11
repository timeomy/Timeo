import Link from "next/link";
import { TimeoLogo } from "@/timeo-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal top bar */}
      <header className="border-b border-border/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <TimeoLogo size="sm" />
          </Link>
        </div>
      </header>

      {/* Centered content area */}
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Timeo. All rights reserved.
      </footer>
    </div>
  );
}
