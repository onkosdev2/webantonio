import { SiteHeader } from "@/components/layout/site-header";

type PublicCollectionItem = {
  href: string;
  title: string;
  summary: string;
  eyebrow?: string;
  meta?: Array<string | { label: string; href?: string }>;
};

type PublicFilterConfig = {
  label: string;
  name: string;
  options: Array<string | { value: string; label: string }>;
  value?: string;
};

type PublicCollectionPageProps = {
  kicker: string;
  title: string;
  description: string;
  signature: string;
  countLabel: string;
  itemCount: number;
  items: PublicCollectionItem[];
  emptyTitle: string;
  emptyCopy: string;
  searchAction?: string;
  searchQuery?: string;
  filters?: PublicFilterConfig[];
  clearHref?: string;
};

export function PublicCollectionPage({
  kicker,
  title,
  description,
  signature,
  countLabel,
  itemCount,
  items,
  emptyTitle,
  emptyCopy,
  searchAction,
  searchQuery = "",
  filters = [],
  clearHref
}: PublicCollectionPageProps) {
  return (
    <>
      <SiteHeader />

      <main className="page-chrome section-shell">
        <section className="shell section-hero-grid">
          <article className="panel section-hero-copy">
            <span className="eyebrow">{kicker}</span>
            <p className="section-signature">{signature}</p>
            <h1 className="section-title">{title}</h1>
            <p className="section-copy">{description}</p>

            <div className="public-hero-metrics">
              <div className="public-metric-card">
                <strong>{itemCount}</strong>
                <span>{countLabel}</span>
              </div>
              <div className="public-metric-card">
                <strong>PUBLISHED</strong>
                <span>solo piezas públicas visibles en la web</span>
              </div>
            </div>
          </article>

          <aside className="section-hero-visual">
            <div className="section-visual-label">Archivo Publicado</div>
            <div className="panel section-visual-panel">
              <img
                className="section-visual-image"
                src="/section-clinical-atlas.svg"
                alt="Composicion editorial abstracta"
              />
            </div>
          </aside>
        </section>

        <section className="shell public-collection-section">
          {searchAction ? (
            <form action={searchAction} className="public-filter-bar">
              <label className="public-search-field">
                <span>Buscar en archivo</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="pulmon, EGFR, inmunoterapia, acceso..."
                />
              </label>

              {filters.map((filter) => (
                <label key={filter.name} className="public-filter-field">
                  <span>{filter.label}</span>
                  <select name={filter.name} defaultValue={filter.value ?? ""}>
                    <option value="">Todos</option>
                    {filter.options.map((option) => (
                      <option
                        key={typeof option === "string" ? option : option.value}
                        value={typeof option === "string" ? option : option.value}
                      >
                        {typeof option === "string" ? option : option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <div className="public-filter-actions">
                <button className="button primary" type="submit">
                  Aplicar
                </button>
                {clearHref ? (
                  <a className="button secondary" href={clearHref}>
                    Limpiar
                  </a>
                ) : null}
              </div>
            </form>
          ) : null}

          {items.length > 0 ? (
            <div className="public-card-grid">
              {items.map((item) => (
                <article key={item.href} className="public-card">
                  {item.eyebrow ? <span className="kicker">{item.eyebrow}</span> : null}
                  <h2 className="public-card-title">
                    <a href={item.href}>{item.title}</a>
                  </h2>
                  <p className="public-card-copy">{item.summary}</p>

                  {item.meta && item.meta.length > 0 ? (
                    <div className="public-meta-row">
                      {item.meta.map((metaItem) => (
                        typeof metaItem === "string" ? (
                          <span key={metaItem}>{metaItem}</span>
                        ) : metaItem.href ? (
                          <a key={`${metaItem.label}-${metaItem.href}`} href={metaItem.href}>
                            {metaItem.label}
                          </a>
                        ) : (
                          <span key={metaItem.label}>{metaItem.label}</span>
                        )
                      ))}
                    </div>
                  ) : null}

                  <a className="button secondary" href={item.href}>
                    Abrir pieza
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <article className="panel public-empty-state">
              <span className="kicker">Sin publicaciones</span>
              <h2>{emptyTitle}</h2>
              <p>{emptyCopy}</p>
            </article>
          )}
        </section>
      </main>
    </>
  );
}
