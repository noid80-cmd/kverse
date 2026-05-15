import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import ServiceWorker from "@/app/components/ServiceWorker";
import DesktopGate from "@/app/components/DesktopGate";

export const metadata: Metadata = {
  title: "Kverse - K-pop Universe",
  description: "K-pop cover video community platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kverse",
  },
  other: {
    google: "notranslate",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#E91E8C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className="h-full">
      <body className="min-h-full flex flex-col">
        <LanguageProvider><DesktopGate>{children}</DesktopGate></LanguageProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
