import { adminNavigation } from "@/lib/content/admin-config";

type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

export function AdminShell({ children, title, subtitle }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-kicker">Dr. Antonio Camargo</span>
          <strong>Cabina Editorial Oncologica</strong>
          <p>
            Panel privado para casos, noticias, IA, MCP e integraciones
            externas.
          </p>
        </div>

        <nav className="admin-nav" aria-label="Panel privado">
          {adminNavigation.map((item) => (
            <a key={item.href} href={item.href} className="admin-nav-link">
              <span>{item.shortLabel}</span>
              <small>{item.label}</small>
            </a>
          ))}
        </nav>

        <div className="admin-sidebar-card">
          <span className="kicker">Modo operativo</span>
          <p>
            Arquitectura hibrida: archivo clinico, vigilancia oncologica, IA y
            conectividad MCP.
          </p>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">Zona Privada</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="admin-topbar-actions">
            <a className="button secondary" href="/">
              Ver sitio publico
            </a>
            <a className="button primary" href="/panel/importaciones">
              Nueva importacion
            </a>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
