import { SiteHeader } from "@/components/layout/site-header";
import { getPublicGalleryPage } from "@/lib/content/gallery";
import { parsePublicArchivePage } from "@/lib/content/public-listing";

type GaleriaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GaleriaPage({ searchParams }: GaleriaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pageValue = resolvedSearchParams.page;
  const requestedPage = parsePublicArchivePage(Array.isArray(pageValue) ? pageValue[0] : pageValue);
  const { items, total, page, pageCount } = await getPublicGalleryPage(requestedPage);

  return (
    <>
      <SiteHeader />

      <main className="page-chrome section-shell">
        <section className="shell gallery-header">
          <span className="eyebrow">Media Clinica</span>
          <h1 className="section-title">Galeria Clinica</h1>
          <p className="section-copy">
            Imágenes clínicas compartidas y descritas para lectura docente.
          </p>
        </section>

        <section className="shell public-gallery-section">
          <p className="public-gallery-count">{total} {total === 1 ? "activo público" : "activos públicos"}</p>
          {items.length > 0 ? (
            <div className="public-gallery-grid">
              {items.map((item, index) => {
                const description = item.altText?.trim() ?? "";

                return (
                  <article
                    key={item.id}
                    className={index === 0 ? "public-gallery-card is-featured" : "public-gallery-card"}
                  >
                    <div className="public-gallery-media">
                      {item.mediaType === "video" ? (
                        <video src={item.storagePath} controls preload="metadata" />
                      ) : (
                        <img src={item.storagePath} alt={item.altText || item.title} />
                      )}
                    </div>
                    <div className="public-gallery-copy">
                      <div className="public-gallery-meta">
                        <span>{item.mediaType === "video" ? "Video" : "Imagen"}</span>
                        {item.linkedContentTitle ? <span>{item.linkedContentTitle}</span> : null}
                      </div>
                      <h2 className="public-gallery-title">{item.title}</h2>
                      {description ? <p className="public-gallery-description">{description}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <article className="panel public-empty-state">
              <span className="kicker">Sin activos públicos</span>
              <h2>Todavía no hay material visible en galería.</h2>
              <p>Las imágenes aparecerán aquí cuando se carguen y publiquen mediante el flujo MCP de Galería.</p>
            </article>
          )}
          {pageCount > 1 ? (
            <nav className="public-gallery-pagination" aria-label="Paginación de la galería">
              {page > 1 ? <a href={`/galeria?page=${page - 1}`}>Anterior</a> : <span aria-disabled="true">Anterior</span>}
              <span aria-current="page">Página {page} de {pageCount}</span>
              {page < pageCount ? <a href={`/galeria?page=${page + 1}`}>Siguiente</a> : <span aria-disabled="true">Siguiente</span>}
            </nav>
          ) : null}
        </section>
      </main>
    </>
  );
}
