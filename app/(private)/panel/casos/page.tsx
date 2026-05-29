import { ClinicalCasesPanel } from "@/components/admin/clinical-cases-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { getClinicalCases, getClinicalCaseStats } from "@/lib/content/cases";

export default async function PanelCasosPage() {
  const [items, stats] = await Promise.all([
    getClinicalCases(),
    getClinicalCaseStats()
  ]);

  return (
    <AdminShell
      title="Casos Clinicos"
      subtitle="Archivo clinico conectado a base de datos real, con lectura viva y editor operativo para crear y actualizar contenido."
    >
      <ClinicalCasesPanel
        items={items}
        totalCases={stats.totalCases}
        pendingReview={stats.pendingReview}
        publishedCases={stats.publishedCases}
      />
    </AdminShell>
  );
}
