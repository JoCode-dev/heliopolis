import { generateMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: "Les Camps — Route en Joie 2026",
  description: "Plateforme de la Communauté Mahatma Gandhi · Région d'Abidjan",
  path: "/camps",
  keywords: [
    "Camps",
    "scouts",
    "Communauté Mahatma Gandhi",
    "Abidjan",
    "Route en Joie",
  ],
});
