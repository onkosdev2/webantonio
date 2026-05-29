type AiFormValues = {
  pieceType: "news_item" | "editorial" | "reflection" | "story" | "clinical_case";
  focus: string;
  topic: string;
  angle: string;
  goal: string;
  tone: string;
  length: string;
  notes: string;
};

type AiFormProps = {
  action: (formData: FormData) => Promise<void>;
  initialValues?: AiFormValues;
};

const emptyValues: AiFormValues = {
  pieceType: "news_item",
  focus: "",
  topic: "",
  angle: "",
  goal: "",
  tone: "sobrio",
  length: "media",
  notes: ""
};

export function AiForm({ action, initialValues = emptyValues }: AiFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">Escritura Asistida</span>
          <h2>Tú propones. La IA desarrolla el artículo.</h2>
          <p>
            Define la pieza, marca el ángulo y deja que la IA redacte un
            primer borrador serio para revisión editorial.
          </p>
        </div>
      </div>

      <form action={action} className="case-form">
        <div className="case-form-grid">
          <label className="case-field">
            <span>Tipo de pieza</span>
            <select name="pieceType" defaultValue={initialValues.pieceType}>
              <option value="news_item">Noticia comentada</option>
              <option value="editorial">Editorial</option>
              <option value="reflection">Reflexión</option>
              <option value="story">Historia</option>
              <option value="clinical_case">Caso clínico</option>
            </select>
          </label>

          <label className="case-field">
            <span>Area oncológica</span>
            <input
              name="focus"
              defaultValue={initialValues.focus}
              placeholder="pulmon, mama, inmunoterapia, ética..."
              required
            />
          </label>

          <label className="case-field case-field-span-2">
            <span>Tema que propones</span>
            <input
              name="topic"
              defaultValue={initialValues.topic}
              placeholder="El lugar actual de la quimioterapia en cáncer de pulmón"
              required
            />
          </label>

          <label className="case-field">
            <span>Ángulo</span>
            <input
              name="angle"
              defaultValue={initialValues.angle}
              placeholder="crítico, práctico, prudente, docente..."
              required
            />
          </label>

          <label className="case-field">
            <span>Objetivo</span>
            <input
              name="goal"
              defaultValue={initialValues.goal}
              placeholder="aclarar, comentar, advertir, enseñar..."
              required
            />
          </label>

          <label className="case-field">
            <span>Tono</span>
            <select name="tone" defaultValue={initialValues.tone}>
              <option value="sobrio">Sobrio</option>
              <option value="clinico">Clínico</option>
              <option value="critico">Crítico</option>
              <option value="docente">Docente</option>
              <option value="divulgativo">Divulgativo</option>
            </select>
          </label>

          <label className="case-field">
            <span>Longitud</span>
            <select name="length" defaultValue={initialValues.length}>
              <option value="breve">Breve</option>
              <option value="media">Media</option>
              <option value="amplia">Amplia</option>
            </select>
          </label>

          <label className="case-field case-field-span-2">
            <span>Claves que no deben faltar</span>
            <textarea
              name="notes"
              rows={8}
              defaultValue={initialValues.notes}
              placeholder="Puntos clave, hallazgos, cautelas, tesis, advertencias, comparaciones, límites..."
              required
            />
          </label>
        </div>

        <div className="case-form-actions">
          {initialValues.topic ? (
            <a className="button secondary" href="/panel/cola-ia">
              Limpiar brief
            </a>
          ) : null}
          <button className="button primary" type="submit">
            Redactar primer borrador
          </button>
        </div>
      </form>
    </section>
  );
}
