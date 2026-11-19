import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Dr. Antonio Camargo | Oncólogo en Lima y Consulta Remota",
  description:
    "Oncólogo clínico en Lima con consulta presencial y remota para pacientes de provincias y del extranjero. Casos clínicos, noticias e investigación.",
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
