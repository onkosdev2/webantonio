# Design QA — Home editorial oncológico

## Comparison target

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-75910f2d-9b53-46ff-aebf-f7e55d111da2.png`
- Rendered implementation: `implementation-home-1536-final.png`
- Side-by-side evidence: `design-qa-comparison-1536.png`
- Responsive evidence: `implementation-home-mobile.png`
- Desktop viewport: 1536 × 1024 CSS px, device pixel ratio 1.
- Source pixels: 1536 × 1024.
- Implementation pixels: 1536 × 1024.
- Density normalization: none required; source and implementation are both 1× and pixel-identical in canvas size.
- State: homepage at `/`, navigation closed, page at scroll position 0.

## Full-view comparison evidence

The source and implementation were joined into a single 3072 × 1024 comparison image. The final implementation reproduces the source topology in one desktop viewport: 63 px navigation, 495 px hero, 48 px topic rail, 194 px featured band, 90 px news strip and 96 px closing panels. `documentElement.scrollHeight` equals the 1024 px viewport height at the comparison state.

## Focused region evidence

- Hero: measured independently because portrait scale, title wrapping and rail position determine the first-view fidelity. The final title uses two lines, the primary action aligns with the source and the doctor remains naturally proportioned with head and hands visible.
- Editorial bands: inspected at native screenshot resolution because small labels, dividers, article imagery and botanical engraving were not readable enough in a scaled full-page preview.
- Header and controls: inspected at native resolution for icon weight, uppercase tracking, button height and alignment.

## Required fidelity surfaces

- Fonts and typography: local Playfair Display carries the editorial headings; the existing UI sans stack carries controls and metadata. Title scale, line height, tracking and two-line wrapping match the reference closely. Small uppercase labels remain legible and consistent.
- Spacing and layout rhythm: desktop proportions and vertical coordinates match the reference. The compact page ends inside the 1024 px viewport and no horizontal overflow is present. Mobile reflows the editorial bands and keeps the topic rail as an intentional horizontal scroller.
- Colors and tokens: warm ivory, deep botanical green, restrained gold and muted sage map directly to the reference. Contrast remains appropriate on dark and light surfaces.
- Image quality and asset fidelity: the hero uses a dedicated identity-preserving panoramic edit. The featured micrograph, CT and histology assets are high-resolution generated imagery placed at their intended crops. Botanical engraving uses a validated alpha PNG; there are no CSS/SVG asset substitutes or opaque background seams.
- Copy and content: visible structure and labels follow the reference. Demonstration clinical titles and dates are explicitly marked `Contenido de muestra`. “Casos reales” was not reproduced because the repository does not contain verified evidence that would support that claim.
- Icons: all interface icons come from one Phosphor line-icon family with consistent stroke weight and optical sizing.
- Accessibility and interaction: semantic headings, regions, labels and alt text are present. Focus states and reduced-motion behavior are defined. The mobile menu opens and closes; the primary CTA navigates successfully to `/casos-clinicos`.

## Comparison history

### Pass 1 — blocked

- P1: the previous implementation was a long editorial page instead of the compact one-viewport composition. Fixed by rebuilding the home as the five horizontal bands shown in the source.
- P1: hero height, title scale and portrait crop materially differed. Fixed with measured 63/495/48 px framing and a dedicated panoramic portrait.
- P2: featured content lacked the source imagery and compact nested layout. Fixed with three project-bound clinical assets and the same large-case/related-case topology.
- P2: header identity, navigation density and controls differed. Fixed with the source wordmark treatment, navigation set, search action and subscribe control.

### Pass 2 — blocked

- P2: fitting the original 16:9 image into the panoramic hero distorted the doctor. Fixed by generating an identity-preserving 3:1 edit with the doctor naturally framed on the right.
- P2: the botanical ornament showed an opaque rectangular field on dark surfaces. Fixed by producing and validating `botanical-branch-transparent.png` with an alpha channel.
- P2: Next development CSP blocked client hydration, so the mobile menu could not open. Fixed by allowing `unsafe-eval` only when `NODE_ENV=development`; production retains the stricter policy.

### Pass 3 — passed

- Desktop capture is 1536 × 1024 with no page overflow.
- Mobile capture has no horizontal document overflow; the topic rail alone scrolls intentionally and hides its scrollbar.
- Primary CTA reached `/casos-clinicos` and returned to the homepage.
- Mobile menu changed from `aria-expanded=false` to `true`, displayed navigation, and closed again.
- Clean browser session reported no console warnings or errors.
- No actionable P0, P1 or P2 mismatch remains.

## Follow-up polish

- P3: the header uses the closest available botanical line icon rather than the more intricate tree mark visible in the generated mockup. This does not change hierarchy or navigation behavior.

## Implementation checklist

- [x] Match desktop frame, hero, rail and editorial band proportions.
- [x] Match typography, colors, borders, radii and spacing rhythm.
- [x] Supply all visible clinical and botanical imagery.
- [x] Preserve truthful labeling for demonstration medical content.
- [x] Verify desktop, mobile, menu interaction, CTA navigation and console.

final result: passed
