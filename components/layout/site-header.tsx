const navigation = [
  { href: "/noticias", label: "Noticias" },
  { href: "/editoriales", label: "Editorial" },
  { href: "/casos-clinicos", label: "Casos" },
  { href: "/historias", label: "Historias" },
  { href: "/reflexiones", label: "Reflexiones" },
  { href: "/investigacion", label: "Investigacion" },
  { href: "/galeria", label: "Galeria" },
  { href: "/sobre-mi", label: "Sobre mi" }
];

export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <a className="brand" href="/">
          <span>Dr. Antonio Camargo</span>
          <span>Oncologia, Casos Clinicos y Pensamiento Medico</span>
        </a>

        <nav className="nav" aria-label="Principal">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
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
