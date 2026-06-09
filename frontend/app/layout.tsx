import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "Gardiens de la Création — Héliopolis",
  description: "Plateforme des Gardiens de la Création · Communauté Mahatma Gandhi · Région d'Abidjan",
  openGraph: {
    title: "Gardiens de la Création — Héliopolis",
    description: "Plateforme des Gardiens de la Création · Communauté Mahatma Gandhi · Région d'Abidjan",
    siteName: "Héliopolis",
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/logo.jpeg' }],
  },
  twitter: {
    card: 'summary',
    title: "Gardiens de la Création — Héliopolis",
    description: "Plateforme des Gardiens de la Création · Communauté Mahatma Gandhi · Région d'Abidjan",
    images: ['/logo.jpeg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("h-full", "font-sans", inter.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
