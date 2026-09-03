"use client";

/* THESIS: Solo las cargas dedicadas amplían la lectura al final; portada y figuras quedan fuera.
 * OWN-WORLD: Hereda marfil, tinta botánica y controles discretos del atlas editorial.
 * STORY: Examinar la imagen completa, leer su pie y pasar a la siguiente.
 * FIRST VIEWPORT: Título y posición sobre una figura contenida; controles visibles.
 * FORM: Extensión local en modo Read; carrusel manual, sin autoplay ni recorte clínico. */
import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { PublicationGalleryImage } from "@/lib/content/publication-gallery";
import styles from "./publication-gallery.module.css";

export function PublicationGallery({ images }: { images: PublicationGalleryImage[] }) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  if (!images.length) return null;
  function go(index: number) {
    const element = track.current;
    if (!element) return;
    const destination = Math.max(0, Math.min(index, images.length - 1));
    element.scrollTo({ left: destination * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return (
    <section className={styles.gallery} aria-labelledby={`${id}-title`} aria-roledescription="carrusel">
      <header className={styles.header}>
        <div><h2 id={`${id}-title`}>Galería de la publicación</h2><p>Imágenes que acompañan esta lectura.</p></div>
        <div className={styles.controls}>
          <span aria-live="polite" aria-atomic="true">{active + 1} de {images.length}</span>
          {images.length > 1 ? <>
            <button type="button" aria-label="Imagen anterior" aria-controls={`${id}-track`} disabled={active === 0} onClick={() => go(active - 1)}><ArrowLeft size={20} aria-hidden="true" /></button>
            <button type="button" aria-label="Imagen siguiente" aria-controls={`${id}-track`} disabled={active === images.length - 1} onClick={() => go(active + 1)}><ArrowRight size={20} aria-hidden="true" /></button>
          </> : null}
        </div>
      </header>
      <div id={`${id}-track`} ref={track} className={styles.track} role="group" tabIndex={images.length > 1 ? 0 : undefined} aria-label="Imágenes. Usa las flechas izquierda y derecha para navegar."
        onScroll={() => { if (track.current) setActive(Math.max(0, Math.min(images.length - 1, Math.round(track.current.scrollLeft / track.current.clientWidth)))); }}
        onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); go(event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : active + (event.key === "ArrowRight" ? 1 : -1)); } }}>
        {images.map((image, index) => <figure key={image.id} className={styles.slide} role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${images.length}`}>
          <div className={styles.imageArea}>
            {failed.has(image.id) ? <p role="status">No se pudo cargar esta imagen. Puedes continuar con la siguiente.</p> :
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={image.src} alt={image.alt} loading="lazy" decoding="async" onError={() => setFailed((previous) => new Set(previous).add(image.id))} />}
          </div>
          <figcaption><p>{image.caption}</p></figcaption>
        </figure>)}
      </div>
    </section>
  );
}
