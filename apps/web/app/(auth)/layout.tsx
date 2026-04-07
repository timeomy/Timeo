import Link from "next/link";
import { TimeoLogo } from "@/timeo-logo";
import { LanguageSwitcher } from "@/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0F1E]">
      {/* Top bar */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TimeoLogo size="sm" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-white/20">
        &copy; {new Date().getFullYear()} Timeo. All rights reserved.
      </footer>
    </div>
  );
}
