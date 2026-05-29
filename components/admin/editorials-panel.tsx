import type { ContentStatus } from "@prisma/client";

type EditorialItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  source: string;
  tags: string[];
};

type EditorialsPanelProps = {
  items: EditorialItem[];
  totalEditorials: number;
  pendingReview: number;
  drafts: number;
};

export function EditorialsPanel({
  items,
  totalEditorials,
  pendingReview,
  drafts
}: EditorialsPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-3">
          <article className="admin-stat-card gold">
            <strong>{totalEditorials}</strong>
            <span>editoriales en archivo</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{pendingReview}</strong>
            <span>listas para revisión</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{drafts}</strong>
            <span>borradores en trabajo</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Firma de Autor</span>
            <h2>Editoriales reales, revisables y listas para pulido final.</h2>
            <p>
              Desde aquí ya puedes abrir borradores creados por IA, corregir su
              tesis, refinar el tono y llevarlos a publicación.
            </p>
          </div>
          <div className="admin-topbar-actions">
            <a className="button primary" href="/panel/editoriales#editor">
              Nueva editorial
            </a>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Editoriales</span>
            <h2>Borradores de autor y piezas en revisión</h2>
          </div>
        </div>

        <div className="case-list">
          {items.map((item) => (
            <article key={item.id} className="case-list-item">
              <div className="case-list-main">
                <div className="case-list-heading">
                  <div>
                    <span className="case-status-badge">{item.status}</span>
                    <h3>{item.title}</h3>
                  </div>
                </div>

                <p className="case-list-summary">{item.summary}</p>

                <div className="case-meta-grid">
                  <span>
                    <strong>Fuente</strong>
                    {item.source}
                  </span>
                  <span>
                    <strong>Etiquetas</strong>
                    {item.tags.join(", ") || "Sin etiquetas"}
                  </span>
                </div>
              </div>

              <aside className="case-list-side">
                <span>
                  <strong>Slug</strong>
                  {item.slug}
                </span>
                <a className="button secondary" href={`/panel/editoriales/${item.slug}`}>
                  Abrir borrador
                </a>
              </aside>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>No hay editoriales todavía.</h3>
                <p className="case-list-summary">
                  Crea la primera editorial o genera una desde Cola IA para
                  empezar a trabajar la voz de autor.
                </p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
