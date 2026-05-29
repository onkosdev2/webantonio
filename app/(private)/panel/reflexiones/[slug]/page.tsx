import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { TextContentForm } from "@/components/admin/text-content-form";
import { getTextContentBySlug } from "@/lib/content/text-content";
import { updateReflectionAction } from "@/app/(private)/panel/reflexiones/actions";

type PanelEditarReflexionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarReflexionPage({
  params
}: PanelEditarReflexionPageProps) {
  const { slug } = await params;
  const item = await getTextContentBySlug(ContentType.REFLECTION, slug);

  if (!item) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Reflexión"
      subtitle="Corrección real de una pieza breve ya persistida, con el mismo nivel editorial del resto del archivo."
    >
      <TextContentForm
        kicker="Editor de Reflexiones"
        title={item.title}
        description="Ajusta el resumen, el cuerpo y el estado editorial. Los cambios quedan persistidos por slug."
        action={updateReflectionAction.bind(null, slug)}
        submitLabel="Guardar cambios"
        backHref="/panel/reflexiones"
        backLabel="Volver a reflexiones"
        bodyLabel="Texto de la reflexión"
        bodyPlaceholder="Idea central, matiz clínico, reflexión breve y cierre."
        initialValues={item}
        enableAiActions
      />
    </AdminShell>
  );
}
