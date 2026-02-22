import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../components/providers";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
