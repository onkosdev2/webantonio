# Guía del MCP de ONKOS

## 1. Propósito

El MCP de ONKOS conecta ChatGPT con el archivo editorial de casos clínicos y noticias de Actualidad. Permite consultar contenido, crear borradores, preparar imágenes y publicar mediante flujos interactivos o automatizaciones preautorizadas.

El servidor conectado a ChatGPT se identifica como:

- Nombre técnico: `onkos-content-publisher`
- Versión actual: `2.3.0`
- Endpoint local: `http://localhost:3000/mcp`
- Transporte: Streamable HTTP con OAuth en producción; túnel opcional en local
- Número de acciones del catálogo: 22

El diseño del flujo prioriza cuatro principios:

1. Todo caso nuevo comienza como borrador.
2. La anonimización debe ser confirmada y validada.
3. Las imágenes se planifican antes de generarse.
4. La publicación requiere una orden inequívoca del usuario.

---

## 2. Qué puedes hacer desde ChatGPT

### Consultar el archivo

Puedes:

- listar los casos más recientes;
- filtrar los casos recientes por estado;
- buscar por palabras presentes en el título, resumen o slug;
- recuperar un caso completo mediante su slug;
- revisar su cuerpo, metadatos oncológicos, plan visual e imágenes;
- obtener enlaces hacia la edición en el panel y, cuando corresponda, hacia la entrada pública.

### Crear casos clínicos

Puedes convertir una conversación en un caso clínico estructurado con:

- título;
- resumen;
- cuerpo en Markdown;
- tipo de tumor;
- estadio;
- biomarcadores;
- línea y plan de tratamiento;
- respuesta;
- toxicidades;
- nivel de evidencia;
- etiquetas;
- confirmación de anonimización;
- un plan opcional de 3 a 5 figuras.

El contenido se guarda siempre con estado `DRAFT`. La creación nunca publica automáticamente.

### Gestionar el plan visual

Puedes crear o reemplazar un plan de entre 3 y 5 figuras. Para cada figura se define:

- título;
- categoría;
- propósito;
- mensaje educativo;
- prompt de generación;
- posición dentro del artículo;
- encabezado de referencia, cuando se inserta después de una sección;
- indicación de si será la imagen principal.

Si ninguna figura se marca como principal, la primera se selecciona por defecto dentro del plan.

### Generar imágenes

Puedes generar una imagen por cada llamada usando:

- OpenAI, proveedor predeterminado;
- NVIDIA;
- ComfyUI local.

Formatos disponibles:

- `16:9`
- `4:3`

La imagen puede insertarse automáticamente en el cuerpo del caso y se almacena asociada al contenido y a su figura editorial.

### Definir la portada

Puedes seleccionar cualquier imagen ya generada y perteneciente al caso como imagen principal. Al hacerlo, ONKOS desmarca la portada anterior para mantener una sola imagen principal.

### Publicar

Puedes publicar un caso únicamente cuando:

- el usuario lo solicita explícitamente;
- la llamada incluye exactamente `confirmation: "PUBLICAR"`;
- el caso está marcado como anonimizado;
- la validación automática no detecta identificadores personales;
- existe una imagen principal.

---

## 3. Las 22 acciones disponibles

### 3.1 `list_recent_clinical_cases`

Lista los casos más recientes, ordenados desde el último actualizado.

Úsala para expresiones como:

- “Muéstrame los últimos cinco casos”.
- “¿Qué casos recientes hay?”.
- “Dame los últimos casos publicados”.

Entradas:

| Campo | Valores | Comportamiento |
|---|---|---|
| `limit` | 1–20 | Cantidad de resultados. Por defecto: 5. |
| `status` | `ALL`, `DRAFT`, `PENDING_REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED` | Estado solicitado. Por defecto: `ALL`. |

Devuelve título, resumen, slug, estado, fecha de actualización y enlaces. Para un borrador, el enlace principal conduce a la edición; para una publicación, conduce a la entrada pública.

Ejemplo para ChatGPT:

> @ONKOS · Casos clínicos muéstrame los últimos cinco casos publicados, con título y enlace público.

Llamada esperada:

```json
{
  "limit": 5,
  "status": "PUBLISHED"
}
```

### 3.2 `search_clinical_cases`

Busca casos por texto dentro del título, resumen o slug. También tolera una consulta vacía, aunque para listar recientes ChatGPT debe preferir `list_recent_clinical_cases`.

Entradas:

| Campo | Valores | Comportamiento |
|---|---|---|
| `query` | texto | Diagnóstico, tratamiento, biomarcador o término que se desea buscar. |
| `limit` | 1–20 | Cantidad máxima. Por defecto: 10. |

Ejemplo:

> @ONKOS · Casos clínicos busca casos sobre cáncer de mama HER2 y muéstrame título, estado y enlace.

Llamada esperada:

```json
{
  "query": "cáncer de mama HER2",
  "limit": 10
}
```

### 3.3 `get_clinical_case`

Recupera la versión completa de un caso mediante su slug.

Devuelve:

- estado, título, resumen y cuerpo;
- metadatos oncológicos;
- figuras planificadas;
- prompts de las figuras;
- posición y estado de cada figura;
- imágenes generadas y sus identificadores;
- imagen principal;
- enlace público y enlace de edición.

Ejemplo:

> @ONKOS · Casos clínicos revisa el caso `cancer-gastrico-con-metastasis-oseas-e-ninfiltracion-leptomeningea` y dime si tiene plan visual e imagen principal.

### 3.4 `create_clinical_case_draft`

Crea un nuevo caso clínico en estado borrador.

Requisitos mínimos:

- título de al menos 10 caracteres;
- resumen de al menos 40 caracteres;
- cuerpo de al menos 120 caracteres;
- tipo de tumor;
- `anonymizedConfirmed: true`;
- ausencia de identificadores personales detectables.

El cuerpo admite Markdown, por ejemplo:

```markdown
## Presentación clínica

Descripción anonimizada del caso.

## Evaluación diagnóstica

Hallazgos relevantes.

## Tratamiento y evolución

Conducta, respuesta y seguimiento.

## Discusión

Valor educativo y contexto clínico.
```

Ejemplo seguro:

> @ONKOS · Casos clínicos convierte esta conversación en un borrador. El caso está anonimizado y confirmo que no contiene nombres, documentos, direcciones, teléfonos, correos ni fechas identificables. No publiques todavía.

Resultado:

- identificador y slug nuevos;
- estado `DRAFT`;
- enlace de edición;
- enlace público reservado;
- estado del plan visual, que será `NOT_CONFIGURED` si no se enviaron figuras.

### 3.5 `configure_case_images`

Crea o reemplaza el plan visual vigente del caso.

Reglas:

- mínimo 3 figuras;
- máximo 5 figuras;
- como máximo una figura marcada como principal;
- cada prompt debe tener al menos 30 caracteres;
- si se usa `after_heading`, debe indicarse `placementAnchor`.

Posiciones posibles:

| Posición | Resultado |
|---|---|
| `cover_only` | La imagen queda disponible como portada, sin insertarse en el cuerpo. |
| `after_introduction` | Se inserta después del primer bloque introductorio. |
| `after_heading` | Se inserta después del encabezado Markdown indicado. |
| `end_of_article` | Se añade al final del contenido. |

Importante: esta acción reemplaza el plan visual vigente. El plan anterior queda obsoleto (`STALE`).

Ejemplo:

> @ONKOS · Casos clínicos prepara para este caso un plan de cuatro figuras no redundantes: portada editorial, radiología, histopatología y una figura de evolución. Muéstrame el plan antes de generar imágenes.

### 3.6 `generate_case_image`

Genera una sola figura aprobada por llamada.

Entradas:

| Campo | Valores | Descripción |
|---|---|---|
| `slug` | slug del caso | Caso propietario de la imagen. |
| `figureNumber` | 1–5 | Figura del plan que se generará. |
| `provider` | `openai`, `nvidia`, `comfyui` | Generador de imágenes. OpenAI es el predeterminado. |
| `aspectRatio` | `16:9`, `4:3` | Proporción de salida. |
| `insertInBody` | booleano | Inserta la imagen según el plan. Por defecto: `true`. |
| `altText` | texto opcional | Texto alternativo accesible. |

El sistema:

1. verifica que la figura pertenezca al plan vigente y esté lista;
2. genera una imagen usando el prompt aprobado;
3. crea el activo multimedia;
4. la marca como principal si así lo indica el plan;
5. la inserta en el Markdown cuando corresponde;
6. cambia la figura a estado `GENERATED`.

Si el encabezado indicado no existe, utiliza el final del artículo como posición alternativa e informa `placement_fallback: true`.

Ejemplo:

> @ONKOS · Casos clínicos genera la figura 2 del caso indicado con OpenAI en formato 16:9 e insértala en el cuerpo.

### 3.7 `set_case_featured_image`

Selecciona como portada una imagen ya generada.

Necesita:

- slug del caso;
- `mediaId` de una imagen perteneciente al mismo caso.

Ejemplo:

> @ONKOS · Casos clínicos revisa las imágenes del caso y define la figura de radiología como imagen principal.

ChatGPT primero debe consultar el caso para obtener el identificador del activo y después ejecutar el cambio.

### 3.8 `publish_clinical_case`

Publica el caso y habilita su entrada pública.

Necesita:

```json
{
  "slug": "slug-del-caso",
  "confirmation": "PUBLICAR"
}
```

Ejemplo:

> @ONKOS · Casos clínicos publica el caso `slug-del-caso`. Confirmo expresamente: PUBLICAR.

Antes de solicitarlo se recomienda pedir:

> Revisa el caso completo, su anonimización, el plan visual y la portada. No publiques; enumera cualquier problema pendiente.

### 3.9–3.17 Noticias de Actualidad

Las nueve acciones de noticias son:

| Acción | Propósito |
|---|---|
| `list_recent_news` | Lista noticias recientes por estado. |
| `search_news` | Busca noticias por texto y estado. |
| `create_news_draft` | Crea un borrador con nombre y URL de fuente obligatorios. |
| `find_reusable_news_images` | Busca medios no sensibles que puedan reutilizarse. |
| `attach_existing_news_image` | Asocia un medio existente como portada. |
| `generate_news_image` | Genera y almacena una portada editorial. |
| `get_news_item` | Recupera la noticia, fuente, estado y medios para revisión. |
| `publish_news` | Publica de forma interactiva con `confirmation=PUBLICAR`. |
| `publish_news_automated` | Ejecuta crear, generar portada y publicar dentro de una automatización preautorizada. |

Toda noticia requiere un nombre de fuente real y una URL HTTP o HTTPS. El flujo
interactivo debe revisar la fuente y la portada antes de publicar. El método
automático es idempotente por URL de fuente y conserva el borrador si una etapa
posterior falla.

---

### 3.18 `update_clinical_case`

Edita parcialmente un caso sin cambiar su slug ni publicarlo. Campos omitidos se conservan; los cambios clínicos marcan el plan visual como `STALE` para revisión. Requiere `anonymizedConfirmed: true` y valida de nuevo la privacidad.

```json
{
  "slug": "caso-ejemplo",
  "anonymizedConfirmed": true,
  "changes": { "title": "Título clínico revisado y anonimizado", "tags": ["pulmón"] }
}
```

`changes` admite título, resumen, cuerpo, etiquetas, tumor, estadio, biomarcadores, línea/plan de tratamiento, respuesta, toxicidades, evidencia y notas de revisión. No admite cambiar estado ni slug.

### 3.19 `archive_clinical_case`

Retira el caso del sitio público con `{"slug":"caso-ejemplo","confirmation":"ARCHIVAR"}`. Es un borrado lógico: conserva texto, medios e historial. Repetir el archivado es seguro. La restauración queda en el panel.

### 3.20 `update_news_item`

Edita parcialmente una noticia con `slug` y `changes`. Admite `title`, `summary`, `body`, `tags`, `tumorType`, `biomarkers`, `sourceName` y `sourceUrl`. La fuente debe ser HTTP(S), mantenerse completa y no duplicar otra noticia. Conserva los campos omitidos, el estado y el slug.

### 3.21 `archive_news_item`

Retira una noticia sin borrar archivos: `{"slug":"noticia-ejemplo","confirmation":"ARCHIVAR"}`.

En las cuatro herramientas puedes enviar `expectedUpdatedAt` con el `updated_at` de la última lectura para detectar cambios concurrentes. Para editar contenido ya publicado, añade `confirmation: "ACTUALIZAR_PUBLICADO"` tras la aprobación del usuario. Un elemento archivado no se puede editar mediante estas herramientas.

### 3.22 `manage_publication_images`

Gestiona portada y galería para `entity: "clinical_case"` o `"news_item"` y un `slug`.

| `action` | Parámetro | Uso |
| --- | --- | --- |
| `add_gallery` | `files` + `images` | Carga archivos expresamente para la galería sin reemplazar las cargas anteriores. |
| `replace_gallery` | `files` + `images` | Redefine la galería con los archivos cargados y el orden indicados. |
| `set_featured` | `featuredMediaId` o un archivo en `images` | Selecciona una imagen de la publicación que no sea de galería, o carga una portada directamente. |
| `reorder_gallery` | `mediaIds` | Ordena todos los IDs de la galería, una sola vez cada uno. |
| `remove_gallery` | `mediaIds` | Quita imágenes de la galería sin borrar archivos ni cambiar la portada. |

Cada entrada de `images` requiere `title` y `altText`; `caption` es opcional. ChatGPT aporta los archivos PNG/JPEG/WEBP en `files`, en el mismo orden que `images`, mediante referencias del cliente. Otros clientes pueden enviar `images[].file`. Se conserva `images[].imageBase64` opcional para compatibilidad: nunca se pide al modelo convertir un adjunto. **No admite `mediaId`, rutas locales ni URLs externas arbitrarias para agregar/reemplazar.** La galería acepta únicamente cargas realizadas para ese propósito: nunca incorpora ni reutiliza portadas, figuras generadas o imágenes existentes en la publicación o biblioteca. Si no hay archivos aportados para galería, no se generan sustitutos y no aparece carrusel. Los `mediaIds` de ordenar/quitar solo identifican cargas previas de esa misma galería.

Para cargar archivos a casos se exige `anonymizedConfirmed: true` tras revisar visualmente su anonimización. El servidor elimina metadatos EXIF, pero no detecta identificadores escritos dentro de los píxeles. La procedencia de un archivo externo requiere revisión humana; no se intenta inferir mediante sus píxeles si fue creado con IA.

```json
{
  "entity": "news_item",
  "slug": "noticia-ejemplo",
  "action": "add_gallery",
  "files": [
    {
      "download_url": "<REFERENCIA_HTTPS_TEMPORAL_DEL_CLIENTE>",
      "file_id": "<ID_DEL_ADJUNTO_DEL_CLIENTE>",
      "mime_type": "image/png",
      "file_name": "imagen.png"
    }
  ],
  "images": [
    {
      "title": "Imagen aportada para galería",
      "altText": "Descripción accesible de la imagen aportada",
      "caption": "Imagen complementaria de la publicación"
    }
  ]
}
```

Los marcadores deben sustituirse por referencias reales suministradas por el cliente, nunca inventarse ni enviarse literalmente. El contrato oficial de ChatGPT exige `files` en el primer nivel con `_meta["openai/fileParams"]`; consulta el [schema, la configuración y las limitaciones de transporte](MCP_IMAGE_ATTACHMENTS.md). La respuesta incluye `success`, `added`, `updated`, `removed`, `galleryCount`, `featuredImage` y los campos anteriores `gallery`/`featured_media_id`. Para subir una portada usa `action: "set_featured"`, un adjunto en `files` y sus metadatos en `images`. También sigue funcionando una sola imagen Base64. No pasa por la galería. Puedes elegir `featuredMediaId` de una imagen de la publicación, pero no de una carga de galería. Las dos finalidades no se convierten una en otra.

Límites: 10 MB por archivo, 20 MB por lote, 20 imágenes por llamada y 30 en la galería. No se reutilizan imágenes existentes, sensibles ni de otra publicación. No se descargan URLs arbitrarias. En contenido publicado se requiere `ACTUALIZAR_PUBLICADO`; también acepta `expectedUpdatedAt`.

El sitio muestra la galería **al final del cuerpo**, en un carrusel manual con botones, teclado y desplazamiento táctil. No recorta las imágenes clínicas ni reproduce diapositivas automáticamente. Portada, figuras del cuerpo y galería son independientes. Redefinir significa cambiar la selección, no retocar píxeles con IA.

## 4. Flujo editorial recomendado

### Dos modos desde una sola instrucción

ChatGPT debe separar la creación según la intención expresada por el usuario:

| Intención | Frases habituales | Comportamiento |
|---|---|---|
| `DRAFT_ONLY` | “crea un borrador”, “guárdalo para revisar”, “no publiques” | Crea el caso con `create_clinical_case_draft` y se detiene. |
| `DIRECT_PUBLISH` | “publica directamente”, “crea y publica”, “quiero que quede publicado” | Ejecuta creación, plan visual, generación individual de todas las figuras, revisión y publicación. |

Si la intención es ambigua, ONKOS debe aplicar `DRAFT_ONLY`.

Aunque el usuario solicite publicación directa, el sistema crea primero un borrador técnico. Esto permite conservar el trabajo sin hacerlo público si falla una imagen, la comprobación de privacidad o cualquier requisito editorial. El borrador intermedio no requiere una segunda instrucción: ChatGPT debe continuar automáticamente hasta publicar cuando la orden inicial haya sido inequívoca y todas las validaciones se completen.

Ejemplo de borrador:

> @ONKOS · Casos clínicos crea este caso como borrador para revisarlo después. El contenido está anonimizado. No configures imágenes y no publiques.

Ejemplo de publicación directa:

> @ONKOS · Casos clínicos crea y publica directamente este caso anonimizado. Decide entre 3 y 5 figuras, genera todas con OpenAI, selecciona la portada, revisa el resultado y publícalo. Autorizo expresamente la publicación.

En publicación directa, el orden esperado es:

```text
create_clinical_case_draft
        ↓
configure_case_images (si el borrador no incluyó ya el plan)
        ↓
generate_case_image (una llamada por cada figura)
        ↓
get_clinical_case
        ↓
publish_clinical_case { confirmation: "PUBLICAR" }
```

Si una etapa falla, ChatGPT debe detenerse antes de `publish_clinical_case`, conservar el estado `DRAFT` e informar qué acción falta.

### Paso 1. Consultar antes de crear

Busca casos similares para reducir duplicados:

> Busca casos sobre adenocarcinoma gástrico con infiltración leptomeníngea.

### Paso 2. Preparar el contenido en la conversación

Solicita a ChatGPT que organice el caso, identifique campos ausentes y redacte una versión clínica coherente. No lo envíes todavía si contiene datos personales.

### Paso 3. Anonimizar

Elimina nombres, documentos, teléfonos, correos, direcciones, identificadores hospitalarios y fechas que permitan reconocer al paciente. La afirmación del usuario no sustituye la revisión del contenido: ONKOS ejecuta además una validación automática.

### Paso 4. Crear el borrador

> El contenido está anonimizado. Crea el caso como borrador y devuélveme el enlace de edición. No publiques.

### Paso 5. Revisar en ONKOS

Abre el `edit_url`, revisa la redacción, los encabezados Markdown y los metadatos clínicos.

### Paso 6. Configurar entre 3 y 5 figuras

Pide figuras diferentes y con valor educativo claro. La configuración puede incluirse al crear el borrador o añadirse después.

### Paso 7. Generar y revisar cada imagen

La generación ocurre una imagen por petición. Revisa cada resultado antes de continuar con la siguiente figura.

### Paso 8. Elegir portada

Confirma que existe exactamente una imagen principal apropiada.

### Paso 9. Auditoría previa

> Recupera el caso completo y verifica contenido, anonimización, figuras, imágenes y portada. No publiques.

### Paso 10. Publicar

Solo después de la revisión:

> Publica este caso. Confirmación: PUBLICAR.

---

## 5. Ejemplos de solicitudes útiles

### Inventario y búsqueda

> Muéstrame los diez casos más recientes, independientemente de su estado.

> Muéstrame los últimos cinco casos publicados con título y enlace público.

> Busca casos que mencionen HER2 y separa publicados de borradores.

> Busca posibles duplicados de este título antes de crear un caso nuevo.

### Revisión

> Recupera este caso y resume qué metadatos oncológicos, figuras e imágenes tiene configurados.

> Comprueba si el caso tiene portada y si todas las figuras del plan ya fueron generadas.

> Muéstrame los prompts utilizados en las figuras del caso.

### Creación

> Transforma esta conversación en un caso clínico estructurado. Antes de enviarlo a ONKOS, indícame qué datos clínicos faltan y qué información podría identificar al paciente.

> Crea el borrador sin figuras; configuraré el plan visual después.

> Crea el borrador con cuatro figuras editoriales y marca la primera como portada. No generes imágenes ni publiques.

### Imágenes

> Reemplaza el plan visual por tres figuras: una portada editorial, una figura radiológica y una figura histopatológica. No generes todavía.

> Genera solamente la figura 1 con OpenAI en 16:9 y úsala como portada.

> Genera la figura 2 con ComfyUI en 4:3 e insértala después de “Evaluación diagnóstica”.

> Recupera el caso, enumera las imágenes existentes y define como principal la imagen con identificador indicado.

### Publicación

> Revisa si el caso cumple todos los requisitos de publicación. No publiques.

> Publica el caso. Confirmación explícita: PUBLICAR.

### Actualidad y publicación automática

Las noticias se crean con nombre y URL de fuente obligatorios. El flujo interactivo usa
`create_news_draft`, una imagen existente o `generate_news_image`, y finalmente
`publish_news` con confirmación `PUBLICAR`.

Las tareas recurrentes preautorizadas deben usar exclusivamente
`publish_news_automated`. Esta acción recibe la noticia validada y ejecuta internamente
crear o recuperar el borrador por URL, generar y asociar la portada, y publicar. Es
idempotente por URL de fuente y no requiere `confirmation=PUBLICAR`. Si falla después de
crear el borrador, lo conserva y devuelve `completed=false` con una etapa reintentable.

---

## 6. Estados importantes

### Estado del contenido

| Estado | Significado |
|---|---|
| `DRAFT` | Borrador editable, no visible públicamente. |
| `PENDING_REVIEW` | Pendiente de revisión editorial. |
| `SCHEDULED` | Programado. |
| `PUBLISHED` | Publicado y disponible en la web. |
| `ARCHIVED` | Archivado. |

Actualmente las acciones de ChatGPT crean borradores y publican. No incluyen una acción específica para programar, archivar o mover un caso a revisión.

### Estado de las figuras

| Estado | Significado |
|---|---|
| `READY` | Prompt aprobado y preparado para generar. |
| `GENERATING` | Generación en curso. |
| `GENERATED` | Imagen generada correctamente. |
| `FAILED` | La generación falló. |
| `STALE` | Figura perteneciente a un plan reemplazado. |

---

## 7. Seguridad y privacidad

### Datos clínicos

No envíes a ChatGPT ni al MCP:

- nombres o apellidos del paciente;
- número de documento, historia clínica o póliza;
- teléfono, correo o dirección;
- fecha de nacimiento completa;
- identificadores incluidos en imágenes o informes;
- combinaciones de datos que permitan identificar a una persona.

La confirmación `anonymizedConfirmed: true` debe corresponder a una revisión real. El servidor vuelve a examinar el título, resumen y cuerpo; si detecta riesgos, rechaza la creación o publicación.

### Acciones de escritura

- Crear borrador modifica la base de datos, pero no publica.
- Configurar imágenes reemplaza el plan visual vigente.
- Generar una imagen puede consumir servicios externos y modificar el cuerpo.
- Cambiar portada modifica la imagen principal.
- Publicar hace visible el caso y requiere confirmación explícita.
- `publish_news_automated` hace visible una noticia sin confirmación interactiva y solo
  debe autorizarse para una tarea recurrente controlada.

### Autenticación actual

En desarrollo local, `/mcp` acepta solicitudes sin autenticación de aplicación. El acceso local desde ChatGPT puede limitarse mediante Secure MCP Tunnel. En producción, el endpoint implementa OAuth 2.1 con PKCE y reutiliza la sesión del panel para mostrar consentimiento. También acepta `MCP_API_TOKEN` para clientes técnicos compatibles. `MCP_ALLOW_UNAUTHENTICATED=true` debe usarse únicamente detrás de un túnel privado, nunca en la URL pública.

No incluyas claves de OpenAI, NVIDIA, túnel o almacenamiento en conversaciones, capturas ni este documento.

---

## 8. Qué todavía no puede hacerse desde el complemento

La versión actual no expone acciones de ChatGPT para:

- eliminar físicamente una publicación o sus archivos;
- restaurar una publicación archivada desde MCP;
- regenerar una imagen mediante el mismo identificador;
- programar una publicación;
- mover un caso a `PENDING_REVIEW`;
- ejecutar automáticamente todo el lote de imágenes con una única llamada;

Estas operaciones deben realizarse en el panel o requieren ampliar el contrato MCP.

---

## 9. Diferencia entre `/mcp` y `/panel/mcp`

### Complemento de ChatGPT: `/mcp`

Es el servidor MCP estándar conectado mediante OAuth en producción o Secure MCP Tunnel en desarrollo local. Expone 22 acciones para casos clínicos y noticias de Actualidad.

### Consola administrativa: `/panel/mcp`

Es una página informativa del servidor y sus reglas de conexión. La antigua consola ejecutora, sus cinco herramientas fuera del catálogo y los endpoints `/api/mcp/tools`, `/api/mcp/resource` y `/api/mcp/resources` se retiraron.

Las importaciones, la ingestión de noticias y la cola editorial conservan sus funciones internas en `lib/content/editorial-workflows.ts`, sin exponerlas como herramientas. Para verificar el catálogo consulta `tools/list` desde `/mcp`.

---

## 10. Operación local

### Levantar ONKOS

Desde el directorio del proyecto:

```bash
npm run dev -- --port 3000
```

Comprueba el servidor:

```bash
curl -i http://127.0.0.1:3000/mcp
```

Un `HTTP 406` mediante una petición GET simple puede indicar que el endpoint existe pero espera una solicitud MCP válida.

### Comprobar el túnel

```bash
tunnel-client doctor --profile onkos-local --explain
```

Resultado esperado:

```text
RESULT ok
```

### Ejecutar el túnel

```bash
tunnel-client run --profile onkos-local
```

Mantén esa terminal abierta durante el uso de ChatGPT.

Superficies locales:

- Estado: `http://127.0.0.1:8080/healthz`
- Preparación: `http://127.0.0.1:8080/readyz`
- Interfaz de administración: `http://127.0.0.1:8080/ui`

### Actualizar herramientas en ChatGPT

Cuando se agregue o cambie una acción:

1. comprueba el catálogo local del servidor;
2. abre la configuración del complemento ONKOS;
3. actualiza o reconecta el complemento;
4. si no hay opción de actualización, elimínalo y créalo de nuevo usando el mismo túnel;
5. confirma que ChatGPT muestre las 22 acciones actuales, incluidas las cinco nuevas de edición, archivado e imágenes;
6. realiza la prueba en un chat nuevo.

No es necesario crear un túnel nuevo para actualizar el catálogo de herramientas.

---

## 11. Resolución de problemas

### ChatGPT devuelve `items: []`

- Para “últimos casos”, confirma que llamó a `list_recent_clinical_cases`.
- Para búsquedas, prueba un término presente en el título o resumen.
- Revisa que ONKOS esté usando la base de datos correcta.
- Reconecta el complemento si ChatGPT conserva una definición antigua.

### El túnel no aparece en ChatGPT

- Verifica que el túnel esté asociado al workspace de ChatGPT.
- Confirma permisos `Tunnels Read + Use`.
- Mantén `tunnel-client run` activo.
- Asegúrate de utilizar la misma cuenta y workspace en Platform y ChatGPT.

### La creación es rechazada por privacidad

- Revisa los identificadores indicados por el error.
- Sustituye datos personales por descripciones generales.
- No intentes evitar el control marcando únicamente la confirmación.

### No se puede generar una imagen

- Comprueba que exista un plan vigente con estado `READY`.
- Verifica que el número de figura sea correcto.
- Confirma las claves y disponibilidad del proveedor elegido.
- Revisa el prompt y el estado `FAILED` de la figura.

### No se puede publicar

Comprueba, en este orden:

1. el caso existe;
2. está anonimizado;
3. no contiene identificadores detectables;
4. tiene una imagen principal;
5. la confirmación enviada es exactamente `PUBLICAR`.

---

## 12. Prueba funcional mínima

Ejecuta estas instrucciones en orden:

1. `@ONKOS · Casos clínicos muéstrame los últimos cinco casos, con título, estado y enlace.`
2. `Busca casos que contengan “cáncer de colon”.`
3. `Recupera el primer caso encontrado y dime si tiene portada y figuras.`
4. `No modifiques ni publiques nada.`

La primera llamada debe usar `list_recent_clinical_cases`; la segunda, `search_clinical_cases`; la tercera, `get_clinical_case`.

Para validar escrituras, utiliza únicamente un caso ficticio y anonimizado, mantenlo como borrador y revisa el resultado desde:

```text
http://localhost:3000/panel/casos
```

---

## 13. Resumen ejecutivo

El MCP de ONKOS permite realizar desde ChatGPT el recorrido principal de publicación clínica:

```text
Consultar archivo
      ↓
Preparar y anonimizar el caso
      ↓
Crear borrador
      ↓
Configurar 3–5 figuras
      ↓
Generar una imagen por llamada
      ↓
Seleccionar portada
      ↓
Revisar
      ↓
Publicar con confirmación explícita
```

La plataforma conserva el control editorial: ChatGPT ayuda a estructurar y ejecutar el flujo, pero la revisión humana, la privacidad del paciente y la decisión final de publicación siguen siendo obligatorias.
