# Plan de despliegue: Render + Supabase

Revisión: 31 de agosto de 2026. Este documento describe el plan y su estado;
no crea servicios ni cambia el conector de ChatGPT por sí mismo.

Estado actual: GitHub actualizado y ensayo de migración a Supabase completado.
Se verificaron 654 registros en ocho tablas. La aplicación sigue usando la base
local; Render y el corte definitivo siguen pendientes. Véase el
[informe de migración a Supabase](SUPABASE_MIGRATION.md).

## Arquitectura propuesta

| Componente | Destino | Decisión inicial |
| --- | --- | --- |
| Web pública, panel, API y MCP | Render Web Service, Node.js | Una instancia de la aplicación Next.js |
| Base de datos | Supabase PostgreSQL | Migrar los datos de PostgreSQL local, no volver a SQLite |
| Imágenes y vídeos | Cloudflare R2 existente | Conservar objetos y URLs; no migrar a Supabase Storage en esta etapa |
| Generación de texto e imágenes | Proveedores IA configurados | Credenciales exclusivamente del lado del servidor |
| ChatGPT | Conector MCP de producción | HTTPS y OAuth antes de habilitar escritura pública |

La aplicación tiene lógica de servidor y no puede desplegarse como Static Site.
Render soporta Next.js como servicio Node. [Guía de Render](https://render.com/docs/deploy-nextjs-app).

## Situación comprobada

- Next.js 15.5.20, Prisma 6 y Node.js 22.22.2 en el entorno validado.
- `npx tsc --noEmit` y compilación de producción correctos en una copia aislada;
  no se sustituyó la carpeta `.next` del servidor local.
- PostgreSQL local en Docker, puerto 5433; migración inicial PostgreSQL versionada.
- En la consulta de preparación: 82 noticias publicadas, 16 casos publicados y
  124 archivos registrados, todos con URL del R2 configurado. Son una referencia
  temporal: recalcular los conteos al hacer el corte definitivo.
- El proceso local no tiene `AUTH_SECRET` definido. Producción lo exige.
- `npm start` fija el puerto 3000; el comando específico de Render de abajo usa `PORT`.
- Las notificaciones de publicación usan listeners en memoria del proceso:
  comenzar con una sola instancia. Antes de escalar, implementar distribución
  de eventos y sincronización de caché entre instancias; un reinicio pierde los
  eventos transitorios, no los registros de PostgreSQL.
- El MCP implementa OAuth 2.1 con PKCE, registro dinámico de cliente y metadata
  de recurso/autorización. En producción publica la URL configurada mediante
  `NEXT_PUBLIC_SITE_URL` y conserva `MCP_API_TOKEN` para clientes técnicos.

## 1. Preparar Supabase y copiar los datos

1. Crear un proyecto dedicado y elegir una región cercana a la instancia de
   Render. Guardar la contraseña fuera de Git y del chat.
2. Usar inicialmente una conexión **Session pooler, puerto 5432**, apropiada
   para este backend persistente y accesible por IPv4. La guía actual de
   Supabase también permite usarla para migraciones. Conservar Prisma 6 y su
   configuración en `schema.prisma`; no copiar una actualización de Prisma
   de una guía nueva como parte de este despliegue.
   [Conexión Prisma/Supabase](https://supabase.com/docs/guides/database/prisma).
3. Restringir la Data API: esta aplicación usa Prisma, no necesita exponer
   las tablas directamente al navegador. Deshabilitar la Data API si no se
   utiliza, o retirar la exposición y permisos de las tablas internas. Revisar
   especialmente `User`, borradores y datos clínicos; crear tablas con Prisma
   no configura automáticamente políticas de acceso para Supabase.
   [Seguridad de la Data API](https://supabase.com/docs/guides/api/securing-your-api).
4. Acordar una ventana de corte y suspender temporalmente las escrituras del
   panel y de la automatización, con autorización del responsable. No mantener
   dos bases independientes recibiendo nuevas publicaciones.
5. Crear un respaldo completo de PostgreSQL local con `pg_dump`, en una ubicación
   protegida y fuera del repositorio. Conservar también un inventario de objetos
   R2: una copia de PostgreSQL no incluye los archivos de imagen.
6. Contra el destino vacío y previamente identificado, ejecutar
   `npx prisma migrate deploy` con la `DATABASE_URL` de Supabase. No usar
   `migrate dev`, `db push`, `migrate reset` ni el seed en producción.
7. Exportar los datos de las tablas de aplicación del esquema `public` y
   restaurarlos en una transacción, sin propietarios ni privilegios locales.
   Excluir `_prisma_migrations` de esta copia de datos: el paso anterior ya
   creó el historial correcto. No copiar ni reemplazar los esquemas gestionados
   por Supabase, como `auth` y `storage`. Preparar los comandos definitivos
   después de verificar origen, destino y versión de PostgreSQL.
   [Migración PostgreSQL a Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres).
8. Comparar todas las tablas, identificadores, relaciones, slugs, fechas, estados,
   usuarios y URLs de imágenes. Ejecutar `npx prisma migrate status` contra el
   destino. El script `db:verify:migration` actual compara SQLite con PostgreSQL;
   no valida esta nueva migración PostgreSQL a Supabase.

Antes de abrir tráfico, establecer un usuario de ejecución con permisos mínimos
y separar sus credenciales de las que aplican migraciones. Si se usan conexiones
distintas, el pre-deploy debe recibir explícitamente la credencial de migración.

## 2. Crear el servicio en Render

Conectar la cuenta GitHub y el repositorio `nelsononkos78/webantonio`.

| Campo de Render | Valor propuesto |
| --- | --- |
| Tipo | Web Service |
| Runtime | Node |
| Branch | `main` |
| Root Directory | Vacío, raíz del repositorio |
| Build Command | `npm ci --include=dev && npx prisma generate && npm run build` |
| Pre-Deploy Command | `npx prisma migrate deploy` |
| Start Command | `npx next start --hostname 0.0.0.0 --port $PORT` |
| Health Check Path inicial | `/` |
| Instancias | 1 |
| Auto-Deploy inicial | Off, hasta completar las verificaciones |

Usar un servicio de pago para operación continua: el gratuito puede suspenderse
tras 15 minutos sin tráfico. El comando pre-deploy está disponible en servicios
de pago. [Servicio gratuito](https://render.com/docs/free),
[ciclo de despliegue](https://render.com/docs/deploys).

La base debe estar inicializada antes del primer build, porque algunas rutas,
como el sitemap, consultan contenido durante la compilación. No añadir la copia
de datos inicial al comando de build ni al arranque recurrente.

Render espera que el servidor escuche en `0.0.0.0` y recomienda usar `PORT`.
No es necesario exponer públicamente el puerto 3000 ni subir Docker Compose:
el contenedor PostgreSQL actual permanece como entorno local y respaldo.
[Puertos en Render](https://render.com/docs/web-services#port-binding).

## 3. Variables de entorno

Introducir secretos en la configuración de Render, nunca en archivos versionados.
No reutilizar en producción credenciales que hayan sido compartidas en mensajes;
reemplazarlas por credenciales nuevas y revocar las anteriores según corresponda.

| Variable | Configuración |
| --- | --- |
| `NODE_VERSION` | `22.22.2`, versión usada en la validación inicial |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Conexión PostgreSQL de Supabase con TLS y contraseña codificada en URL |
| `PRISMA_CONNECTION_LIMIT` | `1` para mantener cada proceso dentro del límite del rol de Supabase |
| `PRISMA_POOL_TIMEOUT_SECONDS` | `30` para esperar capacidad antes de fallar |
| `AUTH_SECRET` | Secreto nuevo, aleatorio y estable entre despliegues |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS real de Render; después, dominio definitivo |
| `OPENAI_API_KEY` | Clave del proyecto IA de producción, con límites de gasto |
| `AI_TEXT_PROVIDER` | `openai`, si se mantiene el proveedor actual |
| `IMAGE_GENERATION_PROVIDER` | `openai`, si se mantiene el proveedor actual |
| `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL` | Identificadores ya probados y habilitados en la cuenta; verificar antes del corte |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Destino existente de las imágenes |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales del bucket con permisos acotados |
| `MCP_ALLOW_UNAUTHENTICATED` | `false` para el servicio público |
| `MCP_API_TOKEN` | Secreto fuerte para clientes compatibles; no sustituye OAuth de ChatGPT |

Configurar `GLM_*` y `AI_TEXT_FALLBACK_PROVIDER` únicamente si se usará el fallback;
lo mismo para NVIDIA. No apuntar ComfyUI en Render a `127.0.0.1:8188` del equipo local.

Fijar explícitamente Node evita depender de la versión predeterminada de Render.
[Configuración de Node](https://render.com/docs/node-version).

Mantener `NEXT_PUBLIC_SITE_URL` disponible durante build y ejecución; los cambios
de dominio requieren recompilar para regenerar URLs estáticas de SEO. Las únicas
variables con prefijo `NEXT_PUBLIC_` deben contener información pública.

## 4. MCP y actualización de ChatGPT

Para conexión HTTPS directa, el destino es `https://<dominio>/mcp` y **no hace
falta ejecutar un túnel**. La implementación incluye:

- OAuth compatible con MCP, consentimiento mediante la sesión del panel y validación de tokens.
- Metadata de recurso y autorización con URLs HTTPS reales, no localhost.
- Scopes de lectura/escritura, challenge `WWW-Authenticate` y flujo de vinculación.
- Que una petición sin credenciales no pueda leer borradores ni publicar.

No configurar `MCP_ALLOW_UNAUTHENTICATED=true` en el servicio web público para
facilitar la conexión. `MCP_API_TOKEN` se conserva para clientes técnicos, pero
ChatGPT debe usar el flujo OAuth. [Autenticación MCP de OpenAI](https://developers.openai.com/plugins/build/auth).

La web y el panel pueden desplegarse primero con `/mcp` protegido y pendiente
de vincular a ChatGPT. Mantener el túnel como alternativa exige un diseño privado
separado y verificar dónde escribe y cómo propaga eventos; no es parte del
despliegue web básico ni debe asumirse que basta con cambiar su URL.

Después de validar OAuth, configurar la conexión de producción en ChatGPT,
actualizar sus metadatos y comprobar las 17 herramientas. Primero probar lectura;
probar borradores/publicación solo con autorización y contenido de prueba acordado.
Si se cambia una conexión de modo desarrollador, usar Refresh y verificar en una
conversación nueva. Revisar aparte la conexión y autorización de la tarea recurrente:
subir código a GitHub no modifica automáticamente esa tarea.
[Conectar y actualizar MCP](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## 5. Verificación y corte definitivo

- Probar home, noticias, casos, imágenes, búsqueda, login y cierre de sesión.
- Confirmar que panel, APIs privadas y MCP rechazan acceso no autorizado.
- Comprobar que la web sigue mostrando exclusivamente contenido publicado.
- Verificar R2 después de un redeploy: no depender de archivos generados en el
  disco efímero de Render. [Persistencia en Render](https://render.com/docs/deploys#ephemeral-filesystem).
- Validar generación IA, asociación de imagen, fuente y publicación con permiso.
- En dos pestañas, comprobar actualización automática y notificación discreta.
- Revisar sitemap, canonical y enlaces del MCP: ninguno debe señalar localhost.
- Probar duración de las llamadas de generación y errores de transporte; el
  `maxDuration` de la ruta no garantiza por sí solo los límites de todos los proxies.
- Antes de quitar la suspensión de escrituras, elegir una sola base autoritativa,
  repasar conteos finales y apuntar panel y automatización al mismo destino.
- Cambiar DNS solo después de la validación; guardar el despliegue previo.
- Activar auto-deploy desde `main` cuando el flujo esté estable. Incorporar CI
  antes de seleccionar la opción que exige comprobaciones CI aprobadas.

## Recuperación

Mantener el PostgreSQL local y su copia de seguridad durante la aceptación.
Si falla la aplicación, volver a un commit compatible sin deshacer datos.
Una reversión de código no revierte automáticamente una migración SQL.
Si se necesita volver a la base anterior después de nuevas escrituras en Supabase,
detener escrituras y reconciliar esos cambios antes del retorno para no perderlos.

## Orden recomendado

1. Actualizar GitHub y disponer de un commit de referencia.
2. Crear Supabase y ensayar la migración/validación en un destino aislado.
3. Configurar Render, secretos y R2; validar web y panel.
4. Desplegar y verificar OAuth MCP de producción; conectar ChatGPT.
5. Ejecutar el corte final de datos, dominio y conector; reanudar la automatización.

Pendientes externos: verificar autorización de la integración GitHub de Render
(el push con token ya funcionó, pero no garantiza acceso a la integración),
acceso a Render, región/plan aprobados, dominio y credenciales nuevas de
producción por canal seguro. Supabase ya contiene una copia verificada;
no ejecutar nuevamente la importación inicial sobre ese destino con datos.
