import { ImportsForm } from "@/components/admin/imports-form";
import { ImportsPanel } from "@/components/admin/imports-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { getImportLogs, getImportStats } from "@/lib/content/imports";
import { createImportAction } from "@/app/(private)/panel/importaciones/actions";

export default async function PanelImportacionesPage() {
  const [items, stats] = await Promise.all([getImportLogs(), getImportStats()]);

  return (
    <AdminShell
      title="Importaciones Externas"
      subtitle="Centro de control para conexiones con redactores, agentes, news bots y otras herramientas del ecosistema híbrido."
    >
      <ImportsPanel
        items={items}
        totalImports={stats.totalImports}
        reviewRequired={stats.reviewRequired}
        validated={stats.validated}
        failedImports={stats.failedImports}
      />
      <ImportsForm action={createImportAction} />
    </AdminShell>
  );
}
