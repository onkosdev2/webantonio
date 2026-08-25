# Capa MCP de ONKOS

El servidor MCP activo se expone en `POST /mcp` mediante Streamable HTTP y se
implementa en `app/mcp/route.ts` y `lib/mcp/chatgpt-server.ts`.

## Catálogo para ChatGPT

Casos clínicos:

- `list_recent_clinical_cases`
- `search_clinical_cases`
- `get_clinical_case`
- `create_clinical_case_draft`
- `configure_case_images`
- `generate_case_image`
- `set_case_featured_image`
- `publish_clinical_case`

Noticias:

- `list_recent_news`
- `search_news`
- `create_news_draft`
- `find_reusable_news_images`
- `attach_existing_news_image`
- `generate_news_image`
- `get_news_item`
- `publish_news`
- `publish_news_automated`

La publicación interactiva exige `confirmation=PUBLICAR`. El método automático
de noticias solo debe utilizarse dentro de una automatización recurrente que ya
tenga autorización para publicar.

## Acceso

En desarrollo, `/mcp` está habilitado localmente. ChatGPT accede a través de
Secure MCP Tunnel. En producción se admite un Bearer token para clientes
compatibles o `MCP_ALLOW_UNAUTHENTICATED=true` exclusivamente detrás de un
túnel privado. La aplicación todavía no implementa OAuth.

Un `GET /mcp` sin sesión devuelve `405` deliberadamente; las operaciones MCP se
envían por `POST`.

## Capa administrativa anterior

Los endpoints `/api/mcp/resources`, `/api/mcp/resource` y `/api/mcp/tools`
continúan disponibles para la consola privada `/panel/mcp`. Requieren sesión de
usuario y no sustituyen al servidor MCP conectado a ChatGPT.

## Pruebas

- `npm run test:mcp:news`: smoke test de las herramientas de noticias; crea y
  elimina contenido temporal.
- `npm run test:mcp:e2e`: flujo clínico completo; requiere
  `MCP_E2E_CONFIRM=1` y puede consumir generación de imágenes.
