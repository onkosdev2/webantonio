import { notFound } from "next/navigation";
import { EditorialForm } from "@/components/admin/editorial-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { getResearchBySlug } from "@/lib/content/research";
import { updateResearchAction } from "@/app/(private)/panel/investigacion/actions";

type PanelEditarInvestigacionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarInvestigacionPage({
  params
}: PanelEditarInvestigacionPageProps) {
  const { slug } = await params;
  const item = await getResearchBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Investigacion"
      subtitle="Revision de piezas de evidencia generadas por IA o escritas desde el panel, con publicacion independiente."
    >
      <EditorialForm
        title={item.title}
        description="Corrige la pregunta, el resumen, la evidencia y el cuerpo. Los cambios quedan guardados y el borrador sigue accesible por slug."
        action={updateResearchAction.bind(null, slug)}
        submitLabel="Guardar cambios"
        initialValues={item}
        sectionKicker="Editor de Investigacion"
        bodyLabel="Cuerpo de investigacion"
        bodyPlaceholder="Pregunta, contexto, evidencia, lectura critica, aplicacion clinica y cierre."
        backHref="/panel/investigacion"
        backLabel="Volver a investigacion"
        enableAiActions
      />
    </AdminShell>
  );
}
