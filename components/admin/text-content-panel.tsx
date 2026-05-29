import type { ContentStatus } from "@prisma/client";

type TextContentItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  source: string;
  tags: string[];
};

type TextContentPanelProps = {
  items: TextContentItem[];
  totalItems: number;
  pendingReview: number;
  drafts: number;
  published: number;
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyCopy: string;
  newHref: string;
  editBaseHref: string;
  newLabel: string;
};

export function TextContentPanel({
  items,
  totalItems,
  pendingReview,
  drafts,
  published,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyCopy,
  newHref,
  editBaseHref,
  newLabel
}: TextContentPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-4">
          <article className="admin-stat-card gold">
            <strong>{totalItems}</strong>
            <span>piezas en archivo</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{pendingReview}</strong>
            <span>listas para revisión</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{drafts}</strong>
            <span>borradores en trabajo</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{published}</strong>
            <span>publicadas</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <div className="admin-topbar-actions">
            <a className="button primary" href={newHref}>
              {newLabel}
            </a>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Listado</span>
            <h2>Piezas guardadas</h2>
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
                <a className="button secondary" href={`${editBaseHref}/${item.slug}`}>
                  Abrir borrador
                </a>
              </aside>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>{emptyTitle}</h3>
                <p className="case-list-summary">{emptyCopy}</p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
