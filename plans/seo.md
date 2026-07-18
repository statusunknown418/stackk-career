I pulled up the site first — good news is the meta basics are in place (title, description, OG tags, indexable). But I found some real issues that will hold you back, so let me structure this as an honest audit plus a phased plan.

## What's limiting you right now

**1. You're effectively a one-page website.** Every footer link ("Score CV", "Constructor de CV", "Carta de presentación", "Optimizador LinkedIn", "Coaching 1:1") points to a homepage anchor (`/#features`). That means Google can only rank *one URL* for all your keywords. A homepage can't simultaneously win "optimizar CV con IA", "carta de presentación con IA gratis", "coach laboral Perú" and "cómo pasar filtros ATS". This is your single biggest SEO constraint.

**2. Client-side rendering artifacts.** The fetched HTML shows prices as "S/0", "0 a 5 senior contratados", "0 días en promedio" — your animated counters render as zero in the raw HTML. If Googlebot indexes that state, your snippets and content look broken (and "0 días en promedio" reads badly). Verify what Google actually sees in Search Console's URL Inspection, and consider server-rendering or setting real initial values with animation on top.

**3. Almost no indexable content.** SEO traffic for a product like this comes overwhelmingly from informational searches ("cómo hacer un CV en Perú", "qué es un ATS", "preguntas de entrevista para product designer"). You have zero pages targeting any of them.

**4. Small trust signals.** The Instagram link in the footer goes to a personal account (`statusunknown418`), not a brand account. Minor, but Google and users both notice entity consistency.

## The plan, phased

### Phase 0 — Technical foundation (week 1–2)
Set up Google Search Console and Bing Webmaster Tools, submit a sitemap.xml, verify robots.txt. Check rendering as described above. Add structured data: `Organization`, `FAQPage` (you already have an FAQ — this can win rich snippets), `Product`/`Offer` on pricing, and later `Review`/`AggregateRating` once you have real testimonials. Make sure Core Web Vitals are green — animation-heavy landing pages often fail LCP on mobile, and LATAM users skew heavily mobile on mid-range devices.

### Phase 1 — Page architecture (week 2–6)
Break the single page into dedicated, keyword-targeted URLs, each with unique title/description/H1 and ~600–1,000 words of real content:

- `/score-cv` → "analizar CV gratis", "puntaje de CV online"
- `/constructor-cv` or `/crear-cv` → "crear CV con IA", "constructor de CV"
- `/carta-de-presentacion` → "generador de carta de presentación"
- `/optimizador-linkedin` → "optimizar perfil de LinkedIn"
- `/coaching` → "coach laboral", "asesoría para entrevistas"

Your free CV score is a natural *link magnet* — give it a standalone landing page people can share and journalists can link to, not just a login redirect. Also: right now the primary CTA sends people straight to `/login`, which is bad for both conversion and crawlability; let people see the tool page first.

Since you're targeting Peru and Colombia (your og:locale alternates), plan for country pages eventually (`/pe/`, `/co/`, or localized content) with hreflang — resume norms, salary expectations, and even vocabulary ("hoja de vida" in Colombia vs "CV" in Peru!) differ. "Hoja de vida" alone is a huge Colombian keyword you currently don't mention anywhere.

### Phase 2 — Content engine (month 2–6, ongoing)
This is where the traffic actually comes from. Two tracks:

**Editorial guides** targeting high-volume informational queries: cómo pasar los filtros ATS, plantillas de CV por país, cómo responder "háblame de ti", preguntas frecuentes de entrevista por rol, cuánto ganar como [rol] en [país], CV para postular sin experiencia. Every article ends with your free Score CV as the CTA — informational traffic converts when the next step is free and instant.

**Programmatic pages**, carefully: "Ejemplo de CV para [rol]" (product designer, data analyst, desarrollador backend...) and "Preguntas de entrevista para [rol]". These scale to hundreds of long-tail rankings, but each page needs genuinely useful, differentiated content or Google's helpful-content systems will suppress the whole site. Start with 15–20 hand-crafted role pages before automating anything.

Publish 2–4 quality pieces per week rather than a big dump. In Spanish-language LATAM career content, the competition (Computrabajo blog, Indeed LATAM, Zety español) is beatable with genuinely local, specific content — most of what ranks is translated generic advice.

### Phase 3 — Authority and links (ongoing)
Domain authority is the bottleneck for a new domain. Priorities: digital PR with LATAM tech/career media (your "garantía de entrevista en 90 días" and the day-42 data from 240+ processes are genuinely pitchable stories), partnerships with bootcamps and university career centers (crehana is already in your logo bar — get a link), founder-led LinkedIn content driving branded searches, and a free-tool angle ("analiza tu CV gratis") that career-advice creators can link to. Skip paid link schemes entirely — they're a liability.

### Measurement
Track weekly in GSC: impressions/clicks by page and query cluster, plus rank tracking for ~30 money keywords per country. Business-side, tag organic traffic through to free score completions and Pro conversions so you know which content actually pays. Realistic expectation for a new domain: meaningful organic traffic starts around month 3–4, compounds from month 6+.

One strategic note: SEO is your compounding channel but slow. Given you need users *now*, pair this with faster loops — LinkedIn organic, TikTok/Reels (CV tips content performs extremely well in LATAM), and university partnerships — while the SEO engine builds.

Want me to go deep on any piece — for example, drafting the actual keyword map for Peru vs Colombia, writing the title/meta/H1 set for the new feature pages, or the structured data markup?
