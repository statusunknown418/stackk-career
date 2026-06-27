---
name: Osmo Landing Reference
description: Pixel-perfect creative developer landing system extracted from osmo.supply.
colors:
  carbon-ink: "#201d1d"
  charcoal-panel: "#312e2e"
  paper-grey: "#f4f4f4"
  mist-line: "#e1e1e1"
  muted-stone: "#817f7f"
  electric-purple: "#6840ff"
  acid-green: "#a1ff62"
  hot-red: "#f84131"
typography:
  display:
    fontFamily: "Haffer XH, Haffer VF, Arial, sans-serif"
    fontSize: "clamp(44px, 7vw, 118px)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.07em"
  hero:
    fontFamily: "Haffer XH, Haffer VF, Arial, sans-serif"
    fontSize: "clamp(52px, 7.4vw, 116px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: "-0.075em"
  body:
    fontFamily: "Haffer VF, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "-0.16px"
  label:
    fontFamily: "Haffer Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "13px"
    letterSpacing: "0.02em"
rounded:
  micro: "2px"
  nav: "6px"
  card: "4px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "30px"
  xl: "40px"
  section: "160px"
  hero-top: "118px"
components:
  button-dark:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.paper-grey}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-purple:
    backgroundColor: "{colors.electric-purple}"
    textColor: "{colors.paper-grey}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-green:
    backgroundColor: "{colors.acid-green}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  nav-pill:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.paper-grey}"
    rounded: "{rounded.nav}"
    padding: "7px"
    height: "54px"
  filter-pill-active:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.paper-grey}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
---

# Design System: Osmo Landing Reference

## 1. Overview

**Creative North Star: "The Kinetic Tool Bench"**

This landing system sells creative tooling by feeling like creative tooling: modular, physical, slightly weird, and in motion. It is not a generic SaaS hero. It uses a pale workbench surface, a nearly black ink layer, and sudden utility colors that behave like stickers, status lights, and draggable interface pieces.

The page rhythm matters as much as the tokens. Tall sections, centered hero type, floating media cards, compact pill controls, and dark interludes create a workshop cadence: browse, inspect, switch, compare, commit. Use this for a project landing when the product should feel useful, collectible, and made by people with taste.

**Key Characteristics:**
- Pale paper field with nearly black structural sections.
- Oversized compressed display type with aggressive negative tracking.
- Pill controls, compact nav, and tactile hover motion.
- Real product imagery, video cards, UI screenshots, and stacked media.
- One memorable motion language: slow marquee, orbiting rails, snap-like button states.

## 2. Colors

The palette is restrained in surface area but loud in accents: black and paper do the labor; purple, green, and red appear as product-signature bursts.

### Primary
- **Carbon Ink** (`carbon-ink`): main text, dark sections, default buttons, navigation backing. Use it as the structural color, not as decoration.
- **Paper Grey** (`paper-grey`): primary background and reverse text on dark surfaces. Keep it slightly grey, never pure white.

### Secondary
- **Electric Purple** (`electric-purple`): membership CTAs, selected emphasis, and product moments that need a premium signal.
- **Acid Green** (`acid-green`): success, community, newness, and playful utility. Use sparingly so it stays charged.

### Tertiary
- **Hot Red** (`hot-red`): alert-like accent, tiny badges, and moments that need heat. Never use it for large background fields unless the section is intentionally loud.

### Neutral
- **Charcoal Panel** (`charcoal-panel`): raised dark panels, pricing cards, and dark UI previews.
- **Mist Line** (`mist-line`): one-pixel dividers and quiet graphic lines on paper.
- **Muted Stone** (`muted-stone`): secondary body copy and metadata.

### Named Rules
**The Sticker Accent Rule.** Accent colors should feel applied: buttons, pills, badges, selected states, or small graphic objects. Do not wash full sections in purple or green unless that section is a deliberate campaign moment.

**The Warm Neutral Rule.** Never use pure black or pure white. The extracted system lives on `carbon-ink` and `paper-grey`, which keeps the page softer and more tactile.

## 3. Typography

**Display Font:** Haffer XH with Haffer VF fallback.
**Body Font:** Haffer VF with Arial fallback.
**Label/Mono Font:** Haffer Mono.

**Character:** The type is compact, engineered, and friendly. Headlines are wide visual objects with tight spacing; body copy stays small, plain, and practical.

### Hierarchy
- **Hero** (400, `clamp(52px, 7.4vw, 116px)`, `0.88`): use once at the top for the main promise. Track tightly at `-0.075em`.
- **Display** (400, `clamp(44px, 7vw, 118px)`, `0.9`): use for section-defining statements and dark interlude titles.
- **Title** (400, `32px to 54px`, `0.95 to 1.05`): use for card heads, pricing names, and product module labels.
- **Body** (400, `16px`, `20px`): use for explanatory text. Keep lines short, usually under 65ch.
- **Label** (400, `11px`, `13px`, uppercase with `0.02em`): use for tags, categories, tiny metadata, and controls. Do not turn whole paragraphs into caps.

### Named Rules
**The Compression Rule.** Headlines should feel drawn as shapes, not typed as normal prose. Use tight tracking and short line breaks; avoid long centered sentences.

**The No Bold Rule.** Keep UI text at regular weights. Establish hierarchy with size, color, position, and motion instead of bold font weight.

## 4. Elevation

Depth is mostly physical placement, scale, and overlap. Shadows exist, but only as soft ambient separation under media cards and product panels. Flat surfaces are the default; raised cards should look like paper or screens resting above the workbench.

### Shadow Vocabulary
- **Ambient Card Lift** (`0 24px 90px rgba(32, 29, 29, 0.12)`): use under media-heavy cards, screenshots, and panels that float above paper.
- **Hero Media Lift** (`0 26px 80px rgba(32, 29, 29, 0.18)`): use for moving hero cards and stacked showcase media.

### Named Rules
**The Overlap Before Shadow Rule.** Create depth with staggered position, rotation, scale, and clipping before adding box-shadow. If the surface still reads flat, add a soft ambient shadow.

## 5. Components

### Buttons
- **Shape:** full pill (`999px`) for CTAs; tiny rectangular pills (`2px to 6px`) for nav internals.
- **Primary:** carbon fill with paper text, `40px` minimum height, `0 18px` padding, `14px/18px` type.
- **Accent:** purple for premium/membership, green for utility/community/newness.
- **Hover / Focus:** move subtly, usually `translateY(-1px) rotate(-1deg)` over `0.6s cubic-bezier(0.625, 0.05, 0, 1)`. Use visible focus rings in the accent color.

### Chips
- **Style:** uppercase mono labels, `11px/13px`, compact `8px 12px` padding.
- **State:** active pills invert to carbon fill with paper text; inactive pills stay pale or transparent with carbon text.
- **Behavior:** product and pricing chips are click-driven. Switch state with `0.6s cubic-bezier(0.625, 0.05, 0, 1)`.

### Cards / Containers
- **Corner Style:** tiny radius (`4px`) for media cards, `6px` for nav panels, pill only for controls.
- **Background:** paper for page field, carbon or charcoal for pricing, previews, and dark interludes.
- **Shadow Strategy:** use Ambient Card Lift for floating screenshots and media.
- **Border:** dividers are one-pixel `mist-line`. Avoid decorative borders on card edges.
- **Internal Padding:** dense controls use `8px to 18px`; sections and major panels use `30px to 40px` rhythm.

### Inputs / Fields
- **Style:** minimal underline or pale field on paper. Avoid heavy boxed forms.
- **Focus:** ring or underline in purple, not glow-heavy glass treatment.
- **Error / Disabled:** hot red for error text or tiny badge only; muted stone for disabled copy.

### Navigation
- Fixed centered top pill, `608px × 54px` desktop closed state, carbon background, paper text, small internal radius.
- Open state expands to nearly full viewport width with clipped content and columns. Source transition: `max-width 0.9s cubic-bezier(0.625, 0.05, 0, 1) 0.2s`.
- Mobile should stay compact and stack the menu panel rather than creating a separate generic hamburger drawer.

### Signature Motion Components
- **Announcement marquee:** fixed promo strip under nav with repeated text, continuous horizontal motion.
- **Hero media rail:** time-driven orbit or angled marquee of product cards. Use real images/videos, not placeholders.
- **Product toolkit slider:** pill-driven content switch with media card change, no modal.
- **Pricing switcher:** visible tabs for audience and billing cadence, no hidden wizard.
- **Showcase stack:** layered media with slight rotation and hover/time movement.

## 6. Do's and Don'ts

### Do:
- **Do** start with a decisive physical scene: a creative developer browsing a tactile toolbox on a bright desk, not a generic B2B buyer in a dashboard.
- **Do** use real product visuals, interface screenshots, video loops, and layered media. Empty CSS cards break the system.
- **Do** keep surfaces mostly paper and carbon, then punctuate with purple, green, and red.
- **Do** make section pacing uneven on purpose: tight controls, then large breathing room, then dense media.
- **Do** use semantic HTML for landing sections: `header`, `nav`, `main`, `section`, `article`, `footer`.
- **Do** animate transforms and opacity, not layout properties that cause jank.

### Don't:
- **Don't** use bold font weights in UI. Size, color, and placement carry hierarchy.
- **Don't** use gradient text, glassmorphism, side-stripe borders, or hero metric blocks.
- **Don't** replace the media system with identical icon-card grids.
- **Don't** center every section into the same container. The source alternates centered display type, offset media, full-width dark sections, and dense controls.
- **Don't** use pure black, pure white, SaaS blue, or beige startup neutrals.
- **Don't** build click tabs where the source pattern is motion-led. Identify whether each section is time-driven, scroll-driven, hover-driven, or click-driven before implementing.
