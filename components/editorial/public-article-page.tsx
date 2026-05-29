import { SiteHeader } from "@/components/layout/site-header";

type PublicChip = string | { label: string; href?: string };

type PublicArticlePageProps = {
  kicker: string;
  title: string;
  summary: string;
  body: string;
  backHref: string;
  backLabel: string;
  meta: PublicChip[];
  tags?: PublicChip[];
  relatedItems?: Array<{
    href: string;
    title: string;
    summary: string;
    kicker: string;
    meta?: PublicChip[];
  }>;
};

function splitBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function renderChip(chip: PublicChip) {
  if (typeof chip === "string") {
    return <span key={chip}>{chip}</span>;
  }

  if (chip.href) {
    return (
      <a key={`${chip.label}-${chip.href}`} href={chip.href}>
        {chip.label}
      </a>
    );
  }

  return <span key={chip.label}>{chip.label}</span>;
}

export function PublicArticlePage({
  kicker,
  title,
  summary,
  body,
  backHref,
  backLabel,
  meta,
  tags = [],
  relatedItems = []
}: PublicArticlePageProps) {
  const sections = splitBody(body);

  return (
    <>
      <SiteHeader />

      <main className="page-chrome article-shell">
        <section className="shell public-article-wrap">
          <article className="panel public-article">
            <div className="public-article-topbar">
              <a className="button secondary" href={backHref}>
                {backLabel}
              </a>
              <span className="eyebrow">{kicker}</span>
            </div>

            <header className="public-article-header">
              <h1>{title}</h1>
              <p className="public-article-summary">{summary}</p>

              {meta.length > 0 ? (
                <div className="public-meta-row">
                  {meta.map(renderChip)}
                </div>
              ) : null}
            </header>

            <div className="public-article-prose">
              {sections.map((section, index) => (
                <p key={`${index}-${section.slice(0, 24)}`}>{section}</p>
              ))}
            </div>

            {tags.length > 0 ? (
              <footer className="public-article-footer">
                {tags.map((tag) =>
                  typeof tag === "string" ? (
                    <span key={tag} className="public-tag">
                      {tag}
                    </span>
                  ) : tag.href ? (
                    <a
                      key={`${tag.label}-${tag.href}`}
                      className="public-tag"
                      href={tag.href}
                    >
                      {tag.label}
                    </a>
                  ) : (
                    <span key={tag.label} className="public-tag">
                      {tag.label}
                    </span>
                  )
                )}
              </footer>
            ) : null}
          </article>

          {relatedItems.length > 0 ? (
            <section className="public-related-section">
              <div className="public-related-heading">
                <span className="eyebrow">Archivo Relacionado</span>
                <h2>Más piezas conectadas con esta lectura</h2>
              </div>

              <div className="public-card-grid">
                {relatedItems.map((item) => (
                  <article key={item.href} className="public-card">
                    <span className="kicker">{item.kicker}</span>
                    <h3 className="public-card-title">
                      <a href={item.href}>{item.title}</a>
                    </h3>
                    <p className="public-card-copy">{item.summary}</p>
                    {item.meta && item.meta.length > 0 ? (
                      <div className="public-meta-row">
                        {item.meta.map(renderChip)}
                      </div>
                    ) : null}
                    <a className="button secondary" href={item.href}>
                      Leer pieza
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </main>
    </>
  );
}
