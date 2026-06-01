import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "Le Codex des Gardiens — Route en Joie 2026",
  description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
  openGraph: {
    title: "Le Codex des Gardiens — Route en Joie 2026",
    description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
    siteName: "Codex des Gardiens",
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/logo.jpeg' }],
  },
  twitter: {
    card: 'summary',
    title: "Le Codex des Gardiens — Route en Joie 2026",
    description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
    images: ['/logo.jpeg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <Script
          id="remove-simulator-preloader"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                document
                  .querySelectorAll('.simulator-pre-loader.simulator')
                  .forEach(function (node) { node.remove(); });
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
