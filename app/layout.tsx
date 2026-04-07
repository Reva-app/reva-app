import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REVA — Herstel Dashboard",
  description: "Jouw persoonlijk herstel dashboard",
  applicationName: "REVA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "REVA",
  },
  formatDetection: {
    telephone: false,
  },
};

// viewportFit=cover enables env(safe-area-inset-*) on iPhone notch / home indicator
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#e8632a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
