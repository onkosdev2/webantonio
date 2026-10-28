"use client";

import { List, PencilSimple, Plant, SquaresFour, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./site-header.module.css";

const navigation = [
  { href: "/casos-clinicos", label: "Casos" },
  { href: "/noticias", label: "Noticias" },
  { href: "/editoriales", label: "Editorial" },
  { href: "/investigacion", label: "Investigación" },
  { href: "/reflexiones", label: "Reflexiones" },
  { href: "/orientacion-oncologica-remota", label: "Orientación" },
  { href: "/sobre-mi", label: "Sobre mí" },
  { href: "/galeria", label: "Galería" }
] as const;

export function SiteHeaderClient({
  isAuthenticated,
  editHref
}: {
  isAuthenticated: boolean;
  editHref?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={styles.header}
      data-authenticated={isAuthenticated ? "true" : "false"}
      data-open={open ? "true" : "false"}
    >
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="Dr. Antonio Camargo, inicio">
          <Plant size={34} weight="thin" aria-hidden="true" />
          <span>
            <strong>Dr. Antonio Camargo</strong>
            <small>Cáncer: Un encuentro Personal</small>
          </span>
        </a>

        <button className={styles.menuButton} type="button" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={22} /> : <List size={22} />}
        </button>

        <nav id="public-navigation" className={styles.nav} aria-label="Navegación principal">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={isActive(item.href) ? styles.active : undefined} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>

        {isAuthenticated ? (
          <div className={styles.actions} aria-label="Accesos de edición">
            {editHref ? <a className={styles.editAccess} href={editHref}><PencilSimple size={17} aria-hidden="true" /><span>Volver a edición</span></a> : null}
            <a className={styles.panelAccess} href="/panel"><SquaresFour size={17} aria-hidden="true" /><span>Ir al panel</span></a>
          </div>
        ) : null}
      </div>
    </header>
  );
}
