import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { TextContentForm } from "@/components/admin/text-content-form";
import { getTextContentBySlug } from "@/lib/content/text-content";
import { updateStoryAction } from "@/app/(private)/panel/historias/actions";

type PanelEditarHistoriaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarHistoriaPage({
  params
}: PanelEditarHistoriaPageProps) {
  const { slug } = await params;
  const item = await getTextContentBySlug(ContentType.STORY, slug);

  if (!item) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Historia"
      subtitle="Revisión narrativa persistida, con la misma lógica de guardado que el resto del sistema."
    >
      <TextContentForm
        kicker="Editor de Historias"
        title={item.title}
        description="Corrige la historia, ajusta el tono y decide su estado editorial."
        action={updateStoryAction.bind(null, slug)}
        submitLabel="Guardar cambios"
        backHref="/panel/historias"
        backLabel="Volver a historias"
        bodyLabel="Cuerpo de la historia"
        bodyPlaceholder="Escena clínica, tensión humana, contexto y cierre."
        initialValues={item}
        enableAiActions
      />
    </AdminShell>
  );
}
