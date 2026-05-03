export interface NavLink {
	href: string;
	label: string;
}

export interface Logo {
	name: string;
	style: "bold" | "regular" | "mono";
}

export interface BentoChartBar {
	heightPct: number;
	high: boolean;
}

export interface Testimonial {
	chip: string;
	gradient: string;
	id: string;
	initials: string;
	location: string;
	name: string;
	quote: string;
	role: string;
}

export interface Plan {
	cta: string;
	featured?: boolean;
	features: readonly string[];
	id: "gratuito" | "pro" | "premium";
	name: string;
	per: string;
	priceSoles: number;
	priceUsd: number;
	tagline: string;
}

export interface FaqItem {
	a: string;
	q: string;
}

export interface HowStep {
	body: string;
	tag?: string;
	title: string;
}

export interface FooterColumn {
	heading: string;
	links: readonly { label: string; href: string }[];
}

export const NAV_LINKS: readonly NavLink[] = [
	{ href: "#features", label: "Features" },
	{ href: "#planes", label: "Precios" },
	{ href: "#camino", label: "Cómo funciona" },
	{ href: "#casos", label: "Casos" },
	{ href: "#faq", label: "FAQ" },
];

export const TRUST_LOGOS: readonly Logo[] = [
	{ name: "BCP", style: "bold" },
	{ name: "Rappi", style: "bold" },
	{ name: "Globant", style: "regular" },
	{ name: "Crehana", style: "mono" },
	{ name: "Yape", style: "regular" },
	{ name: "Belcorp", style: "bold" },
	{ name: "Kushki", style: "regular" },
	{ name: "Joinnus", style: "mono" },
];

export const HERO_CHART: readonly BentoChartBar[] = [
	{ heightPct: 32, high: false },
	{ heightPct: 45, high: false },
	{ heightPct: 58, high: true },
	{ heightPct: 70, high: true },
	{ heightPct: 78, high: true },
	{ heightPct: 88, high: true },
	{ heightPct: 96, high: true },
];

export const HOW_STEPS: readonly HowStep[] = [
	{
		title: "Onboarding IA",
		body: "Subí tu CV. Score inmediato 0–100 + lista de qué arreglar. El momento ‘wow’.",
		tag: "Free / Pro / Premium",
	},
	{
		title: "Sesión 1 — Revisión e intro",
		body: "45 min con tu coach. CV + LinkedIn en vivo. Plan de acción, roles y empresas target.",
		tag: "Premium",
	},
	{
		title: "Herramientas IA",
		body: "Score vs. oferta, cartas, outreach, optimización LinkedIn. Ejecutás el plan del coach.",
		tag: "Pro / Premium",
	},
	{
		title: "Sesión 2 — Pre-entrevista",
		body: "45 min. Mock para el puesto específico. Feedback + tips de lenguaje corporal.",
		tag: "Premium",
	},
	{
		title: "Sesión 3 — Seguimiento",
		body: "30 min post-entrevista. Estrategia de follow-up. Negociación de oferta.",
		tag: "Premium",
	},
	{
		title: "Oferta laboral",
		body: "Conseguiste el trabajo. Caso de éxito. Boca a boca.",
		tag: "★ Resultado",
	},
];

export const PLANS: readonly Plan[] = [
	{
		id: "gratuito",
		name: "Gratuito",
		tagline: "Empezá. Score gratis para siempre.",
		priceSoles: 0,
		priceUsd: 0,
		per: "Gratis · sin tarjeta",
		features: [
			"Score CV 0–100 por rol · 1/mes",
			"Lista de puntos a mejorar (texto)",
			"1 CV generado con IA / mes",
			"1 carta de presentación / mes",
			"1 mensaje de networking / mes",
			"Score básico de LinkedIn",
		],
		cta: "Empezar gratis",
	},
	{
		id: "pro",
		name: "Pro",
		tagline: "IA ilimitada + 1 sesión de coaching al mes.",
		priceSoles: 79,
		priceUsd: 21,
		per: "/ mes · cancelás cuando quieras",
		features: [
			"Score CV ilimitado + vs. oferta laboral",
			"Arreglo automático IA de secciones",
			"CV ilimitado + versiones por puesto",
			"Cartas de presentación ilimitadas",
			"Optimizador LinkedIn completo",
			"Mensajes de outreach ilimitados",
			"1 sesión coaching 1:1 (30 min) / mes",
		],
		cta: "Empezar Pro",
		featured: true,
	},
	{
		id: "premium",
		name: "Premium",
		tagline: "El camino completo: 3 sesiones + WhatsApp con tu coach.",
		priceSoles: 179,
		priceUsd: 47,
		per: "/ mes · camino completo",
		features: [
			"Todo lo del plan Pro",
			"Sesión 1 — Revisión e intro (45 min)",
			"Sesión 2 — Pre-entrevista (45 min)",
			"Sesión 3 — Seguimiento (30 min)",
			"Revisión humana de CV + LinkedIn",
			"WhatsApp con coach (24h respuesta)",
		],
		cta: "Reservar Premium",
	},
];

export const SINGLE_SESSION = {
	priceSoles: 40,
	priceUsd: 11,
	duration: "45 min",
	tagline: "Probá el coaching sin suscribirte.",
	body: "Para cuando todavía no querés comprometerte. Cualquier coach del equipo, 45 minutos de revisión real. Sirve como prueba del servicio Premium.",
	cta: "Reservar sesión única",
} as const;

export const TESTIMONIALS: readonly Testimonial[] = [
	{
		id: "valentina",
		initials: "VN",
		gradient: "from-emerald-300 to-emerald-600",
		name: "Valentina Núñez",
		role: "Analista en Yape",
		location: "Lima",
		quote:
			"Subí mi CV y el score me dio 41. Después del rewrite con la IA y la sesión 1, salté a 84. Tres semanas después tenía dos entrevistas.",
		chip: "41 → 84",
	},
	{
		id: "tomas",
		initials: "TL",
		gradient: "from-indigo-300 to-indigo-600",
		name: "Tomás Larrañaga",
		role: "Product Analyst en Rappi",
		location: "Bogotá",
		quote:
			"El coach me hizo escribir bullets con números por primera vez. Suena obvio, pero no lo era para mí. Cambió todo.",
		chip: "1er empleo",
	},
	{
		id: "martina",
		initials: "MC",
		gradient: "from-emerald-300 to-emerald-600",
		name: "Martina Cifuentes",
		role: "UX Designer en Crehana",
		location: "Lima",
		quote:
			"La sesión de pre-entrevista fue brutal — en el buen sentido. Me salvó de decir tres cosas que habrían matado el proceso.",
		chip: "2 meses",
	},
	{
		id: "julian",
		initials: "JR",
		gradient: "from-indigo-200 to-indigo-700",
		name: "Julián Rodríguez",
		role: "Data Analyst en BCP",
		location: "Arequipa",
		quote:
			"Venía de tres meses tirando CVs sin respuesta. Después de Premium entré como Data Analyst Jr. No entiendo cómo no lo hice antes.",
		chip: "36 días",
	},
	{
		id: "catalina",
		initials: "CB",
		gradient: "from-emerald-200 to-emerald-700",
		name: "Catalina Bermúdez",
		role: "Comms en Globant",
		location: "Montevideo",
		quote:
			"Me ayudaron a contar mi paso por una ONG como experiencia real. Antes me daba vergüenza ponerlo. Hoy es lo que más me preguntan.",
		chip: "Recién graduada",
	},
	{
		id: "diego",
		initials: "DM",
		gradient: "from-indigo-200 to-indigo-700",
		name: "Diego Méndez",
		role: "Backend Engineer en Belcorp",
		location: "Lima",
		quote:
			"Hice Premium pensando que era mucho. Negocié S/4.500 más en la oferta gracias a la sesión 3. ROI inmediato.",
		chip: "+S/4.5k oferta",
	},
	{
		id: "paula",
		initials: "PV",
		gradient: "from-emerald-200 to-emerald-700",
		name: "Paula Villalba",
		role: "Marketing en Kushki",
		location: "Quito",
		quote:
			"Llegué pensando que mi inglés era el problema. En realidad era cómo armaba la historia. Lo arreglamos en 2 sesiones.",
		chip: "28 días",
	},
	{
		id: "sebastian",
		initials: "SF",
		gradient: "from-indigo-300 to-indigo-700",
		name: "Sebastián Fontana",
		role: "Project Manager en Joinnus",
		location: "Lima",
		quote:
			"Soy de carreras humanísticas y pensaba que tech no era para mí. Me ayudaron a reposicionarme como PM. Hoy lidero un equipo de 4.",
		chip: "Cambio de carrera",
	},
	{
		id: "antonella",
		initials: "AG",
		gradient: "from-emerald-200 to-emerald-600",
		name: "Antonella Greco",
		role: "Customer Success en Tiendanube",
		location: "Buenos Aires",
		quote:
			"Lo mejor: el WhatsApp directo con mi coach. Le mandé el LinkedIn los domingos a la noche y siempre respondía a primera hora.",
		chip: "Comunidad",
	},
	{
		id: "renata",
		initials: "RT",
		gradient: "from-indigo-300 to-indigo-600",
		name: "Renata Toledo",
		role: "UX Researcher en Despegar",
		location: "Santiago",
		quote:
			"Tenía miedo de que fuera otra cosa de coaching genérico. Es lo opuesto: feedback durísimo y concreto sobre mi caso real.",
		chip: "42 días",
	},
];

export const FAQ_ITEMS: readonly FaqItem[] = [
	{
		q: "¿Cómo funciona el Score CV?",
		a: "Subís tu CV y registrás el rol al que apuntás. La IA analiza estructura, logros vs. tareas, keywords del sector y compatibilidad ATS. En menos de 30 segundos te devuelve un puntaje 0–100 y la lista de qué arreglar. En el plan Free, 1 análisis por mes; en Pro, ilimitado.",
	},
	{
		q: "¿Quiénes son los coaches?",
		a: "Un equipo chico de 3 a 5 coaches senior peruanos con experiencia haciendo hiring para tech, producto, datos y consultoría en empresas de la región. No son freelancers de plataforma: están en planilla con IMPULSA y los entrevistamos uno por uno.",
	},
	{
		q: "¿Cuál es la diferencia con Wonsulting o ResumAI?",
		a: "Wonsulting cobra el coaching humano aparte (entre $699 y $2.299 USD). Acá las herramientas IA y el coaching vienen en el mismo plan. Pro te da 1 sesión al mes por S/79; Premium te da 3 sesiones más WhatsApp por S/179. Sin paquetes inflados.",
	},
	{
		q: "¿Puedo probar sin suscribirme?",
		a: "Sí. El Score CV y el constructor son gratis para siempre (con límite de 1/mes). Y si querés probar el coaching humano antes de suscribirte, tenés la sesión única de S/40 por 45 minutos — sin compromiso, con cualquier coach del equipo.",
	},
	{
		q: "¿En qué países funciona?",
		a: "Estamos enfocados en LATAM. Los coaches son peruanos pero trabajamos con mentees en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España. El producto está en español neutro y la moneda principal es soles peruanos (con equivalencias en USD).",
	},
	{
		q: "¿Cancelo cuando quiero?",
		a: "Sí. Pro y Premium son mensuales sin permanencia. Cancelás desde el dashboard, sin llamadas, sin retención agresiva. Si cancelás antes del próximo cobro, mantenés el acceso hasta el final del periodo pagado.",
	},
];

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
	{
		heading: "Producto",
		links: [
			{ label: "Score CV", href: "#features" },
			{ label: "Constructor de CV", href: "#features" },
			{ label: "Carta de presentación", href: "#features" },
			{ label: "Optimizador LinkedIn", href: "#features" },
			{ label: "Coaching 1:1", href: "#planes" },
		],
	},
	{
		heading: "Empresa",
		links: [
			{ label: "Cómo funciona", href: "#camino" },
			{ label: "Casos", href: "#casos" },
			{ label: "Coaches", href: "#" },
			{ label: "Blog", href: "#" },
		],
	},
	{
		heading: "Recursos",
		links: [
			{ label: "Plantillas CV", href: "#" },
			{ label: "Guías por rol", href: "#" },
			{ label: "FAQ", href: "#faq" },
			{ label: "Comunidad", href: "#" },
		],
	},
	{
		heading: "Cuenta",
		links: [
			{ label: "Iniciar sesión", href: "/login" },
			{ label: "Crear cuenta", href: "/login" },
			{ label: "Score gratis", href: "#planes" },
			{ label: "Sesión única", href: "#sesion-unica" },
		],
	},
];
