export function McpConsole() {
  return <div className="admin-content-grid">
    <section className="admin-panel admin-section-span">
      <h2>MCP editorial de ONKOS</h2>
      <p><code>onkos-content-publisher</code> · versión 2.2.0 · 22 herramientas.</p>
      <p>Un único catálogo para casos clínicos y noticias: consulta, creación, actualización, archivado, publicación y gestión de imágenes.</p>
      <h3>Conexión</h3>
      <p>Endpoint: <code>/mcp</code>, transporte Streamable HTTP. En local usa <code>http://localhost:3000/mcp</code> o el puerto de desarrollo configurado. En producción se utiliza OAuth; los clientes técnicos pueden usar Bearer.</p>
      <h3>Contenido e imágenes</h3>
      <p>Las actualizaciones conservan el slug y el estado. Archivar retira la publicación sin borrar archivos. El carrusel final contiene únicamente archivos cargados expresamente para la galería: no incluye portadas, figuras generadas ni imágenes de la biblioteca. Sin esas cargas, no aparece. La portada se selecciona o carga por separado.</p>
      <h3>Confirmaciones</h3>
      <p><code>PUBLICAR</code> para publicar, <code>ARCHIVAR</code> para retirar una entrada y <code>ACTUALIZAR_PUBLICADO</code> para modificar una entrada visible.</p>
      <p>La antigua API <code>/api/mcp/*</code> se retiró. Esta página no ejecuta operaciones editoriales: utiliza el catálogo oficial de <code>/mcp</code>.</p>
    </section>
  </div>;
}
