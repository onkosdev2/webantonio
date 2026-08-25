# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La plataforma sirve a personas vinculadas con la oncologia que buscan informacion actual, util y comprensible:

- medicos y otros profesionales clinicos;
- estudiantes de medicina;
- profesionales de enfermeria;
- pacientes del area oncologica.

Cada audiencia llega con distinto nivel de conocimiento, pero todas necesitan conservar el contexto clinico y editorial mientras recorren temas y secciones.

## Product Purpose

La web existe para llevar a su publico informacion oncologica relevante y de vanguardia sobre avances, testimonios y casos clinicos. El exito consiste en que las audiencias encuentren, comprendan y recorran ese contenido con rapidez, sin perder el contexto del tema ni la relacion entre las distintas secciones.

Tambien funciona como plataforma editorial del Dr. Antonio Camargo: publica contenido para el lector y proporciona un entorno privado para producirlo, revisarlo, organizarlo y conservarlo.

## Positioning

Un archivo oncologico de autor que reune en una sola experiencia casos clinicos estructurados, actualidad, investigacion, testimonios, educacion y criterio medico, respaldado por un flujo editorial privado con revision humana, asistencia de IA e integraciones.

## Operating Context

- El sitio publico se consume principalmente en espanol y organiza el contenido por casos clinicos, noticias, editoriales, investigacion, reflexiones, historias y galeria clinica.
- Medicos, estudiantes, enfermeros y pacientes pueden entrar por intereses y niveles de conocimiento diferentes; la estructura debe ayudarles a ubicarse y cambiar de seccion sin perder el hilo.
- El panel privado permite a administradores y editores preparar borradores, revisar contenido, gestionar estados de publicacion, importar material y operar tareas asistidas por IA.
- La plataforma contempla orientacion oncologica desde Lima para pacientes de provincias y del extranjero, incluida una segunda mirada clinica remota.
- El contenido puede originarse en redaccion propia, importaciones, fuentes RSS o asistencia de IA, pero pasa por un flujo editorial antes de publicarse.

## Capabilities and Constraints

- Publicacion de casos clinicos, noticias, editoriales, investigacion, reflexiones, historias y activos de galeria.
- Estados editoriales: borrador, pendiente de revision, programado, publicado y archivado.
- Metadatos oncologicos para tipo de tumor, estadio, biomarcadores, linea y plan de tratamiento, respuesta, toxicidades, nivel de evidencia, notas de revision y anonimización.
- Roles privados de administrador y editor, con autenticacion y gestion de usuarios.
- Ingesta de noticias por RSS, generacion de borradores con IA, importaciones externas y trazabilidad.
- Recursos y herramientas MCP conectados al archivo editorial.
- SEO medico y contenido localizado para Lima, Peru, provincias y alcance remoto internacional.
- La base local actual usa SQLite. La documentacion del proyecto contempla una migracion futura a PostgreSQL.
- Las credenciales de IA, almacenamiento R2 y otros servicios externos dependen de variables de entorno y pueden no estar configuradas en todos los entornos.
- La forma concreta de recopilar, verificar, autorizar y publicar testimonios oncologicos permanece por definir; no deben fabricarse ni presentarse como evidencia real sin validacion.

## Brand Commitments

- Nombre publico: Dr. Antonio Camargo.
- Identidad profesional centrada en oncologia clinica desde Lima, Peru.
- Voz clara, profesional, educativa y humana, capaz de atender tanto a lectores clinicos como a pacientes.
- La autoria y el criterio medico deben seguir siendo visibles incluso cuando intervengan IA, fuentes externas o integraciones.
- Las secciones deben conservar nombres, propositos y relaciones coherentes para que el usuario siempre sepa donde esta y como continuar.

## Evidence on Hand

- Implementacion funcional del sitio publico y el panel editorial en `app/`, `components/` y `lib/`.
- Modelo de datos y flujos editoriales en `prisma/schema.prisma`.
- Contenido clinico y editorial de demostracion en `prisma/seed.js`; este material no debe confundirse automaticamente con evidencia clinica publicada o testimonios verificados.
- Retratos y activos publicos del doctor en `public/doctor-profile.png`, `public/doctor-profile-hero.png`, `public/hero-oncology-luxe.svg` y `public/section-clinical-atlas.svg`.
- Informacion institucional y de alcance publico implementada en la portada, la pagina sobre el doctor y la pagina de orientacion oncologica remota.
- No hay en el repositorio evidencia confirmada de testimonios autorizados, resultados clinicos atribuibles, afiliaciones, premios o metricas de impacto; futuras mejoras no deben inventarlos.

## Product Principles

1. **Relevancia antes que volumen.** Priorizar avances, casos y testimonios que aporten valor real a las audiencias oncologicas.
2. **Vanguardia con contexto.** Presentar novedades junto con el marco clinico y editorial necesario para comprender su importancia.
3. **Coherencia transversal.** Mantener terminologia, estructura y relaciones consistentes entre todas las secciones.
4. **Orientacion permanente.** Ayudar al usuario a reconocer donde esta, que esta leyendo y cual es el siguiente recorrido pertinente.
5. **Acceso rapido al conocimiento.** Reducir friccion y profundidad innecesaria para llegar a temas, secciones y contenidos relacionados.

## Accessibility & Inclusion

La experiencia debe contemplar distintos niveles de alfabetizacion medica. Los conceptos oncologicos deben conservar su precision y, cuando sea necesario para pacientes o estudiantes, incluir explicaciones que permitan comprenderlos sin degradar el contenido dirigido a profesionales. La navegacion, los encabezados y los estados interactivos deben ser perceptibles y utilizables con teclado y tecnologias de asistencia.
