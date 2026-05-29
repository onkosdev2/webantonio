import { ContentStatus } from "@prisma/client";

type NewsFormValues = {
  title: string;
  slug: string;
  source: string;
  summary: string;
  body: string;
  status: ContentStatus;
  tumorType: string;
  biomarkers: string[];
  tags: string[];
};

type NewsFormProps = {
  action: (formData: FormData) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  initialValues?: NewsFormValues;
  enableAiGenerate?: boolean;
  enableAiActions?: boolean;
};

const emptyValues: NewsFormValues = {
  title: "",
  slug: "",
  source: "",
  summary: "",
  body: "",
  status: ContentStatus.PENDING_REVIEW,
  tumorType: "",
  biomarkers: [],
  tags: []
};

export function NewsForm({
  action,
  title = "Nueva noticia oncológica",
  description = "Crea un borrador editorial con fuente, resumen clínico y metadatos oncológicos.",
  submitLabel = "Guardar noticia",
  initialValues = emptyValues,
  enableAiGenerate = false,
  enableAiActions = false
}: NewsFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel" id="editor">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">Editor de Noticias</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <form action={action} className="case-form">
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
            <span>Fuente</span>
            <input
              name="source"
              defaultValue={initialValues.source}
              placeholder="ASCO, NEJM, FDA, ESMO..."
              required
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
            <textarea
              name="summary"
              rows={4}
              defaultValue={initialValues.summary}
              required
            />
          </label>

          <label className="case-field case-field-span-2">
            <span>Borrador</span>
            <textarea
              name="body"
              rows={10}
              defaultValue={initialValues.body}
              placeholder="Contexto clínico, por qué importa, límites y comentario editorial base."
              required
            />
          </label>

          <label className="case-field">
            <span>Tipo de tumor</span>
            <input name="tumorType" defaultValue={initialValues.tumorType} />
          </label>

          <label className="case-field">
            <span>Biomarcadores</span>
            <input
              name="biomarkers"
              defaultValue={initialValues.biomarkers.join(", ")}
              placeholder="EGFR, HER2, PD-L1"
            />
          </label>

          <label className="case-field case-field-span-2">
            <span>Etiquetas</span>
            <input
              name="tags"
              defaultValue={initialValues.tags.join(", ")}
              placeholder="noticias, pulmon, congreso, terapia dirigida"
            />
          </label>
        </div>

        <div className="case-form-actions">
          <a className="button secondary" href="/panel/noticias">
            Volver al radar
          </a>
          <div className="case-form-action-group">
            {enableAiGenerate || enableAiActions ? (
              <>
                <select name="aiTone" defaultValue="sobrio" className="ai-tone-select">
                  <option value="sobrio">tono sobrio</option>
                  <option value="clinico">tono clínico</option>
                  <option value="critico">tono crítico</option>
                  <option value="docente">tono docente</option>
                  <option value="divulgativo">tono divulgativo</option>
                </select>
                {enableAiGenerate ? (
                  <button
                    className="button secondary"
                    type="submit"
                    name="intent"
                    value="ai_generate"
                  >
                    Generar con IA
                  </button>
                ) : null}
              </>
            ) : null}
            {enableAiActions ? (
              <>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_regenerate"
                >
                  Regenerar
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_expand"
                >
                  Expandir
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_shorten"
                >
                  Acortar
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_retone"
                >
                  Cambiar tono
                </button>
              </>
            ) : null}
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
              Enviar a revision
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
      </form>
    </section>
  );
}
