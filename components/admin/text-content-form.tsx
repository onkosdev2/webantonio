import { ContentStatus } from "@prisma/client";

type TextContentFormValues = {
  title: string;
  slug: string;
  source: string;
  summary: string;
  body: string;
  status: ContentStatus;
  tags: string[];
};

type TextContentFormProps = {
  action: (formData: FormData) => Promise<void>;
  kicker: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  backHref: string;
  backLabel: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  initialValues?: TextContentFormValues;
  enableAiGenerate?: boolean;
  enableAiActions?: boolean;
};

const emptyValues: TextContentFormValues = {
  title: "",
  slug: "",
  source: "",
  summary: "",
  body: "",
  status: ContentStatus.DRAFT,
  tags: []
};

export function TextContentForm({
  action,
  kicker,
  title = "Nueva pieza",
  description = "Escribe o revisa una pieza editorial con resumen, cuerpo, etiquetas y estado.",
  submitLabel = "Guardar",
  backHref,
  backLabel,
  bodyLabel,
  bodyPlaceholder,
  initialValues = emptyValues,
  enableAiGenerate = false,
  enableAiActions = false
}: TextContentFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel" id="editor">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">{kicker}</span>
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
              placeholder="ia_interna, panel_privado, importado..."
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
            <span>{bodyLabel}</span>
            <textarea
              name="body"
              rows={12}
              defaultValue={initialValues.body}
              placeholder={bodyPlaceholder}
              required
            />
          </label>

          <label className="case-field case-field-span-2">
            <span>Etiquetas</span>
            <input
              name="tags"
              defaultValue={initialValues.tags.join(", ")}
              placeholder="texto breve, criterio, experiencia, oncologia"
            />
          </label>
        </div>

        <div className="case-form-actions">
          <a className="button secondary" href={backHref}>
            {backLabel}
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
