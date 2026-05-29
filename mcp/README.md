# MCP Layer

Esta carpeta documenta la capa MCP activa y deja sitio para una expansión
posterior a un transporte MCP dedicado si hiciera falta.

## Estado actual

La primera capa MCP funcional ya se apoya en `Prisma` y se expone mediante las
APIs:

- `GET /api/mcp/resources`
- `GET /api/mcp/resource?uri=...`
- `GET /api/mcp/tools`
- `POST /api/mcp/tools`

## Alcance actual

- exponer recursos del archivo editorial
- permitir busqueda de casos, noticias y editoriales
- crear borradores desde agentes externos
- mover contenido a cola de revision

## Tools activas

- `search_cases`
- `search_news`
- `create_draft`
- `queue_for_review`

## Siguiente capa posible

- `suggest_related_content`
- `draft_comment_reply`
- transporte MCP dedicado fuera de `/api/mcp/*`

## Ejemplo

```json
POST /api/mcp/tools
{
  "tool": "search_cases",
  "args": {
    "query": "EGFR",
    "limit": 5
  }
}
```
