import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = "https://www.reva-app.nl";
const SITE_DESCRIPTION = "REVA App is het herstel dashboard en behandelplatform voor fysiotherapiepraktijken en hun patiënten: grip op je herstel, van intake tot afsluiting.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "REVA App: Grip op je herstel",
    template: "%s · REVA App",
  },
  description: SITE_DESCRIPTION,
  applicationName: "REVA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "REVA",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "REVA App",
    title: "REVA App: Grip op je herstel",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "REVA App: Grip op je herstel",
    description: SITE_DESCRIPTION,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "REVA App",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/reva-icon-512.png`,
  description: SITE_DESCRIPTION,
};

// viewportFit=cover enables env(safe-area-inset-*) on iPhone notch / home indicator.
// Op het web mag de gebruiker knijp-zoomen (toegankelijkheid, WCAG 1.4.4);
// inzoomen bij het typen voorkomen we doordat alle invoervelden op telefoon
// 16px zijn (components/ui/Field.tsx). Alleen in de native app blijft zoomen
// uit, zoals gebruikelijk voor app-interfaces.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  ...(process.env.NEXT_BUILD_TARGET === "capacitor" ? { maximumScale: 1 } : {}),
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
