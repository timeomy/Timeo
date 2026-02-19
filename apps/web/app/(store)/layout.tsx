"use client";

import { NavHeader } from "../../components/nav-header";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Timeo</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/services"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Services
              </Link>
              <Link
                href="/products"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Products
              </Link>
              <Link
                href="/bookings"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Bookings
              </Link>
              <Link
                href="/orders"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Orders
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Timeo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
