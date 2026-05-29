import { ContentType } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { TextContentForm } from "@/components/admin/text-content-form";
import { TextContentPanel } from "@/components/admin/text-content-panel";
import { createStoryAction } from "@/app/(private)/panel/historias/actions";
import { getTextContentItems, getTextContentStats } from "@/lib/content/text-content";

export default async function PanelHistoriasPage() {
  const [items, stats] = await Promise.all([
    getTextContentItems(ContentType.STORY),
    getTextContentStats(ContentType.STORY)
  ]);

  return (
    <AdminShell
      title="Historias"
      subtitle="Narrativa clínica con tratamiento editorial, control de estado y salida pública real."
    >
      <TextContentPanel
        items={items}
        totalItems={stats.totalItems}
        pendingReview={stats.pendingReview}
        drafts={stats.drafts}
        published={stats.published}
        eyebrow="Narrativa Clínica"
        title="Historias ya integradas al archivo y al panel"
        description="Canal narrativo con flujo editorial completo, revisión de estado y salida pública real."
        emptyTitle="No hay historias todavía."
        emptyCopy="Crea la primera historia y podrás revisarla, enriquecerla y publicarla desde esta misma cabina."
        newHref="/panel/historias#editor"
        editBaseHref="/panel/historias"
        newLabel="Nueva historia"
      />
      <TextContentForm
        kicker="Editor de Historias"
        title="Nueva historia"
        description="Escribe una pieza narrativa con dimensión humana y contexto clínico."
        action={createStoryAction}
        submitLabel="Guardar historia"
        backHref="/panel/historias"
        backLabel="Volver a historias"
        bodyLabel="Cuerpo de la historia"
        bodyPlaceholder="Escena clínica, tensión humana, contexto y cierre."
        enableAiGenerate
      />
    </AdminShell>
  );
}
