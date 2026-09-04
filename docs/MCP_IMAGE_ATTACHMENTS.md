# Adjuntos de imágenes en ONKOS MCP v2.3.0

`manage_publication_images` recibe referencias de archivos sin que ChatGPT
convierta las imágenes a Base64. El servidor descarga bytes, comprueba la imagen
y guarda una copia WebP procesada. Se conservan las imágenes existentes: no se
archivan nuevos originales sin procesar ni sus metadatos. No requiere cambios
de esquema ni migraciones de base de datos.

## Contrato

El descriptor publica `_meta: { "openai/fileParams": ["files"] }`. ChatGPT
requiere ese parámetro en el primer nivel: `files[i]` corresponde exactamente a
los metadatos `images[i]`. La referencia contiene las cuatro propiedades del
contrato oficial; solo `download_url` y `file_id` son obligatorias. Véase
[Define file inputs, documentación oficial de OpenAI](https://developers.openai.com/plugins/reference#define-file-inputs).

Representación del schema (el objeto Zod ejecutable está en
`lib/content/services/publication-images.ts`):

```ts
type FileReference = {
  download_url: string; // 1–8192 caracteres; referencia HTTPS temporal del cliente
  file_id: string;      // 1–300 caracteres; identificador opaco del cliente
  mime_type?: string;   // máximo 120 caracteres; se contrasta con los bytes
  file_name?: string;   // máximo 255 caracteres; nunca determina la ruta final
};

type ManagePublicationImages = {
  entity: "clinical_case" | "news_item";
  slug: string;
  action: "add_gallery" | "replace_gallery" | "set_featured"
    | "reorder_gallery" | "remove_gallery";
  files?: FileReference[]; // 1–20; canal de adjuntos nativos de ChatGPT
  images?: Array<{         // 1–20; mismo orden y longitud que files, si se envía
    file?: FileReference;  // alternativa para otros clientes MCP
    imageBase64?: string;  // opcional; compatibilidad, máximo 14.000.000 caracteres
    title: string;         // 3–250 caracteres
    altText: string;       // 10–1000 caracteres
    caption?: string;      // máximo 2000 caracteres
  }>;
  mediaIds?: string[];     // 1–30 IDs sin duplicados; solo ordenar/quitar
  featuredMediaId?: string;
  anonymizedConfirmed?: true;
  confirmation?: "ACTUALIZAR_PUBLICADO";
  expectedUpdatedAt?: string; // ISO datetime de la última lectura
};
```

Los objetos rechazan propiedades desconocidas. El descriptor expone un objeto
Zod sin envolver en `ZodEffects`, para evitar que el SDK anuncie un schema vacío;
el servicio aplica además todas las validaciones condicionales.

| Acción | Entrada permitida | Efecto |
| --- | --- | --- |
| `add_gallery` | Archivos y metadatos, sin IDs de medios | Agrega cargas dedicadas. Si una carga idéntica ya pertenece a esa galería, actualiza metadatos sin duplicarla. |
| `replace_gallery` | Archivos y metadatos, sin IDs de medios | Redefine selección y orden; no borra archivos retirados. |
| `set_featured` | Un archivo y metadatos **o** `featuredMediaId` | Cambia solo portada. Un ID debe pertenecer a esa publicación y no a galería. |
| `reorder_gallery` | `mediaIds`, sin archivos | Requiere todos los IDs visibles de esa galería exactamente una vez. |
| `remove_gallery` | `mediaIds`, sin archivos | Retira esas entradas del carrusel, conservando archivos y registros. |

### Fuentes y compatibilidad

- Cada imagen debe tener un archivo (`files[i]` o `images[i].file`) o Base64.
- No se permite mezclar `files` e `images[].file` en una operación.
- Si hay archivo y Base64, se usa el archivo y se exige igualdad exacta de bytes
  de entrada. No se comparan solo píxeles ni se sustituyen fuentes silenciosamente.
- Si la referencia vence o falla, no se utiliza Base64 para eludir el error:
  el cliente debe aportar una referencia nueva. Base64 es la alternativa cuando
  no se envía referencia, y admite el formato histórico puro o data URL soportada.
- `file_id` es una referencia opaca, no un `mediaId`, una ruta del servidor ni
  una autorización suficiente para descargar cualquier URL.
- Ningún proceso busca portadas, figuras generadas o imágenes del cuerpo para
  rellenar la galería. Solo las cargas expresamente destinadas a ella participan
  del carrusel final. No se genera contenido con IA en esta herramienta.

## Ejemplo de llamada desde un cliente compatible

Ejemplo conceptual para un caso publicado. Los marcadores deben reemplazarse
por valores reales del cliente; el modelo no debe inventar URLs ni IDs.

```json
{
  "entity": "clinical_case",
  "slug": "caso-ejemplo",
  "action": "add_gallery",
  "files": [{
    "download_url": "<URL_HTTPS_TEMPORAL_DEL_ADJUNTO>",
    "file_id": "<ID_REAL_DEL_CLIENTE>",
    "mime_type": "image/png",
    "file_name": "imagen-anonimizada.png"
  }],
  "images": [{
    "title": "Imagen complementaria",
    "altText": "Descripción accesible de la imagen complementaria",
    "caption": "Imagen aportada para la galería"
  }],
  "anonymizedConfirmed": true,
  "confirmation": "ACTUALIZAR_PUBLICADO"
}
```

El usuario puede adjuntar la imagen y pedir: “Agrega este archivo a la galería
del caso indicado; he revisado su anonimización. Autorizo modificar la publicación”.
ChatGPT debe usar la referencia del adjunto y redactar los metadatos, sin
convertir, reconstruir ni transcribir los bytes como Base64.

Para clientes antiguos sigue siendo válida la misma llamada sin `files` y con
`images: [{ imageBase64: "<BASE64_REAL>", title: "...", altText: "..." }]`.

## Seguridad y configuración

Antes de habilitar adjuntos reales, el operador debe configurar
`MCP_ATTACHMENT_ALLOWED_HOSTS` en las variables protegidas del servidor. Es una
lista separada por comas de **hostnames exactos verificados del proveedor**:
sin protocolo, rutas, puertos, comodines ni permisos automáticos para subdominios.
Vacía por defecto: falla de forma segura con `ATTACHMENT_HOST_NOT_CONFIGURED`;
Base64 continúa funcionando. Las pruebas automatizadas no requieren configurarla.

No se presupone un dominio de descargas de OpenAI: la sección de contrato citada
no fija uno. Obtén una referencia desde el cliente real y verifica su proveedor
y hostname antes de permitirlo. No pegues URLs firmadas, tokens ni credenciales
en chats, documentación o logs. No autorices dominios porque el modelo los proponga.
Cambiar esta variable en producción requiere reiniciar/desplegar el servicio.

### Diagnóstico del dominio rechazado en Render

Si la carga devuelve `ATTACHMENT_HOST_NOT_ALLOWED` o
`ATTACHMENT_HOST_NOT_CONFIGURED`, abre **Render → webantonio → Logs** y busca
`attachment_host_rejected` después de repetir la carga. Cada rechazo produce
una línea como esta (dominio ficticio, no un valor para autorizar):

```text
[mcp] attachment_host_rejected {"code":"ATTACHMENT_HOST_NOT_ALLOWED","hostname":"attachments.example.com"}
```

Solo se registran el código y el hostname normalizado. No se registran la URL,
ruta, parámetros firmados, credenciales, ID/nombre del archivo ni metadatos de
la publicación. Hostnames malformados o mayores de 253 caracteres aparecen como
`[invalid-hostname]`. Las referencias inválidas no se vuelcan en los logs.

El registro ocurre antes de DNS, descarga o guardado, y no autoriza ese dominio.
Verifica que el hostname pertenezca al proveedor de la referencia real antes
de agregarlo a `MCP_ATTACHMENT_ALLOWED_HOSTS`; nunca habilites comodines ni un
dominio solo porque aparezca en un error. Este diagnóstico no modifica la base
de datos, las imágenes existentes ni la respuesta pública de la herramienta.

Controles aplicados:

- Solo HTTPS y hosts permitidos; sin credenciales en URL ni puertos alternativos.
- Todas las direcciones DNS deben ser públicas; la conexión fija una IP validada
  manteniendo comprobación TLS/SNI. Se bloquean redes privadas, loopback y metadatos.
- No se siguen redirecciones ni se reenvían cookies, tokens MCP o cabeceras de usuario.
- Máximo 15 segundos por descarga, incluyendo DNS. Referencias vencidas producen
  un error que pide volver a adjuntar; no se almacenan sus URLs temporales.
- Máximo 10 MiB por imagen, 20 MiB de entradas por lote, 20 imágenes por operación
  y 30 visibles en galería. Los límites anunciados como MB usan `1024 × 1024` bytes.
- Conteo de bytes durante streaming, validación de Content-Length y rechazo de
  compresión HTTP. Los límites no dependen del tamaño declarado por el cliente.
- Firma binaria PNG/JPEG/WEBP, MIME declarado/HTTP y extensión coherentes (cuando
  están disponibles), y decodificación completa de píxeles. Un MIME HTTP genérico
  `application/octet-stream` se permite, sin sustituir la validación real.
- Máximo 40 megapíxeles; copia WebP de hasta 2400 × 2400, proporción conservada,
  orientación corregida y sin EXIF/perfiles originales. No conserva animación.
- El nombre final procede de un hash SHA-256 de la copia procesada; nunca del
  nombre aportado. Se rechazan nombres con rutas, traversal o controles.
- Autorización OAuth `mcp:read mcp:write` (o token técnico existente) antes del
  handler; confirmación de publicado y versión antes de descargar y nuevamente
  dentro de la transacción con bloqueo de publicación.
- En casos clínicos, `anonymizedConfirmed: true` obligatorio para cargas; revisión
  de títulos y pies. Quitar EXIF **no** anonimiza identificadores visibles dentro
  de la imagen: la revisión humana sigue siendo imprescindible.

Todas las entradas se validan/procesan antes de guardar la selección en una
transacción. Un error de validación no cambia parcialmente la galería. Como en
el almacenamiento anterior, R2/disco no comparte transacción con PostgreSQL:
un fallo posterior de almacenamiento/DB puede dejar una copia huérfana, pero
nunca se borran archivos existentes como compensación.

## Resultado y errores

El resultado MCP incluye `structuredContent` y un resumen textual:

```ts
type ImageResult = {
  mediaId: string;
  title: string;
  altText: string | null;
  url: string;              // URL de almacenamiento o ruta local, no URL temporal
  position: number | null;  // 1-based en galería; null para portada/retirada
};
// Además de id, slug, status, updated_at, edit_url y public_url existentes:
type ImagesResult = {
  success: true;
  operationStatus: "completed";
  action: string;
  added: ImageResult[];
  updated: ImageResult[];   // carga idéntica reutilizada dentro de su propia galería
  removed: ImageResult[];
  galleryCount: number;
  featuredImage: ImageResult | null;
  featured_media_id: string | null;
  gallery: Array<{
    id: string; title: string; image_url: string; alt_text: string | null;
    caption: string | null; position: number; origin: string;
  }>;
};
```

`gallery` conserva los nombres y posiciones históricas (orden interno basado en
cero, que puede tener huecos tras retirar entradas). Las listas `added`/`updated`
usan posiciones visibles basadas en uno. Ordenar se confirma con `gallery`;
cambiar portada se confirma con `featuredImage`. Una portada no cuenta en `galleryCount`.

Los errores del handler devuelven `isError: true` y
`{ success: false, error: { code, message } }`. Ejemplos:
`FILE_NOT_RECEIVED`, `INVALID_IMAGE_ARGUMENTS`, `UNSUPPORTED_IMAGE_FORMAT`,
`INVALID_IMAGE_MIME`, `INVALID_IMAGE_EXTENSION`, `FILE_TOO_LARGE`, `BATCH_TOO_LARGE`,
`CONFLICTING_IMAGE_SOURCES`, `ATTACHMENT_EXPIRED`, `ATTACHMENT_TIMEOUT`,
`ATTACHMENT_HOST_NOT_CONFIGURED`, `ATTACHMENT_HOST_NOT_ALLOWED`, `GALLERY_FULL`,
`PUBLICATION_NOT_FOUND`. Las validaciones editoriales mantienen sus mensajes
accionables (confirmación, archivo y versión) bajo `IMAGE_OPERATION_FAILED`.
Un rechazo del schema por el SDK puede devolver solo `isError` y texto; un rechazo
de autenticación HTTP devuelve 401, antes de ejecutar la herramienta.

## Pruebas y limitación de transporte

```bash
npm run test:mcp:images:security
npm run test:mcp:images
npm run test:mcp:crud
npm run test:mcp:crud:auth
```

Consulta [la preparación del entorno aislado](../mcp/README.md). Las pruebas de
adjuntos incluyen los 14 escenarios solicitados, además de compatibilidad,
conflictos, respuestas, conservación, batch atómico y validación de URLs/MIME.
Usan bytes PNG/JPEG/WEBP reales, Sharp y PostgreSQL local; el cliente MCP es real,
pero HTTPS/DNS del proveedor se simulan. Seguridad cubre límites, SSRF, tiempos,
MIME/extensión, archivos dañados y eliminación de metadatos. CRUD y autorización
usan `/mcp` HTTP local y mantienen las otras herramientas sin cambios funcionales.

Streamable HTTP/MCP lleva argumentos JSON: no convierte automáticamente un
`File` del navegador, multipart, una ruta `sandbox:` ni un `file_id` aislado en
bytes accesibles al servidor. La solución implementada es la referencia oficial
de archivo con URL temporal descargable, anunciada mediante `openai/fileParams`.
Otros clientes deben proporcionar esa referencia por su mecanismo de carga;
si no lo implementan, pueden seguir enviando Base64 desde su propio código, no
desde el modelo. No se ha añadido un endpoint de subida genérico ni un bypass
para URLs arbitrarias.

Antes de considerar verificado ChatGPT de extremo a extremo: configurar hosts
verificados, actualizar/reconectar el catálogo del cliente, adjuntar un archivo
sintético a un borrador de prueba y comprobar el resultado. Que pasen las pruebas
simuladas no certifica que una versión concreta del cliente aporte referencias
ni que un enlace temporal real permita descarga directa sin redirecciones.

## Archivos de este cambio y verificación local

| Archivo | Cambio |
| --- | --- |
| `lib/content/services/publication-images.ts` | Schema de entrada, correspondencia archivos/metadatos, validación previa, límites y resultado detallado. |
| `lib/mcp/chatgpt-server.ts` | Descriptor `openai/fileParams`, instrucciones, errores y versión 2.3.0. |
| `app/mcp/route.ts` | Versión anunciada 2.3.0; transporte y autenticación conservados. |
| `lib/storage/publication-attachments.ts` (nuevo) | Referencias y descarga segura con protección SSRF, streaming y timeout. |
| `lib/storage/publication-image-errors.ts` (nuevo) | Errores tipados y límites de tamaño compartidos. |
| `lib/storage/publication-images.ts` | Validación real de formatos, procesamiento de copias y compatibilidad Base64. |
| `scripts/fixtures/attachment-downloads.mjs` (nuevo) | Doble HTTPS/DNS aislado para pruebas. |
| `scripts/mcp-image-attachments.mjs` (nuevo) | Pruebas MCP de archivos y reglas editoriales. |
| `scripts/mcp-attachment-security.mjs` (nuevo) | Pruebas de descarga y procesamiento seguros. |
| `scripts/mcp-crud.mjs` | Regresión del contrato y metadatos de archivos. |
| `scripts/mcp-crud-auth.mjs` | Regresión de permisos para adjuntos. |
| `package.json` | Comandos de prueba adicionales; sin nuevas dependencias. |
| `.env.example`, `.env.mcp-local.example` | Variable de hosts vacía y explicación; sin credenciales reales. |
| `README.md`, `mcp/README.md`, `docs/GUIA_MCP_ONKOS.md` | Versión, nuevo uso de adjuntos y pruebas. |
| `docs/MCP_IMAGE_ATTACHMENTS.md` (nuevo) | Este contrato, restricciones y guía operativa. |

Verificación local del cambio: 36 comprobaciones de adjuntos, 45 de seguridad,
127 de regresión CRUD y 15 de autorización: **223 superadas**. Compilación Next.js
de producción, `tsc --noEmit` y `git diff --check` sin errores. Sin pruebas con
adjuntos reales de ChatGPT ni modificaciones de publicaciones en producción.
