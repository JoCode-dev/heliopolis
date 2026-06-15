import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { SerwistProvider } from "@/components/pwa/serwist-provider";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/metadata";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const APP_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: APP_TITLE,
  description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Codex",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: APP_TITLE,
    description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
    siteName: SITE_NAME,
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/logo.jpeg' }],
  },
  twitter: {
    card: 'summary',
    title: APP_TITLE,
    description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
    images: ['/logo.jpeg'],
  },
};

export const viewport: Viewport = {
  themeColor: "#C62828",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("h-full", "font-sans", inter.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
