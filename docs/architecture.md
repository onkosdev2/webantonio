# Arquitectura del proyecto

## Resumen

ONKOS es una aplicación editorial oncológica monolítica modular. El sitio
público, el panel privado, las APIs y el servidor MCP se ejecutan en una misma
aplicación Next.js 15 con React 19 y TypeScript.

```text
Sitio público ──────────────┐
Panel editorial ────────────┼─► Next.js ─► Prisma ─► PostgreSQL
ChatGPT ─► Secure MCP ──────┘       │
                                    ├─► Cloudflare R2
RSS ─► motor de noticias ───────────┤
                                    └─► OpenAI / GLM / NVIDIA / ComfyUI
```

## Módulos

- `app/(public)`: portada, colecciones y artículos publicados.
- `app/(auth)`: inicio de sesión y creación de contraseña.
- `app/(private)/panel`: administración editorial y usuarios.
- `app/api`: importación, ingestión, medios, planes visuales y streams SSE.
- `app/mcp`: transporte MCP Streamable HTTP para ChatGPT.
- `components`: interfaz pública, editores y panel administrativo.
- `lib/auth`: sesión firmada, roles y contraseñas con scrypt.
- `lib/content`: consultas, estados y reglas editoriales.
- `lib/ai`: texto, imágenes, privacidad y pipeline visual clínico.
- `lib/mcp`: tools de casos clínicos y noticias conectadas a Prisma.
- `lib/news`: fuentes RSS, ranking e ingestión.
- `lib/realtime`: eventos de publicación para casos y noticias.
- `lib/storage`: almacenamiento de medios en Cloudflare R2.
- `prisma`: esquema relacional y seed local.

## Datos

`Content` centraliza casos, noticias, editoriales, investigación, reflexiones e
historias. Se relaciona con metadatos oncológicos, medios, importaciones, tareas
de IA y planes visuales. Los planes visuales contienen figuras y cada figura
puede asociarse con uno o más activos multimedia.

La base principal es PostgreSQL 16. En desarrollo corre dentro de Docker, se
publica en `127.0.0.1:5433` y conserva sus datos en un volumen nombrado. La
antigua SQLite permanece fuera del runtime como respaldo y fuente de migración.
Los archivos se almacenan en Cloudflare R2 y PostgreSQL conserva sus URL y
metadatos.

## Publicación y tiempo real

Los estados editoriales son `DRAFT`, `PENDING_REVIEW`, `SCHEDULED`, `PUBLISHED`
y `ARCHIVED`. Cuando se publica un caso o una noticia, el servidor emite un
evento SSE y la colección pública se actualiza. Los listeners actuales viven en
memoria; varias réplicas requieren Redis o un bus de eventos compartido.

## MCP

`POST /mcp` expone 17 herramientas: ocho de casos clínicos y nueve de noticias.
La publicación interactiva exige `confirmation=PUBLICAR`. La herramienta
`publish_news_automated` está reservada para automatizaciones recurrentes
preautorizadas y ejecuta el flujo idempotente de creación, portada y publicación.

Los endpoints `/api/mcp/*` son una capa administrativa anterior protegida por la
sesión del panel y no representan el catálogo del complemento de ChatGPT.

## Producción

- El servicio web ejecuta `npm run build` y `npm start` en el puerto 3000.
- ChatGPT accede a `/mcp` mediante Secure MCP Tunnel o una futura capa OAuth.
- R2 conserva los medios fuera del sistema de archivos de la aplicación.
- La ingestión RSS necesita un cron externo o una automatización programada.
- En producción debe utilizarse PostgreSQL administrado y configurar
  `DATABASE_URL` con la credencial del proveedor.
- Los eventos en memoria deben sustituirse por Redis o Pub/Sub antes de escalar
  a varias instancias.
