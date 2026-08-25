---
name: "Dr. Antonio Camargo"
description: "Un jardín editorial oncológico, cálido, sereno y contemporáneo."
colors:
  garden-deep: "#123836"
  garden-surface: "#173230"
  botanical-accent: "#184c46"
  warm-ivory: "#f3ecdf"
  luminous-ivory: "#faf4ea"
  botanical-ink: "#16211f"
  sage-muted: "#596561"
  earth-bronze: "#8c5a2b"
  restrained-gold: "#c6a56f"
typography:
  display:
    fontFamily: "Playfair Display, Baskerville, Iowan Old Style, Palatino, Georgia, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.4rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Baskerville, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "clamp(1.75rem, 3.2vw, 2.8rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.018em"
  title:
    fontFamily: "Baskerville, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.32rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  editorial-body:
    fontFamily: "Baskerville, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.08rem"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
  navigation:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  small:
    fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  gallery: "8px"
  control: "12px"
  field: "18px"
  tile: "20px"
  card: "28px"
  panel: "30px"
  pill: "999px"
spacing:
  space-1: "0.5rem"
  space-2: "0.9rem"
  space-3: "1.25rem"
  space-4: "1.75rem"
  space-5: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.botanical-accent}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 1.15rem"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.luminous-ivory}"
    textColor: "{colors.botanical-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 1.15rem"
    height: "46px"
  field:
    backgroundColor: "{colors.luminous-ivory}"
    textColor: "{colors.botanical-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.95rem 1rem"
  card:
    backgroundColor: "{colors.luminous-ivory}"
    textColor: "{colors.botanical-ink}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  chip:
    backgroundColor: "{colors.warm-ivory}"
    textColor: "{colors.botanical-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.8rem"
    height: "34px"
---

# Design System: Dr. Antonio Camargo

## Overview

**Creative North Star: "Un jardín editorial"**

El sistema combina la serenidad de la naturaleza con una composición editorial cuidada, sofisticada y contemporánea. Sus superficies marfil se sienten luminosas y acogedoras; los verdes profundos aportan estabilidad clínica; y los acentos dorados aparecen con la moderación de una señal de jerarquía, nunca como ornamento ostentoso.

La atmósfera es elegante, cálida y serena. La expresión visual debe evitar tanto la frialdad corporativa como la acumulación decorativa: cada capa, borde y transición existe para organizar conocimiento, mantener contexto y hacer que una plataforma médica extensa continúe sintiéndose humana y navegable.

**Key Characteristics:**

- Lujo orgánico, atemporal y acogedor.
- Contraste editorial entre serif expresiva y sans serif precisa.
- Capas marfil translúcidas sobre fondos cálidos y verdes botánicos.
- Dorado reservado para jerarquía, estado y detalle estructural.
- Interacción serena, precisa y ligeramente táctil.

## Colors

La paleta une verdes naturales y estables con marfiles cálidos; el bronce terroso y el dorado contenido aportan jerarquía sin convertir el sitio en una exhibición de lujo.

### Primary

- **Verde Jardín Profundo** (`garden-deep`): base oscura de navegación privada, paneles de contraste y fondos que necesitan autoridad tranquila.
- **Verde Botánico** (`botanical-accent`): acciones principales, foco accesible, enlaces activos y señales de confianza.

### Secondary

- **Bronce Tierra** (`earth-bronze`): etiquetas editoriales, detalles de autor y acentos cálidos de segundo nivel.
- **Dorado Contenido** (`restrained-gold`): indicadores activos, bordes selectivos y destellos de jerarquía usados con moderación.

### Neutral

- **Marfil Cálido** (`warm-ivory`): fondo general que evita la dureza del blanco puro.
- **Marfil Luminoso** (`luminous-ivory`): tarjetas, campos y superficies elevadas de lectura.
- **Tinta Botánica** (`botanical-ink`): texto principal de alto contraste.
- **Salvia Apagada** (`sage-muted`): texto auxiliar, resúmenes y metadatos.
- **Verde Superficie** (`garden-surface`): variante profunda para capas oscuras y consolas.

**The Golden Restraint Rule.** El dorado señala jerarquía o estado; nunca cubre grandes superficies ni compite con el contenido clínico.

**The Warm Canvas Rule.** Las superficies de lectura parten del marfil, no del blanco puro, para conservar continuidad y calidez.

## Typography

**Display Font:** Playfair Display, con Baskerville y serif editoriales como respaldo.
**Body Font:** Avenir Next, con Segoe UI y Helvetica como respaldo.
**Editorial Reading Font:** Baskerville, con Iowan Old Style, Palatino y Georgia como respaldo.
**Label/Mono Font:** Avenir Next para etiquetas y SFMono/Consolas para salidas técnicas.

**Character:** La serif introduce criterio, autoría y ritmo editorial; la sans serif sostiene navegación, formularios, metadatos y explicaciones con precisión contemporánea. La combinación permite hablar a profesionales y pacientes sin perder autoridad ni legibilidad.

### Hierarchy

- **Display** (600, escala fluida hasta 4.4rem, interlineado 0.92): títulos de portada, autenticación y cabeceras principales del panel.
- **Headline** (500, escala fluida hasta 2.8rem, interlineado 1.08): títulos de sección y bloques editoriales.
- **Title** (600, 1.32rem, interlineado 1.2): tarjetas, módulos y piezas relacionadas.
- **Body** (400, 1rem, interlineado 1.7): interfaz, resúmenes y contenido explicativo, normalmente limitado entre 58 y 70 caracteres por línea.
- **Editorial Body** (400, 1.08rem, interlineado 1.95): artículos largos y lectura clínica sostenida.
- **Label** (600, 0.75rem, espaciado 0.12em, mayúsculas): categorías, estados y metadatos breves. Es el mínimo tipográfico de la interfaz.
- **Navigation** (600, 0.8125rem): navegación principal, botones editoriales y acciones compactas.
- **Small** (400, 0.875rem, interlineado 1.55): notas, pies, ayudas y datos secundarios.

**The Two-Voices Rule.** La serif lleva la voz editorial y los títulos; la sans serif organiza la acción, la navegación y los datos.

**The Reading Air Rule.** Los artículos conservan interlineado generoso y una columna contenida; no se densifican para ganar espacio.

## Layout

El contenedor principal alcanza un máximo de 1240px y mantiene márgenes laterales mínimos de 1rem. Las páginas públicas se apoyan en una cuadrícula de doce columnas, con composiciones asimétricas de dos zonas para héroes y secciones destacadas, y retículas de dos a cuatro columnas para archivos y módulos. Los artículos se estrechan a 880px para proteger la lectura.

La escala espacial reutilizable avanza de 0.5rem a 2.5rem. Los paneles principales suelen usar entre 1.4rem y 3rem de relleno; las separaciones entre tarjetas se mantienen cerca de 1rem. La densidad es cómoda: suficiente aire para distinguir temas sin fragmentar excesivamente el recorrido.

En pantallas intermedias, las retículas extensas se reducen a dos columnas. A 960px, las composiciones principales pasan a una sola columna, los botones se vuelven de ancho completo y el panel privado transforma su barra lateral en navegación superior colapsable. La navegación pública activa su menú compacto a 900px.

**The Context Continuity Rule.** Toda retícula debe conservar señales visibles de sección, categoría o estado cuando cambia de tamaño; la adaptación nunca debe desorientar al lector.

## Elevation & Depth

La profundidad es ambiental antes que escénica. Las superficies se separan mediante marfiles translúcidos, bordes de baja opacidad y una sombra amplia y suave. La elevación más visible se reserva para controles activos, menús, modales o tarjetas en interacción; no se usan sombras duras ni dramáticas en reposo.

### Shadow Vocabulary

- **Ambient Panel** (`0 28px 80px rgba(18, 28, 27, 0.12)`): paneles, cabeceras, tarjetas públicas y contenedores principales.
- **Ambient Card** (`0 18px 54px rgba(18, 28, 27, 0.08)`): tarjetas secundarias y agrupaciones de perfil.
- **Interactive Lift** (`0 18px 34px rgba(20, 60, 56, 0.22)`): acción primaria y elementos que necesitan una respuesta táctil más clara.

**The Quiet Depth Rule.** En reposo, la profundidad separa estructuras sin convertirse en protagonista; la elevación evidente responde a interacción o temporalidad.

## Shapes

La forma dominante es suavemente redondeada y orgánica. Los paneles mayores usan esquinas amplias de 30px; las tarjetas se mueven entre 24px y 28px; campos y elementos internos emplean 18px; chips, botones y búsquedas adoptan cápsulas completas. La galería puede usar esquinas más contenidas de 8px para que la imagen conserve presencia editorial.

Los bordes son finos y translúcidos. Los marcos dorados aparecen solo como detalle selectivo, mientras que los contornos verde tinta organizan campos, tarjetas y divisores sin endurecer el conjunto.

**The Soft Geometry Rule.** Las curvas son generosas pero precisas; no se mezclan radios arbitrarios ni formas juguetonas que rompan el tono editorial.

## Components

Los componentes se sienten serenos, precisos y ligeramente táctiles: refinados al mirar, intuitivos al usar y discretos al responder.

### Buttons

- **Shape:** cápsula completa, altura mínima de 46px y relleno horizontal compacto.
- **Primary:** gradiente verde profundo, texto blanco y elevación interactiva suave.
- **Secondary:** superficie marfil translúcida con borde dorado de baja intensidad.
- **Hover / Focus:** desplazamiento vertical de 1px en hover; foco de 2px en verde botánico con separación de 2px.

### Chips

- **Style:** cápsulas marfil o verde muy diluido, texto verde, altura aproximada de 34px y borde discreto.
- **State:** comunican etiquetas, categorías o metadatos; el dorado queda reservado para estado editorial o selección relevante.

### Cards / Containers

- **Corner Style:** curvas amplias, normalmente entre 24px y 30px.
- **Background:** marfiles translúcidos, con capas verde profundo para contraste editorial.
- **Shadow Strategy:** profundidad ambiental suave; se refuerza únicamente en interacción o protagonismo.
- **Border:** línea verde tinta de baja opacidad o detalle dorado selectivo.
- **Internal Padding:** entre 1.25rem y 2rem según jerarquía.

### Inputs / Fields

- **Style:** fondo marfil translúcido, borde fino, texto tinta y radios de 18px; búsqueda y selectores compactos pueden adoptar cápsula completa.
- **Focus:** contorno verde botánico visible de 2px, consistente con botones y enlaces.
- **Error / Success:** rojo terroso diluido para error y verde botánico diluido para confirmación; ambos conservan texto legible y borde relacionado.

### Navigation

- **Public:** sans serif compacta, activa en verde con subrayado dorado en escritorio; en móvil se convierte en una lista vertical con indicador lateral dorado.
- **Private:** barra lateral verde profunda con tarjetas de navegación translúcidas; el estado activo suma fondo dorado suave y una barra dorada de 3px.
- **Motion:** transiciones entre 160ms y 200ms con desplazamientos mínimos y sin rebotes.

### Editorial Panels

Los paneles de dossier, archivo y orientación alternan marfil luminoso y verde profundo. Las etiquetas en mayúsculas, los índices discretos y las líneas doradas conectan módulos distintos sin homogeneizarlos en exceso.

## Do's and Don'ts

### Do:

- **Do** mantener una base marfil cálida y reservar el verde profundo para contraste y estabilidad.
- **Do** usar Playfair/Baskerville para voz editorial y Avenir/Segoe UI para acción y datos.
- **Do** conservar etiquetas de sección, estados activos y contexto visible en cada cambio responsivo.
- **Do** aplicar dorado con moderación para jerarquía, selección y detalle estructural.
- **Do** preferir transiciones cortas, foco visible y respuestas táctiles sutiles.

### Don't:

- **Don't** convertir la interfaz en un producto corporativo frío o clínicamente impersonal.
- **Don't** usar dorado, sombras o gradientes como decoración ostentosa.
- **Don't** recargar las superficies con bordes, adornos o tarjetas anidadas sin función.
- **Don't** sustituir la calidez del marfil por grandes extensiones de blanco puro.
- **Don't** sacrificar legibilidad, contexto o velocidad de navegación por una composición expresiva.
