# Capa MCP de ONKOS

El servidor `onkos-content-publisher` v2.3.0 se expone en `/mcp` mediante
Streamable HTTP. Su implementación está en `app/mcp/route.ts` y
`lib/mcp/chatgpt-server.ts`.

## Catálogo oficial: 22 herramientas

| Entidad | Herramientas |
| --- | --- |
| Casos clínicos (10) | `list_recent_clinical_cases`, `search_clinical_cases`, `get_clinical_case`, `create_clinical_case_draft`, `update_clinical_case`, `archive_clinical_case`, `configure_case_images`, `generate_case_image`, `set_case_featured_image`, `publish_clinical_case` |
| Noticias (11) | `list_recent_news`, `search_news`, `get_news_item`, `create_news_draft`, `update_news_item`, `archive_news_item`, `find_reusable_news_images`, `attach_existing_news_image`, `generate_news_image`, `publish_news`, `publish_news_automated` |
| Ambas (1) | `manage_publication_images` |

La edición conserva campos omitidos, slug y estado. El archivado es lógico y no
borra medios. El gestor compartido separa portada y galería; el carrusel aparece
al final del cuerpo en ambas entidades, únicamente si hay cargas dedicadas.
La galería recibe adjuntos en `files` (ChatGPT) o `images[].file` (otros clientes),
y conserva `imageBase64` opcional para clientes antiguos: nunca IDs reutilizables,
portadas, figuras generadas, rutas ni URLs arbitrarias. Ordenar/quitar usa IDs de esas cargas. Una
portada nueva se carga directamente con `set_featured`, sin pasar por galería.

Confirmaciones: `PUBLICAR` para publicación interactiva, `ARCHIVAR` para retirar
contenido y `ACTUALIZAR_PUBLICADO` en las nuevas herramientas de edición e
imágenes sobre publicaciones visibles. `expectedUpdatedAt` permite detectar
versiones obsoletas. Los casos requieren confirmación humana de anonimización.

`publish_news_automated` sigue reservado a automatizaciones recurrentes
preautorizadas. Los contratos completos están en
[la guía MCP](../docs/GUIA_MCP_ONKOS.md).
El [contrato de adjuntos](../docs/MCP_IMAGE_ATTACHMENTS.md) detalla el schema,
la configuración de hosts confiables, los límites y las restricciones de transporte.

## Acceso y limpieza de la capa anterior

En desarrollo local no se exige autenticación. En producción se admite OAuth
con PKCE o `MCP_API_TOKEN` para clientes técnicos. Las consultas requieren
`mcp:read`; las mutaciones requieren además `mcp:write` en tokens OAuth.
`MCP_ALLOW_UNAUTHENTICATED=true` solo es válido detrás de un túnel privado.

Las operaciones se envían por POST. GET admite el canal SSE con el encabezado
Accept adecuado. `/panel/mcp` es ahora informativo: se retiraron las cinco
herramientas heredadas y `/api/mcp/tools`, `/api/mcp/resource` y
`/api/mcp/resources`. Importación y cola editorial conservan sus funciones
internas, sin una segunda API MCP.

## Prueba local aislada, sin IA ni R2

Usa una base desechable distinta de desarrollo y producción. Los comandos se
ejecutan desde el proyecto en Linux/WSL con Node compatible con `--env-file`.
Docker debe estar iniciado. No ejecutes estos comandos con credenciales reales.

1. Crea el contenedor de prueba (una sola vez):

   ```bash
   docker run -d --name webantonio-mcp-crud-test -p 127.0.0.1:5544:5432 -e POSTGRES_USER=onkos -e POSTGRES_PASSWORD=onkos_crud_test -e POSTGRES_DB=onkos_mcp_test postgres:16-alpine
   ```

2. Copia `.env.mcp-local.example` a `.env.mcp-local`. Este archivo está ignorado
   por Git. Aplica las migraciones únicamente a esa base y genera el cliente:

   ```bash
   node --env-file=.env.mcp-local node_modules/prisma/build/index.js migrate deploy
   node --env-file=.env.mcp-local node_modules/prisma/build/index.js generate
   ```

3. En una terminal, inicia el servidor separado:

   ```bash
   node --env-file=.env.mcp-local node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3001
   ```

4. En otra terminal, ejecuta:

   ```bash
   npm run test:mcp:crud
   npm run test:mcp:images
   npm run test:mcp:images:security
   ```

La suite rechaza bases que no sean loopback y cuyo nombre no termine en
`_test`. Cubre catálogo, endpoints retirados, CRUD, privacidad, fuentes,
versiones, confirmaciones, portada, carga local, galería y publicación pública.
No genera imágenes con IA ni escribe en R2. Limpia sus registros por ID al
terminar; `MCP_CRUD_KEEP_FIXTURES=1 npm run test:mcp:crud` conserva dos
publicaciones de demostración e imprime sus enlaces. Los archivos cargados se
conservan bajo `public/uploads/publications` (ignorado por Git).

La suite de adjuntos usa un cliente MCP real y transporte MCP en memoria, la
misma base aislada y un doble HTTPS/DNS: no descarga archivos reales de ChatGPT.
La suite de seguridad no usa base ni red externa. Los hosts de prueba se inyectan
solo desde código servidor de las pruebas, nunca mediante argumentos MCP.

Para compilar sin colisionar con el servidor de prueba:

```bash
NEXT_DIST_DIR=.next node --env-file=.env.mcp-local node_modules/next/dist/bin/next build
```

Detener sin borrar datos: `docker stop webantonio-mcp-crud-test`. Reanudar:
`docker start webantonio-mcp-crud-test`.

Para probar los permisos OAuth contra la compilación de producción local,
inicia en otra terminal (solo con el secreto ficticio del archivo de ejemplo):

```bash
NEXT_DIST_DIR=.next node --env-file=.env.mcp-local node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
npm run test:mcp:crud:auth
```

El comando de prueba va en una terminal separada del servidor. Verifica tokens
inválidos, vencimiento, audiencia y separación lectura/escritura (también para adjuntos) con un usuario
ficticio que elimina al terminar. No reemplaza una prueba de consentimiento
OAuth completo con ChatGPT ni necesita conectarse a ese servicio.

Otras suites existentes:

- `npm run test:mcp:news`: smoke test de noticias con contenido temporal.
- `npm run test:mcp:e2e`: flujo clínico completo; requiere
  `MCP_E2E_CONFIRM=1` y puede consumir generación de imágenes.
