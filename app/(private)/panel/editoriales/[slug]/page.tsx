import { notFound } from "next/navigation";
import { EditorialForm } from "@/components/admin/editorial-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { getEditorialBySlug } from "@/lib/content/editorials";
import { updateEditorialAction } from "@/app/(private)/panel/editoriales/actions";

type PanelEditarEditorialPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarEditorialPage({
  params
}: PanelEditarEditorialPageProps) {
  const { slug } = await params;
  const editorial = await getEditorialBySlug(slug);

  if (!editorial) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Editorial"
      subtitle="Revision real de piezas de autor generadas por IA o escritas desde el panel, con persistencia editorial completa."
    >
      <EditorialForm
        title={editorial.title}
        description="Corrige la tesis, el resumen y el cuerpo editorial. Los cambios quedan guardados y el borrador sigue accesible por slug."
        action={updateEditorialAction.bind(null, slug)}
        submitLabel="Guardar cambios"
        initialValues={editorial}
        enableAiActions
      />
    </AdminShell>
  );
}
