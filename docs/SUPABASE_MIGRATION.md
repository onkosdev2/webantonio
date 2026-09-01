# Ensayo de migración a Supabase

Estado: **copia completada y verificada**, 31 de agosto de 2026.
Esto no es el corte de producción: la web, el panel y la automatización siguen
utilizando PostgreSQL local. Render todavía no se ha desplegado.

## Origen, destino y respaldo

- Origen: base `onkos`, contenedor `webantonio-postgres`, PostgreSQL 16.15.
- Destino: proyecto Supabase `hzmxsfimtquqdyjmzxfx`, base `postgres`, PostgreSQL 17.6.
- Conexión utilizada: Session pooler `aws-0-us-east-2.pooler.supabase.com:5432`.
- TLS con certificado raíz oficial de Supabase; validación estricta en Prisma
  y `verify-full` en el cliente PostgreSQL. Sin credenciales en Git.
- Snapshot: `2026-08-31T19:00:34.263Z` (14:00:34, hora de Lima).
- Verificación terminada: `2026-08-31T19:00:54.034Z`.
- Respaldo privado, fuera del repositorio:
  `/home/onkosdev/backups/webantonio/supabase-2026-08-31T19-00-29-734Z/`.
- Directorio con permisos `0700`; archivos con permisos `0600`.

Archivos principales del respaldo:

- `source-full.dump`: respaldo completo de la base local, formato custom de `pg_dump`.
- `application-data.sql`: datos de las ocho tablas de aplicación, sin historial Prisma.
- `source-fingerprints.json`: conteos y huellas SHA-256 del snapshot.
- `media-references.json`: inventario de referencias de archivos, no copia del bucket.
- `migration-report.json`: informe detallado de validación y permisos.
- `prisma-deploy.txt`, `prisma-status.txt`, `restore-output.txt`: resultados operativos.
- `supabase-root.crt`: certificado público, no una contraseña.

SHA-256 de `source-full.dump`:

```text
71dd510bf620093d8720821ab8d4dc49c454679c95e501064aad00009a490744
```

El respaldo completo y la exportación de datos utilizan el mismo snapshot
PostgreSQL que las huellas de referencia. No se detuvo la aplicación local.
El respaldo de una base no incluye los roles globales del clúster ni los objetos R2.

## Resultado

| Tabla | Registros verificados |
| --- | ---: |
| User | 1 |
| Content | 125 |
| OncologyMetadata | 120 |
| CaseVisualPlan | 21 |
| CaseFigure | 71 |
| MediaAsset | 124 |
| ImportLog | 189 |
| AiTask | 3 |
| **Total** | **654** |

Las huellas SHA-256 coinciden para todos los campos de las ocho tablas,
normalizando fechas y JSON y ordenando los registros por ID. Esto incluye
identificadores, slugs, estados, fuentes, fechas, usuarios y relaciones.
Hay **82 noticias publicadas**, **16 casos publicados** y **124 referencias de
archivos**. Las imágenes permanecen en R2: no se descargaron ni se trasladaron
a Supabase Storage durante este ensayo.

Se aplicó `20260825174232_init_postgres` mediante `prisma migrate deploy` y
se restauraron exclusivamente datos de aplicación en una transacción, sin
propietarios ni privilegios locales. No se copió `_prisma_migrations` ni se
modificaron los esquemas gestionados por Supabase, como `auth` y `storage`.

Comprobaciones aprobadas:

- `prisma migrate status`: esquema actualizado.
- Todas las restricciones de aplicación presentes están validadas.
- Sin diferencias entre la base local y el snapshot al finalizar la comprobación.
- La web local continuó respondiendo HTTP 200 en el puerto 3000.
- La configuración local `DATABASE_URL` no se cambió.

## Protección de acceso

La desactivación de la Data API fue confirmada por el responsable del proyecto.
Adicionalmente se verificó en PostgreSQL:

- Revocación de privilegios predeterminados del rol creador `postgres` en
  `public` para nuevas tablas, secuencias y funciones de la aplicación.
- Revocación de acceso a las tablas importadas y a `_prisma_migrations` para
  `anon`, `authenticated`, `service_role` y `PUBLIC`.
- RLS activado en esas nueve tablas, sin políticas de acceso público.
- Consultas de prueba bajo `anon` y `authenticated` rechazadas al intentar
  acceder a `User`.

Los cambios de permisos se limitaron al esquema de aplicación. No se cambiaron
los permisos de los esquemas gestionados por Supabase. Esta configuración
protege el ensayo, pero todavía falta provisionar el usuario de ejecución de
producción: **no desplegar Render usando permanentemente el rol `postgres`**.

## Siguientes pasos

1. Reemplazar la contraseña de base de datos compartida en el chat por una nueva,
   gestionada fuera de Git y del chat.
2. Crear un rol de ejecución con los permisos mínimos de la aplicación y
   políticas RLS específicas para ese rol. Un rol nuevo sin esas políticas no
   podrá acceder a las tablas. Mantener separada la credencial de migraciones.
3. Configurar Render según [el plan de despliegue](DEPLOY_RENDER.md), incluyendo
   secretos, conexión segura, R2 y una sola instancia. Probar web y panel.
4. Antes del corte definitivo, suspender escrituras con autorización y conciliar
   las publicaciones realizadas desde el snapshot. Esta copia no se sincroniza
   automáticamente con PostgreSQL local. No repetir la importación sobre un
   destino con datos ni asumir que puede sobrescribirse sin revisión.
5. Completar la autenticación MCP de producción y vincular la automatización
   al mismo destino autoritativo que la web.

El ejecutor local del ensayo está en `.codex/supabase-migration.mjs` (ignorado
por Git). Se niega a importar si el destino no está vacío y no cambia la
conexión de la aplicación. No es un proceso de sincronización incremental.
