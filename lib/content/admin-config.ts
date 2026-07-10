export const adminNavigation = [
  { href: "/panel", label: "Dashboard", shortLabel: "Inicio" },
  { href: "/panel/casos", label: "Casos clínicos", shortLabel: "Casos" },
  { href: "/panel/noticias", label: "Radar RSS + IA", shortLabel: "Noticias" },
  { href: "/panel/editoriales", label: "Criterio médico", shortLabel: "Editoriales" },
  { href: "/panel/investigacion", label: "Evidencia y biomarcadores", shortLabel: "Investigación" },
  { href: "/panel/reflexiones", label: "Textos breves", shortLabel: "Reflexiones" },
  { href: "/panel/historias", label: "Narrativa clínica", shortLabel: "Historias" },
  { href: "/panel/galeria", label: "Galería clínica", shortLabel: "Galería" },
  { href: "/panel/importaciones", label: "Importaciones externas", shortLabel: "Integraciones" },
  { href: "/panel/cola-ia", label: "Cola de generación", shortLabel: "IA" },
  { href: "/panel/mcp", label: "Consola MCP", shortLabel: "MCP" }
] as const;
