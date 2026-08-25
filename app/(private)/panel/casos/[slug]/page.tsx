import { notFound } from "next/navigation";
import { ClinicalCaseForm } from "@/components/admin/clinical-case-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { getClinicalCaseBySlug } from "@/lib/content/cases";
import { updateClinicalCaseAction } from "@/app/(private)/panel/casos/actions";

type PanelEditarCasoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarCasoPage({
  params
}: PanelEditarCasoPageProps) {
  const { slug } = await params;
  const clinicalCase = await getClinicalCaseBySlug(slug);

  if (!clinicalCase) {
    notFound();
  }

  return (
    <AdminShell
      title="Editar Caso Clinico"
      subtitle="Edicion real sobre datos persistidos. Desde aqui ya puedes mantener y enriquecer tu archivo clinico."
    >
      <ClinicalCaseForm
        title={clinicalCase.title}
        description="Actualiza el caso, su metadata oncologica y las notas de revision. Los cambios quedan guardados en Prisma."
        action={updateClinicalCaseAction.bind(null, slug)}
        submitLabel="Actualizar caso"
        initialValues={clinicalCase}
        enableAiActions
        caseSlug={clinicalCase.slug}
        publicHref={`/casos-clinicos/${clinicalCase.slug}`}
        mediaAssets={clinicalCase.mediaAssets}
        visualPlan={clinicalCase.visualPlan}
      />
    </AdminShell>
  );
}
