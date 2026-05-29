import { ClinicalCaseForm } from "@/components/admin/clinical-case-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { createClinicalCaseAction } from "@/app/(private)/panel/casos/actions";

export default function PanelNuevoCasoPage() {
  return (
    <AdminShell
      title="Nuevo Caso Clinico"
      subtitle="Primer editor operativo del panel privado. Crea un caso con persistencia real en Prisma y base local."
    >
      <ClinicalCaseForm
        title="Crear caso clinico"
        description="Completa los campos clave del caso. El formulario ya guarda en la base SQLite y crea su metadata oncologica asociada."
        action={createClinicalCaseAction}
        submitLabel="Guardar caso"
        enableAiGenerate
      />
    </AdminShell>
  );
}
