type GalleryItem = {
  id: string;
  title: string;
  altText: string;
  storagePath: string;
  mediaType: string;
  isSensitive: boolean;
  linkedContentSlug: string;
  linkedContentTitle: string;
  linkedContentStatus: string | null;
  effectiveVisibility: "PUBLIC" | "PRIVATE";
};

type GalleryPanelProps = {
  items: GalleryItem[];
  totalAssets: number;
  publicAssets: number;
  sensitiveAssets: number;
};

export function GalleryPanel({
  items,
  totalAssets,
  publicAssets,
  sensitiveAssets
}: GalleryPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-3">
          <article className="admin-stat-card gold">
            <strong>{totalAssets}</strong>
            <span>activos visuales</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{publicAssets}</strong>
            <span>visibles en galería pública</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{sensitiveAssets}</strong>
            <span>marcados como sensibles</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Galería Clínica</span>
            <h2>Activos visuales con control de visibilidad y relación clínica.</h2>
            <p>
              Este módulo permite poblar la galería pública sin abrir todavía
              un sistema de uploads más complejo.
            </p>
          </div>
          <div className="admin-topbar-actions">
            <a className="button primary" href="/panel/galeria#editor">
              Nuevo activo
            </a>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Galería</span>
            <h2>Activos registrados</h2>
          </div>
        </div>

        <div className="gallery-admin-grid">
          {items.map((item) => (
            <article key={item.id} className="gallery-admin-card">
              <div className="gallery-admin-media">
                {item.mediaType === "video" ? (
                  <video src={item.storagePath} controls preload="metadata" />
                ) : (
                  <img src={item.storagePath} alt={item.altText || item.title} />
                )}
              </div>

              <div className="gallery-admin-copy">
                <div className="admin-inline-actions">
                  <span className="case-status-badge">
                    {item.isSensitive ? "SENSITIVE" : item.effectiveVisibility}
                  </span>
                  {item.linkedContentStatus ? (
                    <span className="case-status-badge">{item.linkedContentStatus}</span>
                  ) : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.altText || "Sin texto alternativo."}</p>
                <div className="public-meta-row">
                  <span>{item.mediaType}</span>
                  {item.linkedContentTitle ? (
                    <span>{item.linkedContentTitle}</span>
                  ) : null}
                </div>
                {!item.isSensitive && item.linkedContentTitle && item.linkedContentStatus !== "PUBLISHED" ? (
                  <p className="case-list-summary">
                    Este activo está enlazado a contenido no publicado. No saldrá
                    en la galería pública hasta que esa pieza esté en `PUBLISHED`.
                  </p>
                ) : null}
                <a className="button secondary" href={`/panel/galeria/${item.id}`}>
                  Editar activo
                </a>
              </div>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>No hay activos en galería todavía.</h3>
                <p className="case-list-summary">
                  Registra la primera imagen o recurso visual para empezar a
                  poblar esta sección pública.
                </p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
