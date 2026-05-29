import { EditorialForm } from "@/components/admin/editorial-form";
import { EditorialsPanel } from "@/components/admin/editorials-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { createEditorialAction } from "@/app/(private)/panel/editoriales/actions";
import { getEditorials, getEditorialStats } from "@/lib/content/editorials";

export default async function PanelEditorialesPage() {
  const [items, stats] = await Promise.all([getEditorials(), getEditorialStats()]);

  return (
    <AdminShell
      title="Editoriales"
      subtitle="Espacio privado para construir una voz medica de autor con coherencia visual, criterio clinico y alta reutilizacion."
    >
      <EditorialsPanel
        items={items}
        totalEditorials={stats.totalEditorials}
        pendingReview={stats.pendingReview}
        drafts={stats.drafts}
      />
      <EditorialForm action={createEditorialAction} enableAiGenerate />
    </AdminShell>
  );
}
