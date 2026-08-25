type DashboardItem = {
  title: string;
  meta: string;
  detail: string;
  href: string;
};

type DashboardModule = {
  kicker: string;
  title: string;
  description: string;
};

type AdminDashboardProps = {
  stats: Array<{
    value: string;
    label: string;
    tone: "gold" | "green";
  }>;
  queueItems: DashboardItem[];
  importItems: DashboardItem[];
  aiItems: DashboardItem[];
  modules: DashboardModule[];
};

function DashboardList({
  title,
  kicker,
  items,
  emptyCopy
}: {
  title: string;
  kicker: string;
  items: DashboardItem[];
  emptyCopy: string;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="admin-list">
        {items.length > 0 ? (
          items.map((item) => (
            <article key={`${item.title}-${item.href}`} className="admin-list-item">
              <div>
                <h3>{item.title}</h3>
                <p className="admin-item-meta">{item.meta}</p>
              </div>
              <p>{item.detail}</p>
              <a className="button secondary" href={item.href}>
                Abrir
              </a>
            </article>
          ))
        ) : (
          <article className="admin-list-item">
            <p>{emptyCopy}</p>
          </article>
        )}
      </div>
    </section>
  );
}

export function AdminDashboard({
  stats,
  queueItems,
  importItems,
  aiItems,
  modules
}: AdminDashboardProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid">
          {stats.map((stat) => (
            <article key={stat.label} className={`admin-stat-card ${stat.tone}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-context-label">Estado editorial</span>
            <h2>Vista ejecutiva real del sistema</h2>
            <p>
              Este dashboard ya lee Prisma para mostrar producción, revisión,
              publicación, actividad IA e integraciones recientes sin depender
              de datos de ejemplo.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-section-span dashboard-three-col">
        <DashboardList
          title="Cola editorial viva"
          kicker="Revisión"
          items={queueItems}
          emptyCopy="No hay piezas pendientes en borrador o revisión."
        />
        <DashboardList
          title="Actividad de importaciones"
          kicker="Integraciones"
          items={importItems}
          emptyCopy="No hay importaciones recientes."
        />
        <DashboardList
          title="Actividad de IA"
          kicker="Asistente"
          items={aiItems}
          emptyCopy="No hay tareas IA recientes."
        />
      </section>

      <section className="admin-section-span">
        <div className="admin-module-grid">
          {modules.map((module) => (
            <article key={module.title} className="admin-panel admin-module-card">
              <span className="kicker">{module.kicker}</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
