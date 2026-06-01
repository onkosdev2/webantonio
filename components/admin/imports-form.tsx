type ImportsFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function ImportsForm({ action }: ImportsFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">Recepcion Hibrida</span>
          <h2>Registrar una entrada externa real</h2>
          <p>
            Declara el canal de entrada, el origen y el payload editorial para
            convertirlo en un borrador trazable dentro del sistema.
          </p>
        </div>
      </div>

      <form action={action} className="case-form">
        <div className="case-form-grid">
          <label className="case-field">
            <span>Canal</span>
            <select name="channel" defaultValue="manual">
              <option value="manual">manual</option>
              <option value="api">api</option>
              <option value="mcp">mcp</option>
              <option value="agent">agent</option>
            </select>
          </label>

          <label className="case-field">
            <span>Origen</span>
            <input name="source" placeholder="redactor-editorial-v2" required />
          </label>

          <label className="case-field">
            <span>Tipo de payload</span>
            <select name="payloadType" defaultValue="editorial">
              <option value="editorial">editorial</option>
              <option value="research">research</option>
              <option value="clinical_case">clinical_case</option>
              <option value="news_item">news_item</option>
              <option value="reflection">reflection</option>
            </select>
          </label>

          <label className="case-field case-field-span-2">
            <span>Titulo</span>
            <input name="title" required />
          </label>

          <label className="case-field case-field-span-2">
            <span>Resumen del payload</span>
            <textarea name="summary" rows={4} required />
          </label>

          <label className="case-field case-field-span-2">
            <span>Cuerpo importado</span>
            <textarea name="body" rows={8} required />
          </label>

          <label className="case-field case-field-span-2">
            <span>Etiquetas</span>
            <input name="tags" placeholder="mcp, importado, editorial" />
          </label>

          <label className="case-field case-field-span-2">
            <span>Notas operativas</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Contexto de la entrada, versión del redactor, advertencias o referencia operativa."
            />
          </label>
        </div>

        <div className="case-form-actions">
          <button className="button primary" type="submit">
            Registrar importacion
          </button>
        </div>
      </form>
    </section>
  );
}
