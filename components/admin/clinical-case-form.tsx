import { ContentStatus } from "@prisma/client";
import { AiWaitActions } from "@/components/admin/ai-wait-actions";
import { CasePrivacyConfirmation } from "@/components/admin/case-privacy-confirmation";
import {
  ClinicalCaseEditor,
  type CaseMediaAsset,
  type CaseVisualPlan
} from "@/components/admin/clinical-case-editor";

type ClinicalCaseFormValues = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  status: ContentStatus;
  tags: string[];
  tumorType: string;
  stage: string;
  biomarkers: string[];
  treatmentLine: string;
  treatmentPlan: string;
  response: string;
  toxicities: string[];
  evidenceLevel: string;
  reviewNotes: string;
  anonymized: boolean;
};

type ClinicalCaseFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initialValues?: ClinicalCaseFormValues;
  enableAiGenerate?: boolean;
  enableAiActions?: boolean;
  caseSlug?: string;
  publicHref?: string;
  mediaAssets?: CaseMediaAsset[];
  visualPlan?: CaseVisualPlan | null;
};

const emptyValues: ClinicalCaseFormValues = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  status: ContentStatus.DRAFT,
  tags: [],
  tumorType: "",
  stage: "",
  biomarkers: [],
  treatmentLine: "",
  treatmentPlan: "",
  response: "",
  toxicities: [],
  evidenceLevel: "",
  reviewNotes: "",
  anonymized: false
};

export function ClinicalCaseForm({
  title,
  description,
  action,
  submitLabel,
  initialValues = emptyValues,
  enableAiGenerate = false,
  enableAiActions = false,
  caseSlug,
  publicHref,
  mediaAssets = [],
  visualPlan = null
}: ClinicalCaseFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">Editor de Casos</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <form action={action} className="case-form">
        <div className="case-editor-commandbar" aria-label="Acciones de la entrada">
          <div className="case-editor-navigation">
            <a className="button secondary" href="/panel/casos">
              Volver al listado
            </a>
            {publicHref ? (
              <a
                className="button secondary case-view-entry"
                href={publicHref}
                target="_blank"
                rel="noreferrer"
              >
                Ver entrada
              </a>
            ) : null}
          </div>

          <div className="case-editor-publish-actions">
            <button
              className="button secondary"
              type="submit"
              name="intent"
              value="save_draft"
            >
              {submitLabel}
            </button>
            <button
              className="button secondary"
              type="submit"
              name="intent"
              value="send_review"
            >
              Enviar a revisión
            </button>
            <button
              className="button primary"
              type="submit"
              name="intent"
              value="publish"
            >
              Publicar
            </button>
          </div>
        </div>

        <AiWaitActions
          enableAiGenerate={enableAiGenerate}
          enableAiActions={enableAiActions}
        />

        <div className="case-form-grid">
          <label className="case-field case-field-span-2">
            <span>Titulo</span>
            <input name="title" defaultValue={initialValues.title} required />
          </label>

          <label className="case-field">
            <span>Slug</span>
            <input
              name="slug"
              defaultValue={initialValues.slug}
              placeholder="se genera si lo dejas vacio"
            />
          </label>

          <label className="case-field">
            <span>Estado</span>
            <select name="status" defaultValue={initialValues.status}>
              {Object.values(ContentStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="case-field case-field-span-2">
            <span>Resumen</span>
            <textarea name="summary" rows={4} defaultValue={initialValues.summary} required />
          </label>

          <div className="case-field case-field-span-2">
            <span>Cuerpo del caso</span>
            <ClinicalCaseEditor
              name="body"
              defaultValue={initialValues.body}
              caseSlug={caseSlug}
              initialAssets={mediaAssets}
              initialVisualPlan={visualPlan}
            />
          </div>

          <label className="case-field">
            <span>Tipo de tumor</span>
            <input name="tumorType" defaultValue={initialValues.tumorType} />
          </label>

          <label className="case-field">
            <span>Estadio</span>
            <input name="stage" defaultValue={initialValues.stage} />
          </label>

          <label className="case-field">
            <span>Biomarcadores</span>
            <input
              name="biomarkers"
              defaultValue={initialValues.biomarkers.join(", ")}
              placeholder="EGFR, ALK, HER2"
            />
          </label>

          <label className="case-field">
            <span>Linea terapeutica</span>
            <input name="treatmentLine" defaultValue={initialValues.treatmentLine} />
          </label>

          <label className="case-field case-field-span-2">
            <span>Plan de tratamiento</span>
            <textarea
              name="treatmentPlan"
              rows={3}
              defaultValue={initialValues.treatmentPlan}
            />
          </label>

          <label className="case-field">
            <span>Respuesta</span>
            <input name="response" defaultValue={initialValues.response} />
          </label>

          <label className="case-field">
            <span>Toxicidades</span>
            <input
              name="toxicities"
              defaultValue={initialValues.toxicities.join(", ")}
              placeholder="fatiga, neuropatia, neutropenia"
            />
          </label>

          <label className="case-field">
            <span>Nivel de evidencia</span>
            <input name="evidenceLevel" defaultValue={initialValues.evidenceLevel} />
          </label>

          <label className="case-field">
            <span>Etiquetas</span>
            <input
              name="tags"
              defaultValue={initialValues.tags.join(", ")}
              placeholder="pulmon, docencia, terapia dirigida"
            />
          </label>

          <label className="case-field case-field-span-2">
            <span>Notas de revision</span>
            <textarea name="reviewNotes" rows={4} defaultValue={initialValues.reviewNotes} />
          </label>

          <CasePrivacyConfirmation defaultChecked={initialValues.anonymized} />
        </div>

      </form>
    </section>
  );
}
