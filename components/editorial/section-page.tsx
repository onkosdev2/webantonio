import { SiteHeader } from "@/components/layout/site-header";

type SectionPageProps = {
  kicker: string;
  title: string;
  description: string;
  signature?: string;
  highlightA?: string;
  highlightB?: string;
  highlightC?: string;
  visualLabel?: string;
  visualSrc?: string;
  visualAlt?: string;
  visualFit?: "contain" | "cover";
  depthKicker?: string;
  depthTitle?: string;
  depthCopy?: string;
  detailsKicker?: string;
  detailItems?: string[];
  profileSections?: {
    kicker: string;
    title: string;
    copy: string;
  }[];
  sourceLinks?: {
    label: string;
    href: string;
  }[];
  ctaTitle?: string;
  ctaCopy?: string;
  ctaLinks?: {
    label: string;
    href: string;
    variant?: "primary" | "secondary";
  }[];
};

export function SectionPage({
  kicker,
  title,
  description,
  signature = "Archivo especializado y curaduría clínica",
  highlightA = "Dirección editorial con criterios de rigor y contexto",
  highlightB = "Taxonomías oncológicas preparadas para IA y MCP",
  highlightC = "Presentación premium orientada a lectura profunda",
  visualLabel = "Atlas editorial",
  visualSrc = "/section-clinical-atlas.svg",
  visualAlt = "Composicion editorial abstracta",
  visualFit = "contain",
  depthKicker = "Profundidad",
  depthTitle = "Contenido tratado como patrimonio clínico, no como entrada de blog.",
  depthCopy = "Cada sección mantiene una presencia visual de revista médica de autor, con jerarquía, ritmo editorial y capacidad para escalar a casos, noticias, imágenes, comentarios y herramientas MCP.",
  detailsKicker = "Experiencia",
  detailItems = [
    "Hero propio con atmósfera editorial y clínica",
    "Tipografía de display para titulares y sans refinada para interfaz",
    "Plantilla interna consistente con la home premium"
  ],
  profileSections = [],
  sourceLinks = [],
  ctaTitle,
  ctaCopy,
  ctaLinks = []
}: SectionPageProps) {
  const isProfile = profileSections.length > 0;

  return (
    <>
      <SiteHeader />
      <main className={`page-chrome section-shell${isProfile ? " section-shell-profile" : ""}`}>
        <section className="shell section-hero-grid">
          <article className="panel section-hero-copy">
            <span className="eyebrow">{kicker}</span>
            <p className="section-signature">{signature}</p>
            <h1 className="section-title">{title}</h1>
            <p className="section-copy">{description}</p>

            <div className="section-note-grid">
              <div className="section-note">{highlightA}</div>
              <div className="section-note">{highlightB}</div>
              <div className="section-note">{highlightC}</div>
            </div>
          </article>

          <aside className="section-hero-visual">
            <div className="section-visual-label">{visualLabel}</div>
            <div className="panel section-visual-panel">
              <img
                className={`section-visual-image section-visual-image-${visualFit}`}
                src={visualSrc}
                alt={visualAlt}
              />
            </div>
          </aside>
        </section>

        <section className="shell internal-luxury-grid">
          <article className="internal-card internal-card-dark">
            <span className="kicker">{depthKicker}</span>
            <h2>{depthTitle}</h2>
            <p className="section-intro">
              {depthCopy}
            </p>
          </article>

          <article className="internal-card internal-card-light">
            <span className="kicker">{detailsKicker}</span>
            <ul className="bullet-list luxe-list">
              {detailItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        {profileSections.length > 0 ? (
          <section className="shell profile-section-grid">
            {profileSections.map((section) => (
              <article key={section.title} className="profile-info-card">
                <span className="kicker">{section.kicker}</span>
                <h2>{section.title}</h2>
                <p>{section.copy}</p>
              </article>
            ))}
          </section>
        ) : null}

        {sourceLinks.length > 0 ? (
          <section className="shell profile-source-band">
            <span className="kicker">Referencias públicas</span>
            <div className="profile-source-links">
              {sourceLinks.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {ctaTitle ? (
          <section className="shell profile-cta-band">
            <article className="profile-cta-copy">
              <span className="kicker">Siguiente paso</span>
              <h2>{ctaTitle}</h2>
              {ctaCopy ? <p>{ctaCopy}</p> : null}
            </article>
            {ctaLinks.length > 0 ? (
              <div className="cta-row">
                {ctaLinks.map((link) => (
                  <a
                    key={link.href}
                    className={`button ${link.variant ?? "secondary"}`}
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
