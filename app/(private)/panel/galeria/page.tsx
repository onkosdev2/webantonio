import { AdminShell } from "@/components/admin/admin-shell";
import { GalleryForm } from "@/components/admin/gallery-form";
import { GalleryPanel } from "@/components/admin/gallery-panel";
import { createGalleryAssetAction } from "@/app/(private)/panel/galeria/actions";
import { getGalleryAssets, getGalleryStats } from "@/lib/content/gallery";

export default async function PanelGaleriaPage() {
  const [items, stats] = await Promise.all([getGalleryAssets(), getGalleryStats()]);

  return (
    <AdminShell
      title="Galería Clínica"
      subtitle="Archivo visual con visibilidad pública controlada y relación opcional con piezas clínicas o editoriales."
    >
      <GalleryPanel
        items={items}
        totalAssets={stats.totalAssets}
        publicAssets={stats.publicAssets}
        sensitiveAssets={stats.sensitiveAssets}
      />
      <GalleryForm action={createGalleryAssetAction} />
    </AdminShell>
  );
}
