# IMPULSA

## Register

**Brand.** The site at `/` is the marketing landing — visual storytelling is the product. The app itself (under `/_protected/*`) is a separate product surface and lives outside this file's scope.

## Users

Latin American professionals between mid-career and senior who want their next role. Most are in tech, product, data, marketing, design, comms, or consulting at companies like BCP, Yape, Rappi, Belcorp, Globant, or aspirational equivalents. They speak Spanish (Peru primary, ES neutro everywhere else: Colombia, Chile, México, Argentina, Uruguay, Ecuador, España). They are educated, direct, and skeptical of corporate sterile or "translated-from-English" copy.

They show up to the landing already burned by:

- One of the generic "AI resume builder" tools that produces template-looking output.
- Wonsulting / ResumAI-style packages charging US$699 to US$2.299 for the human coaching IMPULSA bundles in.
- Three months of throwing CVs into job sites with no response.

They convert when they see (a) the guarantee anchored to a specific outcome (entrevista en 90 días), (b) a real coach who has been on the hiring side, and (c) the comparison table that shows Wonsulting's pricing next to S/79.

## Product Purpose

Help LATAM talent get their next interview in less than 90 days through AI tools (CV reescritura, score 0-100, cartas, mensajes, LinkedIn) layered with a human senior coach. The promise covers interview, not the signed contract — the marketing must be honest about that boundary.

Premium adds a three-session coaching path (Sesión 1: mapeo del puesto, Sesión 2: simulacro de entrevista, Sesión 3: refuerzo post entrevista) plus WhatsApp directo con el coach.

## Brand personality

- **Directo, no agresivo.** Frases cortas, conjugadas en segunda persona ("subes", "tienes", "armas"). Peruvian professional register: not slangy, not corporate-sterile.
- **Confiado por evidencia.** Cada claim grande tiene un número detrás (2,400+ entrevistas el último año, 4.9★ en 380 reseñas, 18 días promedio a primera entrevista, 36 días promedio histórico a oferta firmada).
- **Cálido, no edulcorado.** "Aquí te esperamos cuando vuelvas" en lugar de "Siempre estaremos contigo." Tono humano sin azúcar.
- **Editorial, no SaaS genérico.** Tipografía con contraste, números grandes, citas reales con nombres y empresas verificadas.

## Anti-references

Match-and-refuse. If a design or piece of copy reads like one of these, rewrite.

- **English-to-Spanish calques:** "Cuál es la diferencia con X" written like "What is the difference with X." `+`, `vs.`, `1/mes`, `5×`, `30s` as connectors in body copy. "Score CV en su perfil" instead of "score en el perfil". Marketing team flagged this twice; treat it as a hard constraint.
- **Genericness:** muted gray + generic blue + Apple-style typography that could be any SaaS. Marketing rejected this look.
- **Matrix / hacker aesthetic:** PixelGridShader with bright green pixels on dark background reads as "digital rain." Rejected.
- **Purple-anything:** the original oxblood / aurora purple was rejected explicitly. Brand color is Platzi green; no purple anywhere.
- **Overpromising contract:** "te conseguimos el trabajo," "te firmamos la oferta," "100% guaranteed job." The guarantee is interview, not employment. Marketing flagged the legal risk.
- **Long body copy:** dense paragraphs. "La gente no lee mucho" — every body cut to two short claims max.

## Strategic principles

1. **Interview is the unit of promise.** Every guarantee, headline, and step in "Cómo funciona" terminates at "entrevista conseguida." Offer/oferta language only appears in (a) testimonials as historical fact, (b) FAQ with the explicit "depends on the company and you" caveat.
2. **One color, used confidently.** Platzi green (oklch(0.84 0.21 130)) on Platzi-dark surface. No secondary spot color. Tinted neutrals only.
3. **Honesty over conversion at the margin.** Comparison with Wonsulting is direct and named (not "another platform"). Garantía conditions are spelled out (3 meses Premium + uso activo). Reassurance after pricing acknowledges users may not need IMPULSA forever.
4. **Density-first on desktop, density-second on mobile.** Bento grid + 4-column testimonial wall on desktop; stacked on mobile but with the same content, never cropped.

## Tech context (for designers)

- **Stack:** TanStack Start (React), Vite, Tailwind v4, motion/react, coss UI primitives.
- **Theme tokens:** in `apps/web/src/index.css`. The legacy variable names `--oxblood` and `--marigold` are still in use; both currently hold the same Platzi green value. Don't rename without sweeping every component.
- **Skills already in use:** `coss`, `coss-particles`, `emil-design-eng`, `frontend-design`, `vercel-react-best-practices`, `impeccable` (this one).
