"use client";

import { List, MagnifyingGlass, PencilSimple, Plant, SquaresFour, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./site-header.module.css";

const navigation = [
  { href: "/casos-clinicos", label: "Casos" },
  { href: "/noticias", label: "Actualidad" },
  { href: "/investigacion", label: "Evidencia" },
  { href: "/reflexiones", label: "Reflexiones" },
  { href: "/orientacion-oncologica-remota", label: "Orientación" }
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
    <header className={styles.header} data-open={open ? "true" : "false"}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="Dr. Antonio Camargo, inicio">
          <Plant size={48} weight="thin" aria-hidden="true" />
          <span><strong>Dr. Antonio Camargo</strong><small>Cáncer: Un encuentro Personal</small></span>
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

        <div className={styles.actions}>
          <a className={styles.search} href="/buscar"><MagnifyingGlass size={18} aria-hidden="true" /><span>Buscar</span></a>
          {isAuthenticated ? (
            <>
              {editHref ? <a className={styles.editAccess} href={editHref}><PencilSimple size={17} aria-hidden="true" /><span>Volver a edición</span></a> : null}
              <a className={styles.panelAccess} href="/panel"><SquaresFour size={17} aria-hidden="true" /><span>Ir al panel</span></a>
            </>
          ) : <a className={styles.subscribe} href="/noticias#suscripcion">Suscribirse</a>}
        </div>
      </div>
    </header>
  );
}
