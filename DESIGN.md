---
name: IMPULSA Landing
description: Platzi-dark editorial landing with one vibrant green accent
colors:
  ink: "#f5f5f7"
  paper: "#13171f"
  card: "#1f242d"
  card-elevated: "#2a2f38"
  brand-green: "#a4e635"
  brand-green-deep: "#7ecc1f"
  rule: "rgba(245, 245, 247, 0.10)"
  muted-foreground: "#a8acb6"
  ink-near-white: "#fbfff2"
  shadow-base: "rgba(15, 19, 30, 0.5)"
typography:
  display:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  display-italic:
    fontFamily: "Instrument Serif, Iowan Old Style, Georgia, serif"
    fontWeight: 400
    fontStyle: italic
  headline-section:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-large:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.2vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.55
  eyebrow:
    fontFamily: "Geist Mono Variable, JetBrains Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.22em"
    textTransform: "uppercase"
  receipt:
    fontFamily: "Geist Mono Variable, JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.14em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "20px"
  pill: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section-y-mobile: "64px"
  section-y-desktop: "96px"
  container-max: "1200px"
components:
  cta-primary:
    backgroundColor: "{colors.brand-green}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  cta-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-elevated:
    backgroundColor: "{colors.card-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "32px"
  chip:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

## Overview

IMPULSA's landing operates in **brand register**: design is the product. The aesthetic is "Platzi dark, editorial" — a single saturated brand accent (lime green at high chroma) carried across a near-black surface, with hairline rules and tonal layering doing the elevation work instead of shadows.

The page is anchored by a long-running hero with a multi-layered green aurora (4 drifting mesh blobs, 2 pulse orbs, 16 rising particles, 6 twinkle sparks, 1 diagonal sweep beam) on top of a Platzi-dark surface. Cards and surfaces decrease in chroma as they move away from the brand accent, so the green always reads as the freshest element.

Hierarchy is delivered through scale + weight contrast (≥1.5 ratio between display and section headlines, ≥2 between section headline and body). The grid runs to `max-width: 1200px`; bento sections push to a 6-column grid on desktop and collapse cleanly to single-column on mobile.

## Colors

The palette is **committed**: one saturated color (Platzi green) carries roughly 35% of the surface, against a tinted near-black paper. Neutrals are tinted toward the brand hue (chroma 0.005–0.01) so they don't drift cool/gray on screen.

Roles:

- **Paper** `#13171f` — root background. Slight cool tint, never pure black.
- **Card** `#1f242d` — default surface for content cards, bento cells, testimonials.
- **Card elevated** `#2a2f38` — featured pricing card (Pro), live state surfaces.
- **Ink** `#f5f5f7` — primary text on paper/card.
- **Ink near-white** `#fbfff2` — pure-white substitutes inside the brand surface (avatar initials, scan shader). Tinted toward green hue.
- **Muted foreground** `#a8acb6` — secondary text, descriptions, receipts.
- **Rule** `rgba(245,245,247,0.10)` — hairline borders. 1px solid, never thicker.
- **Brand green** `#a4e635` — CTAs, "3 meses" highlight, live dots, score fills, focus rings, the entire hero aurora.
- **Brand green deep** `#7ecc1f` — hover/pressed state for brand green elements.
- **Shadow base** `oklch(0.13 0.005 250 / 0.5)` — tinted near-black for box shadows. Pure black is banned.

The aurora uses 4 tints of brand green: `bg-oxblood/55` (primary blob), `/45` (mid), `/40` (secondary mid), `/30` (background mid), with mix-blend-screen so overlaps brighten additively.

## Typography

Classic display + sans pairing:

- **Geist Variable** carries every weight from 400 (body, eyebrows) to 700 (display, section headlines). Used for `font-display` (the dominant face) and `font-sans`. Heading scale uses `clamp()` so headlines scale fluidly between 2rem (mobile) and 5.25rem (desktop).
- **Instrument Serif (italic only)** is the secondary face. Used for italic emphasis inside section headlines (`<span className="font-display-italic">`) — three accent words across the whole landing, no more.
- **Geist Mono / JetBrains Mono** handles eyebrows, receipt labels, and metric values. Wide letter-spacing (`tracking-[0.18em]` to `tracking-[0.22em]`), uppercase, 10–11px.
- **Inter Variable** is the body face for paragraph copy. 15px default, 17–18px in body-large for hero subtitle.

The display headline tracks at `-0.035em` letter-spacing for editorial tightness; mono labels track wide for the opposite (instrument-panel) feel.

## Elevation

Shadows are restrained. Cards rely on **hairline borders + tonal contrast** rather than blur:

- **Level 0 (flat):** sits on paper. No border, no shadow. Background only.
- **Level 1 (default card):** `border: 1px solid rule` + slight background tint shift (`bg-card`).
- **Level 2 (hover/active):** `border-color` jumps from `rule` to `oxblood/40` + a green-tinted shadow `0 24px 60px -30px oklch(from var(--oxblood) l c h / 0.6)`. Used on reason cards, pricing cards, testimonial cards.
- **Level 3 (featured / floating):** `shadow: 0 18px 40px -22px oklch(0.13 0.005 250 / 0.55)` — used sparingly for the featured Pro card and the hero floating cluster cards.

Motion. All entry animations use exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`). Aurora blobs use a custom path (`ease-in-out infinite alternate`). No bounce, no elastic. Durations: 700ms for reveal animations, 7–22s for ambient motion, 60ms stagger between sibling reveals.

## Components

- **CTA primary** ("Analiza mi CV gratis", "Empezar Pro"): solid `brand-green` background, `paper` text. Pill or md-rounded shape; never gradient. Has a magnetic-cursor effect within ~40px (see `apps/web/src/components/ui/magnetic.tsx`).
- **CTA secondary** ("Ver planes"): transparent background, ink text, hover surface tint. Used as a paired tertiary action next to the primary CTA.
- **Featured pricing card (Pro):** uses `bg-foreground text-background` (inverts the palette — black-on-cream in dark mode). Stands as the only inverted card in a sea of dark cards.
- **Reason card** (4× in bento): dark card with hairline border, eyebrow with green pulse-dot, oversize ghost-number (`text-oxblood/8` jumping to `/20` on hover) sitting top-right at 110px font-size. Hover state lifts the number's chroma and adds the level-2 shadow.
- **Bento Score CV cell:** elevated dark surface with chart bars and animated scan line. Uses tinted-white dot grid background. The cell hosts the cursor-following spotlight (radial gradient at cursor position, brand-green at 32% opacity).
- **Testimonial card:** rounded-2xl, hairline border, gradient avatar circle, 3D-tilt on hover (max 6deg perspective rotation toward cursor). Arranged in 4-column vertical marquee on desktop.
- **Eyebrow + dot pattern:** every section header opens with a green pulse-dot (`size-1.5 rounded-full bg-oxblood shadow-[0_0_10px_var(--oxblood)]`) followed by an uppercase mono label. Acts as the connective tissue of the page.

## Do's and Don'ts

**Do:**

- Lead every section with a green pulse-dot + mono eyebrow + section number where helpful (e.g. "06" floating right above the herramientas grid).
- Cut body copy to two short claims maximum. People scan, not read.
- Use the italic Instrument Serif emphasis for three or four words total across the whole landing — over-using it dilutes the effect.
- Anchor every claim to a number when possible (47 → 95, 18 días promedio, 2,400+ talentos, 380 reseñas).
- Keep the green doing the heavy lifting; tinted neutrals fill everything else.

**Don't:**

- Don't add side-stripe colored borders (`border-left: 4px solid green`). Use background tints or full borders instead.
- Don't use gradient text or gradient buttons. Solid colors only. Gradients live in the hero aurora and in decorative chart bars.
- Don't introduce a second spot color (no marigold, no purple, no teal, no Apple blue). The Platzi green is alone on purpose.
- Don't use `#ffffff` or `#000000`. Tint every neutral toward the brand hue.
- Don't translate English landing-page tropes literally (`+`, `vs.`, `1/mes`, `5×`, `30s` as in-prose connectors). Marketing rejects this in body copy.
- Don't add a card-inside-a-card. Flatten or use a divider.
- Don't promise the offer/contract — the guarantee terminates at "entrevista conseguida."
