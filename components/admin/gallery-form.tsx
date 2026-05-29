type GalleryFormValues = {
  title: string;
  altText: string;
  storagePath: string;
  mediaType: string;
  linkedContentSlug: string;
  linkedContentStatus?: string | null;
  isSensitive: boolean;
};

type GalleryFormProps = {
  action: (formData: FormData) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  initialValues?: GalleryFormValues;
};

const emptyValues: GalleryFormValues = {
  title: "",
  altText: "",
  storagePath: "",
  mediaType: "image",
  linkedContentSlug: "",
  linkedContentStatus: null,
  isSensitive: false
};

export function GalleryForm({
  action,
  title = "Nuevo activo de galería",
  description = "Registra una imagen o recurso visual para la galería clínica pública o privada.",
  submitLabel = "Guardar activo",
  initialValues = emptyValues
}: GalleryFormProps) {
  return (
    <section className="admin-panel admin-section-span admin-editor-panel" id="editor">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">Editor de Galería</span>
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

          <label className="case-field case-field-span-2">
            <span>Ruta o URL del archivo</span>
            <input
              name="storagePath"
              defaultValue={initialValues.storagePath}
              placeholder="/mi-imagen.jpg o https://..."
              required
            />
          </label>

          <label className="case-field">
            <span>Tipo de media</span>
            <input
              name="mediaType"
              defaultValue={initialValues.mediaType}
              placeholder="image"
              required
            />
          </label>

          <label className="case-field">
            <span>Slug de contenido relacionado</span>
            <input
              name="linkedContentSlug"
              defaultValue={initialValues.linkedContentSlug}
              placeholder="opcional"
            />
          </label>

          {initialValues.linkedContentSlug ? (
            <label className="case-field">
              <span>Estado del contenido enlazado</span>
              <input
                value={initialValues.linkedContentStatus ?? "No disponible"}
                readOnly
              />
            </label>
          ) : null}

          <label className="case-field case-field-span-2">
            <span>Texto alternativo</span>
            <textarea name="altText" rows={4} defaultValue={initialValues.altText} />
          </label>

          <label className="case-checkbox">
            <input
              type="checkbox"
              name="isSensitive"
              defaultChecked={initialValues.isSensitive}
            />
            <span>
              Marcar como sensible para ocultarlo de la galería pública. Aunque
              no esté marcado, un activo enlazado a contenido no publicado
              seguirá bloqueado en público.
            </span>
          </label>
        </div>

        <div className="case-form-actions">
          <a className="button secondary" href="/panel/galeria">
            Volver a galería
          </a>
          <button className="button primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
