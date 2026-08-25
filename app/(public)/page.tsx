import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Dr. Antonio Camargo | Oncólogo Clínico en Lima y Consulta Remota",
  description:
    "Oncología clínica en Lima, con orientación médica presencial y remota para pacientes de provincias y del extranjero. Casos clínicos, educación oncológica e investigación médica.",
  path: "/",
  keywords: [
    "oncólogo clínico Lima",
    "consulta oncológica Lima",
    "oncología remota Perú",
    "segunda opinión cáncer"
  ]
});

export default function Page() {
  return <HomePage />;
}
