# Migración de galería en Supabase

Aplicación autorizada y verificada el 3 de septiembre de 2026, 22:30 UTC
(17:30 de Lima), en el proyecto `hzmxsfimtquqdyjmzxfx`.

Se aplicaron únicamente:

- `20260903190000_publication_gallery`
- `20260903200000_gallery_upload_purpose`

`MediaAsset` incorpora `galleryOrder`, `caption`, `isGalleryUpload` y
`galleryUploadHash`, el índice de contenido/orden y la restricción que separa
cargas de galería de portadas y figuras. El historial Prisma está actualizado.

## Conservación de datos

Se compararon conteos y huellas SHA-256 antes y después, usando exactamente
las columnas preexistentes. Coincidieron en las nueve tablas verificadas:

| Tabla | Registros sin cambios |
| --- | ---: |
| User | 1 |
| Content | 136 |
| OncologyMetadata | 131 |
| CaseVisualPlan | 22 |
| CaseFigure | 74 |
| MediaAsset | 137 |
| ImportLog | 316 |
| AiTask | 3 |
| ContentSlugAlias | 105 |

Los 137 medios existentes quedaron con `isGalleryUpload=false` y los otros
tres campos nuevos en `NULL`. No se reclasificaron imágenes como galería.
El índice y la restricción quedaron válidos. Los permisos y RLS de
`MediaAsset` no cambiaron. No se ejecutaron cambios de datos, seed ni resets.
La conexión real de la aplicación (`webantonio_app`) también pudo leer los
cuatro campos nuevos y los 137 registros, con sus valores predeterminados.

## Respaldo y alcance

El respaldo lógico JSON de las nueve tablas, sus huellas, la estructura anterior
de `MediaAsset`, el historial y los informes de verificación están fuera del
repositorio, en:

`/home/onkosdev/backups/webantonio/gallery-schema-2026-09-03T22-29-51-741Z/`

Directorio privado `0700`, archivos de datos e informes `0600`. No es un respaldo
completo del clúster ni contiene copias de objetos R2; es un respaldo de los
datos de aplicación verificados antes del cambio aditivo de estructura.

La credencial de administración se leyó desde la clave local `SUPABASE_DB_URL`;
no se incluyó en este informe ni se cambió la conexión de la aplicación.
No se realizó commit, push, despliegue ni actualización del código remoto.
