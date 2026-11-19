import { publicSourceText } from "@/lib/content/public-tags";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { ContentType } from "@prisma/client";
import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { getPublishedTextContentItems } from "@/lib/content/text-content";

export const metadata: Metadata = buildPageMetadata({
  title: "Reflexiones sobre Oncología | Dr. Antonio Camargo",
  description:
    "Reflexiones del Dr. Antonio Camargo sobre el vínculo clínico, la esperanza y el acompañamiento a pacientes con cáncer y sus familias.",
  path: "/reflexiones",
  keywords: ["reflexiones oncología", "acompañamiento paciente con cáncer"]
});


export default async function ReflexionesPage() {
  const items = await getPublishedTextContentItems(ContentType.REFLECTION);

  return (
    <PublicCollectionPage
      kicker="Pensamiento médico"
      title="Reflexiones"
      description="Notas breves sobre incertidumbre, decisión clínica, docencia, comunicación y oficio médico."
      signature="Criterio clínico y mirada humana"
      countLabel="reflexiones publicadas"
      itemCount={items.length}
      items={items.map((item) => ({
        href: `/reflexiones/${item.slug}`,
        title: item.title,
        summary: item.summary,
        image: item.image,
        eyebrow: publicSourceText(item.source) || "Reflexión",
        meta: item.tags
      }))}
      emptyTitle="Todavía no hay reflexiones publicadas."
      emptyCopy="Las reflexiones ya pueden crearse y editarse desde el panel. Aparecerán aquí cuando estén en estado PUBLISHED."
    />
  );
}
