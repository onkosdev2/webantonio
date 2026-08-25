# Dr. Antonio Camargo | Plataforma Editorial Oncologica

Plataforma editorial oncológica híbrida con `Next.js`, `Prisma`, `IA` y capa
`MCP`, pensada para producir, revisar y publicar:

- casos clínicos
- noticias oncológicas
- editoriales
- investigación
- reflexiones
- historias
- galería clínica

## Estado actual

La base ya está operativa en estas áreas:

- sitio público conectado a contenido `PUBLISHED`
- panel editorial privado con módulos reales
- generación de borradores con `GLM 5.1`
- importaciones externas con trazabilidad
- motor de noticias oncológicas por RSS + IA
- tools y recursos MCP sobre base real, incluyendo investigación como tipo propio

## Módulos principales

- `app/(public)`: portada, colecciones públicas y detalle por slug
- `app/(private)/panel`: cabina editorial privada
- `app/api`: importaciones, ingestión de noticias y endpoints MCP
- `components`: interfaz pública y panel
- `lib/ai`: integración con GLM y lógica de tareas IA
- `lib/content`: consultas, panel, publicación y flujos editoriales
- `lib/mcp`: capa MCP viva conectada a Prisma
- `lib/news`: fuentes, parsing RSS e ingestión continua
- `lib/validation`: validación de entradas externas
- `prisma`: esquema y seed local
- `docs`: documentación técnica

## Panel disponible

Rutas operativas:

- `/panel`
- `/panel/casos`
- `/panel/noticias`
- `/panel/editoriales`
- `/panel/investigacion`
- `/panel/reflexiones`
- `/panel/historias`
- `/panel/galeria`
- `/panel/importaciones`
- `/panel/cola-ia`
- `/panel/mcp`

## Arranque local

1. Copia `.env.example` a `.env`
2. Ajusta `DATABASE_URL` si hace falta
3. Ejecuta `npm install`
4. Ejecuta `npm run db:generate`
5. Ejecuta `npm run db:push`
6. Opcional: `npm run db:seed`
7. Levanta la app con `npm run dev`

## Notas de desarrollo

- Para validar cambios de tipado: `npx tsc --noEmit`
- Evita mezclar `next build` con un `next dev` ya levantado, porque puede
  corromper `.next` en este entorno
- La base local usa `SQLite`; el modelo está preparado para migrar luego a
  `PostgreSQL`

## MCP para ChatGPT: casos clínicos

El endpoint estándar es `http://localhost:3000/mcp`. Expone herramientas para
buscar y revisar casos, crear borradores, configurar entre 3 y 5 figuras,
generar cada imagen, definir la portada y publicar. La publicación nunca es un
efecto secundario: exige una llamada separada con la confirmación `PUBLICAR`.

Para noticias de Actualidad existe además `publish_news_automated`, reservado para
automatizaciones recurrentes preautorizadas. Ejecuta crear, generar y asociar portada,
y publicar en una sola llamada idempotente por URL de fuente.

Flujo recomendado:

1. Redactar el caso sin identificadores personales.
2. Confirmar explícitamente que el texto está anonimizado.
3. Crear el borrador y configurar las figuras, sus prompts y ubicaciones.
4. Generar cada figura aprobada con `generate_case_image`.
5. Revisar el resultado con `get_clinical_case` o mediante su `edit_url`.
6. Publicar solo tras una orden explícita del usuario.

Para inspeccionarlo localmente:

```bash
npx @modelcontextprotocol/inspector@latest
```

En el Inspector selecciona Streamable HTTP y usa `http://localhost:3000/mcp`.

ChatGPT necesita una URL HTTPS accesible. Para mantener el servidor y la base de
datos locales, expón `/mcp` mediante **Secure MCP Tunnel** y configura
`MCP_ALLOW_UNAUTHENTICATED=true` únicamente dentro de ese perímetro privado.
Después activa Developer mode en ChatGPT, crea una app MCP y registra la URL
HTTPS entregada por el túnel. En un despliegue público usa OAuth 2.1: ChatGPT no
puede solicitar una API key personalizada al usuario.
