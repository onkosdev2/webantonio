import { EditorialForm } from "@/components/admin/editorial-form";
import { ResearchPanel } from "@/components/admin/research-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { createResearchAction } from "@/app/(private)/panel/investigacion/actions";
import { getResearchItems, getResearchStats } from "@/lib/content/research";

export default async function PanelInvestigacionPage() {
  const [items, stats] = await Promise.all([getResearchItems(), getResearchStats()]);

  return (
    <AdminShell
      title="Investigacion"
      subtitle="Espacio privado para construir piezas de evidencia, lectura critica, biomarcadores y avances oncologicos con identidad propia."
    >
      <ResearchPanel
        items={items}
        totalResearch={stats.totalResearch}
        pendingReview={stats.pendingReview}
        drafts={stats.drafts}
      />
      <EditorialForm
        action={createResearchAction}
        title="Nueva investigacion"
        description="Escribe o genera una pieza de investigacion con resumen, evidencia, cuerpo, etiquetas y estado editorial."
        submitLabel="Guardar investigacion"
        sectionKicker="Editor de Investigacion"
        bodyLabel="Cuerpo de investigacion"
        bodyPlaceholder="Pregunta, contexto, evidencia, lectura critica, aplicacion clinica y cierre."
        backHref="/panel/investigacion"
        backLabel="Volver a investigacion"
        enableAiGenerate
      />
    </AdminShell>
  );
}
