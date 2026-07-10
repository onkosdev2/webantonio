"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/noticias", label: "Noticias" },
  { href: "/editoriales", label: "Editorial" },
  { href: "/casos-clinicos", label: "Casos" },
  { href: "/historias", label: "Historias" },
  { href: "/reflexiones", label: "Reflexiones" },
  { href: "/investigacion", label: "Investigación" },
  { href: "/galeria", label: "Galería" },
  { href: "/sobre-mi", label: "Sobre mí" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="topbar" data-open={open ? "true" : "false"}>
      <div className="shell topbar-inner">
        <a className="brand" href="/">
          <span className="brand-name">Dr. Antonio Camargo</span>
          <span className="brand-tagline">Cáncer: Un encuentro Personal</span>
        </a>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <nav id="primary-nav" className="nav" aria-label="Principal">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "is-active" : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <form className="topbar-search" action="/buscar" method="get">
          <input
            type="search"
            name="q"
            placeholder="Buscar en el archivo"
            aria-label="Buscar en el archivo oncológico"
          />
        </form>
      </div>
    </header>
  );
}
