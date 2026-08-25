"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminNavigation } from "@/lib/content/admin-config";

type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

export function AdminShell({ children, title, subtitle }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/panel"
      ? pathname === "/panel"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="admin-shell" data-nav-open={open ? "true" : "false"}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <div className="admin-brand">
            <span className="admin-brand-kicker">Dr. Antonio Camargo</span>
            <strong>Cabina Editorial Oncológica</strong>
            <p>
              Panel privado para casos, noticias, IA, MCP e integraciones
              externas.
            </p>
          </div>

          <button
            type="button"
            className="admin-nav-toggle"
            aria-expanded={open}
            aria-controls="admin-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>
        </div>

        <nav id="admin-nav" className="admin-nav" aria-label="Panel privado">
          {adminNavigation.map((item) => {
            const active = isActive(item.href);
            const showSublabel =
              item.label.toLowerCase() !== item.shortLabel.toLowerCase();

            return (
              <a
                key={item.href}
                href={item.href}
                className={`admin-nav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span>{item.shortLabel}</span>
                {showSublabel ? <small>{item.label}</small> : null}
              </a>
            );
          })}
        </nav>

        <div className="admin-sidebar-card">
          <span className="kicker">Modo operativo</span>
          <p>
            Arquitectura híbrida: archivo clínico, vigilancia oncológica, IA y
            conectividad MCP.
          </p>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-context-label">Zona privada · Operación editorial</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="admin-topbar-actions">
            <a className="button secondary" href="/">
              Ver página
            </a>
            <form action="/logout" method="post">
              <button className="button secondary" type="submit">
                Cerrar sesión
              </button>
            </form>
            <a className="button primary" href="/panel/importaciones">
              Nueva importación
            </a>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
