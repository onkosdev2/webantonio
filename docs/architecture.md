# Arquitectura del Proyecto

## Objetivo

Construir una plataforma editorial oncologica hibrida para el Dr. Antonio Camargo con:

- web publica
- panel editorial privado
- capa de IA
- integraciones externas
- recursos y herramientas MCP

## Modulos principales

- `app/(public)`: colecciones públicas y detalle por slug.
- `app/(private)/panel`: cabina editorial privada.
- `app/api`: importación, ingestión de noticias y endpoints MCP.
- `components`: piezas visuales reutilizables.
- `lib/ai`: integración con GLM y lógica asistida.
- `lib/content`: consultas, dashboard, publicación y flujos editoriales.
- `lib/news`: fuentes RSS, ranking e ingestión continua.
- `lib/mcp`: tools y recursos MCP conectados a Prisma.
- `lib/validation`: esquemas de entrada para integraciones externas.
- `prisma`: modelo de datos oncológico.
- `mcp`: documentación y futura expansión del transporte MCP dedicado.

## Estado implementado

- portada y secciones públicas conectadas a contenido `PUBLISHED`
- panel real para casos, noticias, editoriales, reflexiones, historias y galería
- dashboard privado con métricas vivas
- generación de borradores con `GLM 5.1`
- flujo editorial con `draft`, `pending_review`, `published` y `archived`
- importaciones externas con trazabilidad
- primera capa MCP viva vía `/api/mcp/*`
- motor de noticias oncológicas por RSS + IA

## Pendientes estratégicos

1. Añadir autenticación al panel.
2. Programar el motor de noticias con cron o worker dedicado.
3. Ampliar el rastreo con APIs externas además de RSS.
4. Evolucionar la capa MCP a un transporte dedicado si hace falta.

## Nota de desarrollo local

La base actual usa `SQLite` para arranque local rapido. Cuando el sistema
editorial y las colas pasen a despliegue estable, conviene migrar a
`PostgreSQL` sin cambiar el modelo conceptual.
