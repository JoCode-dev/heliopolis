import { generateMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: "Activation — Route en Joie 2026",
  description:
    "Active ton profil avec ton matricule national et retrouve ta communauté.",
  path: "/activation",
  keywords: [
    "Activation",
    "scouts",
    "Communauté Mahatma Gandhi",
    "Abidjan",
    "Route en Joie",
  ],
});
