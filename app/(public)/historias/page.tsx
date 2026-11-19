import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { ContentType } from "@prisma/client";
import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { getPublishedTextContentItems } from "@/lib/content/text-content";

export const metadata: Metadata = buildPageMetadata({
  title: "Historias de Pacientes con Cáncer | Dr. Antonio Camargo",
  description:
    "Historias reales del cuidado oncológico: experiencias de pacientes y familias contadas con respeto y criterio médico.",
  path: "/historias",
  keywords: ["historias de pacientes con cáncer", "experiencias oncología"]
});


export default async function HistoriasPage() {
  const items = await getPublishedTextContentItems(ContentType.STORY);

  return (
    <PublicCollectionPage
      kicker="Narrativa clínica"
      title="Historias"
      description="Textos con dimension humana y clinica, siempre con prudencia etica, contexto y anonimización."
      signature="Narrativa medica con elegancia, respeto y densidad humana"
      countLabel="historias publicadas"
      itemCount={items.length}
      items={items.map((item) => ({
        href: `/historias/${item.slug}`,
        title: item.title,
        summary: item.summary,
        eyebrow: item.source || "Historia",
        meta: item.tags
      }))}
      emptyTitle="Todavía no hay historias publicadas."
      emptyCopy="Este canal ya tiene flujo editorial real. Las piezas aparecerán aquí cuando estén publicadas."
    />
  );
}
