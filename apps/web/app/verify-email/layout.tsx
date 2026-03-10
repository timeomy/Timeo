import Link from "next/link";
import { TimeoLogo } from "@/timeo-logo";

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <TimeoLogo size="md" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center bg-muted/30 p-4">
        {children}
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Timeo. All rights reserved.
      </footer>
    </div>
  );
}
