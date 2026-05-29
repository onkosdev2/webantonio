import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { GalleryForm } from "@/components/admin/gallery-form";
import { updateGalleryAssetAction } from "@/app/(private)/panel/galeria/actions";
import { getGalleryAssetById } from "@/lib/content/gallery";

type PanelEditarGaleriaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PanelEditarGaleriaPage({
  params
}: PanelEditarGaleriaPageProps) {
  const { id } = await params;
  const item = await getGalleryAssetById(id);

  if (!item) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Activo de Galería"
      subtitle="Ajusta visibilidad, ruta y vínculo clínico de un activo visual ya registrado."
    >
      <GalleryForm
        title={item.title}
        description="Edita este activo visual y controla si debe aparecer o no en la galería pública."
        action={updateGalleryAssetAction.bind(null, id)}
        submitLabel="Guardar cambios"
        initialValues={item}
      />
    </AdminShell>
  );
}
