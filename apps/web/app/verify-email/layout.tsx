import Link from "next/link";
import { Zap } from "lucide-react";

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Timeo</span>
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
