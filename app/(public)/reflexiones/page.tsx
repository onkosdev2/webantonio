import { ContentType } from "@prisma/client";
import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { getPublishedTextContentItems } from "@/lib/content/text-content";

export default async function ReflexionesPage() {
  const items = await getPublishedTextContentItems(ContentType.REFLECTION);

  return (
    <PublicCollectionPage
      kicker="Pensamiento Medico"
      title="Reflexiones"
      description="Notas breves sobre incertidumbre, decision clinica, docencia, comunicacion y oficio medico."
      signature="Fragmentos de criterio, oficio y pensamiento oncologico"
      countLabel="reflexiones publicadas"
      itemCount={items.length}
      items={items.map((item) => ({
        href: `/reflexiones/${item.slug}`,
        title: item.title,
        summary: item.summary,
        eyebrow: item.source || "Reflexion",
        meta: item.tags
      }))}
      emptyTitle="Todavía no hay reflexiones publicadas."
      emptyCopy="Las reflexiones ya pueden crearse y editarse desde el panel. Aparecerán aquí cuando estén en estado PUBLISHED."
    />
  );
}
