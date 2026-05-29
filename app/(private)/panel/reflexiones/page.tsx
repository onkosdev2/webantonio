import { AdminShell } from "@/components/admin/admin-shell";
import { TextContentForm } from "@/components/admin/text-content-form";
import { TextContentPanel } from "@/components/admin/text-content-panel";
import { createReflectionAction } from "@/app/(private)/panel/reflexiones/actions";
import { getTextContentItems, getTextContentStats } from "@/lib/content/text-content";
import { ContentType } from "@prisma/client";

export default async function PanelReflexionesPage() {
  const [items, stats] = await Promise.all([
    getTextContentItems(ContentType.REFLECTION),
    getTextContentStats(ContentType.REFLECTION)
  ]);

  return (
    <AdminShell
      title="Reflexiones"
      subtitle="Espacio para pensamiento médico breve, notas de criterio y piezas compactas con salida pública real."
    >
      <TextContentPanel
        items={items}
        totalItems={stats.totalItems}
        pendingReview={stats.pendingReview}
        drafts={stats.drafts}
        published={stats.published}
        eyebrow="Pensamiento Médico"
        title="Reflexiones ya integradas al flujo editorial"
        description="Estas piezas se crean, editan y publican con el mismo circuito editorial que noticias y editoriales."
        emptyTitle="No hay reflexiones todavía."
        emptyCopy="Crea la primera reflexión desde el editor y ya quedará lista para revisión o publicación."
        newHref="/panel/reflexiones#editor"
        editBaseHref="/panel/reflexiones"
        newLabel="Nueva reflexión"
      />
      <TextContentForm
        kicker="Editor de Reflexiones"
        title="Nueva reflexión"
        description="Escribe una nota breve con tono médico, criterio y salida pública."
        action={createReflectionAction}
        submitLabel="Guardar reflexión"
        backHref="/panel/reflexiones"
        backLabel="Volver a reflexiones"
        bodyLabel="Texto de la reflexión"
        bodyPlaceholder="Idea central, matiz clínico, reflexión breve y cierre."
        enableAiGenerate
      />
    </AdminShell>
  );
}
