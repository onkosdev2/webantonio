import { SiteHeader } from "@/components/layout/site-header";
import { getPublicGalleryAssets } from "@/lib/content/gallery";

export default async function GaleriaPage() {
  const items = await getPublicGalleryAssets();

  return (
    <>
      <SiteHeader />

      <main className="page-chrome section-shell">
        <section className="shell section-hero-grid">
          <article className="panel section-hero-copy">
            <span className="eyebrow">Media Clinica</span>
            <p className="section-signature">
              Imagen clínica tratada con sensibilidad, rigor y presencia premium
            </p>
            <h1 className="section-title">Galeria Clinica</h1>
            <p className="section-copy">
              Imágenes, esquemas y material docente enlazados a casos y sujetos
              a control de visibilidad desde el panel privado.
            </p>
          </article>

          <aside className="section-hero-visual">
            <div className="section-visual-label">Clinical Gallery</div>
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
          {items.length > 0 ? (
            <div className="public-gallery-grid">
              {items.map((item) => (
                <article key={item.id} className="public-gallery-card">
                  <div className="public-gallery-media">
                    <img src={item.storagePath} alt={item.altText || item.title} />
                  </div>
                  <div className="public-gallery-copy">
                    <span className="kicker">{item.mediaType}</span>
                    <h2 className="public-card-title">{item.title}</h2>
                    <p className="public-card-copy">
                      {item.altText || "Activo visual publicado en la galería clínica."}
                    </p>
                    {item.linkedContentTitle ? (
                      <div className="public-meta-row">
                        <span>{item.linkedContentTitle}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="panel public-empty-state">
              <span className="kicker">Sin activos públicos</span>
              <h2>Todavía no hay material visible en galería.</h2>
              <p>
                Registra activos desde el panel y deja desmarcada la opción de
                contenido sensible para que aparezcan aquí.
              </p>
            </article>
          )}
        </section>
      </main>
    </>
  );
}
