# Progreso del proyecto

> Snapshot del avance día a día. Actualizar al final de cada sesión.
> No es histórico exhaustivo (para eso está `git log`); es estado actual + decisiones recientes.

---

## 2026-05-03 — Landing STACKCV

### Hecho
- Branch: `feat/landing`
- Reemplazada la landing placeholder de `apps/web/src/routes/index.tsx` por la implementación STACKCV (mentorías 1:1 de CV para recién graduados LatAm)
- Estructura nueva en `apps/web/src/components/landing/`:
  - `nav.tsx` — sticky glass nav
  - `hero.tsx` + `hero-visual.tsx` — hero con headline editorial, CTAs, mockup dashboard 3D + floating cards
  - `bento-grid.tsx` — 8 celdas (hero con chart, mentor avatars, quote, métrica, etc.)
  - `how-it-works.tsx` — timeline horizontal de 4 pasos
  - `pricing.tsx` — 3 cards (Starter / Core featured / Signature)
  - `testimonials-carousel.tsx` — Embla carousel con 10 testimonios reales LatAm
  - `faq.tsx` — Accordion (base-ui) con 5 items
  - `final-cta.tsx` — banner con orbital animado
  - `footer.tsx` — 5 columnas + socials
  - `ascii-frame.tsx` — `AsciiEyebrow`, `AsciiCornerFrame`, `CursorBlink` (estética terminal)
  - `data.ts` — testimonios, planes, FAQ, footer columns tipados
- `apps/web/src/index.css`: añadido `--font-serif`, vars `--aurora-1/2/3` (oklch violeta), keyframes `aurora-1/aurora-2/orbit/float`, utility `.font-serif`
- Google Fonts (Instrument Serif) cargado vía `head.links` del route, no como dep
- CTAs usan `buttonVariants()` aplicado a `<a>` directo (patrón ya presente en `pagination.tsx`) — más limpio para a11y que `<Button render={<a/>}>`

### Decisiones de diseño
- **Dark mode**: la app fuerza `html.dark` en `__root.tsx`; en lugar de pelear se adaptó la paleta del diseño (violet sobre fondo oscuro) en lugar del fondo violeta light original
- **Sin Tweaks panel** (multi-theme runtime del prototipo) — fuera de scope para producción
- **Estética ASCII Motion**: aplicada vía `AsciiEyebrow` con box-drawing chars (`┌─ ─┐`), cursor parpadeante en el headline, Geist Mono en KPIs/eyebrows, grano SVG sutil en el hero
- **Carousel**: Embla (existente) en lugar del scroll-snap manual del prototipo

### Verificación
- `tsc --noEmit` limpio en mis archivos (errores preexistentes en `ai-elements/` y `packages/api/` son ajenos)
- Biome (Ultracite): clean
- `pnpm dev:web` levanta en `http://localhost:3001/`, devuelve 200, ~104 KB HTML

### Pendiente / out of scope
- Otras 11 páginas del bundle de diseño (about, pricing, agenda, checkout, dashboard, login, servicios, testimonios, blog, faq, confirmación)
- Tweaks panel runtime con 4 paletas (violet/airbnb/uber/warm)
- Conectar el "Empezar diagnóstico" a una mutation oRPC real
- SEO metadata extendida, OG images, analytics
- Tests visuales / Playwright

### Archivos modificados (sin commit aún)
```
M  apps/web/src/index.css
M  apps/web/src/routes/index.tsx
?? apps/web/src/components/landing/
?? docs/PROGRESS.md
```
