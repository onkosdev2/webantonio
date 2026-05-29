# Dr. Antonio Camargo | Plataforma Editorial Oncologica

Plataforma editorial oncológica híbrida con `Next.js`, `Prisma`, `IA` y capa
`MCP`, pensada para producir, revisar y publicar:

- casos clínicos
- noticias oncológicas
- editoriales
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
- tools y recursos MCP sobre base real

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
