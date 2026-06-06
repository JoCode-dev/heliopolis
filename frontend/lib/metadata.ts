import { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = "Codex des Gardiens";
const DEFAULT_LOCALE = "fr_FR";
const DEFAULT_OG_IMAGE = "/logo.jpeg";

type GenerateMetadataParams = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: {
    url: string;
    alt: string;
  };
  noIndex?: boolean;
  locale?: string;
};

export function generateMetadata({
  title,
  description,
  path,
  keywords = [],
  image = {
    url: DEFAULT_OG_IMAGE,
    alt: "Le Codex des Gardiens — Route en Joie 2026",
  },
  noIndex = false,
  locale = DEFAULT_LOCALE,
}: GenerateMetadataParams): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [
      "Codex des Gardiens",
      "scouts",
      "Communauté Mahatma Gandhi",
      "Abidjan",
      "Route en Joie",
      ...keywords,
    ],
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image.url,
          alt: image.alt,
        },
      ],
      locale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image.url],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}
