import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REVA — Herstel Dashboard",
  description: "Jouw persoonlijk herstel dashboard",
};

// viewportFit=cover enables env(safe-area-inset-*) on iPhone notch / home indicator
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
