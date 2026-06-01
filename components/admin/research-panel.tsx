import type { ContentStatus } from "@prisma/client";

type ResearchItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  source: string;
  tags: string[];
};

type ResearchPanelProps = {
  items: ResearchItem[];
  totalResearch: number;
  pendingReview: number;
  drafts: number;
};

export function ResearchPanel({
  items,
  totalResearch,
  pendingReview,
  drafts
}: ResearchPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-3">
          <article className="admin-stat-card gold">
            <strong>{totalResearch}</strong>
            <span>piezas de investigacion en archivo</span>
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
            <span className="eyebrow">Investigacion</span>
            <h2>Investigacion real, revisable y lista para pulido final.</h2>
            <p>
              Desde aqui puedes abrir borradores de investigacion creados por IA, corregir evidencia, refinar el tono y llevarlos a publicacion.
            </p>
          </div>
          <div className="admin-topbar-actions">
            <a className="button primary" href="/panel/investigacion#editor">
              Nueva investigacion
            </a>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Investigacion</span>
            <h2>Borradores de investigacion y piezas en revision</h2>
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
                <a className="button secondary" href={`/panel/investigacion/${item.slug}`}>
                  Abrir borrador
                </a>
              </aside>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>No hay piezas de investigacion todavia.</h3>
                <p className="case-list-summary">
                  Crea la primera pieza de investigacion o genera una desde Cola IA para empezar a trabajar evidencia y lectura critica.
                </p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
