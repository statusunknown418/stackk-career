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

export interface WhyReason {
	body: string;
	emphasis: string;
	number: string;
	receipt: { label: string; value: string };
	title: string;
}

export interface FooterColumn {
	heading: string;
	links: readonly { label: string; href: string }[];
}

export const NAV_LINKS: readonly NavLink[] = [
	{ href: "#por-que", label: "Por qué" },
	{ href: "#features", label: "Producto" },
	{ href: "#camino", label: "Cómo funciona" },
	{ href: "#planes", label: "Precios" },
	{ href: "#casos", label: "Resultados" },
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

export const WHY_REASONS: readonly WhyReason[] = [
	{
		number: "01",
		title: "IA + coach humano,",
		emphasis: "en un mismo plan.",
		body: "3 a 5 coaches senior en planilla — no freelancers de plataforma. Revisan tu camino paso a paso. Las herramientas IA hacen el trabajo de fondo.",
		receipt: { label: "Coaching aparte vs. incluido", value: "Wonsulting US$699+ · IMPULSA Pro S/79" },
	},
	{
		number: "02",
		title: "Una sola",
		emphasis: "suscripción.",
		body: "Lo que Wonsulting, ResumAI, CoverLetterAI y NetworkAI te cobran por separado, junto y en español. Sin paquetes inflados, sin onboarding eterno.",
		receipt: { label: "Herramientas integradas", value: "6 herramientas · 1 plan · 0 sorpresas" },
	},
	{
		number: "03",
		title: "Hecho para",
		emphasis: "LATAM.",
		body: "Español neutro, soles peruanos, contexto del mercado regional. Coaches que entrevistaron en BCP, Yape, Rappi y Belcorp. No es Wonsulting traducido.",
		receipt: { label: "Cobertura regional", value: "8 países · 100% español" },
	},
	{
		number: "04",
		title: "Resultados",
		emphasis: "medibles.",
		body: "Score 0–100 antes y después del rewrite. Casos reales como 41 → 84 en una semana. Ofertas concretas en semanas, no meses tirando CVs al vacío.",
		receipt: { label: "Score promedio", value: "47 → 81 sobre 2.400 mentees" },
	},
];

export const HOW_STEPS: readonly HowStep[] = [
	{
		title: "Diagnóstico instantáneo",
		body: "Sube tu CV. Score 0–100 + lista exacta de qué mejorar. Tu primer aha-moment.",
		tag: "Gratuito / Pro / Premium",
	},
	{
		title: "Mapea tu próximo trabajo (Sesión 1)",
		body: "45 min con tu coach. CV + LinkedIn en vivo. Plan de acción, roles y empresas objetivo.",
		tag: "Premium",
	},
	{
		title: "Ejecuta con IA",
		body: "Score vs. oferta, cartas, outreach, optimización LinkedIn. Ejecutas el plan del coach.",
		tag: "Pro / Premium",
	},
	{
		title: "Domina la entrevista (Sesión 2)",
		body: "45 min. Simulacro para el puesto específico. Feedback + consejos de lenguaje corporal.",
		tag: "Premium",
	},
	{
		title: "Cierra y negocia (Sesión 3)",
		body: "30 min post-entrevista. Plan para cerrar el proceso. Negociación de oferta.",
		tag: "Premium",
	},
	{
		title: "Tu nueva oferta",
		body: "Conseguiste el trabajo. Cierras el ciclo. Tu coach celebra contigo.",
		tag: "★ Resultado",
	},
];

export const PLANS: readonly Plan[] = [
	{
		id: "gratuito",
		name: "Gratuito",
		tagline: "Tu score gratis, para siempre.",
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
		per: "/ mes · cancela cuando quieras",
		features: [
			"Score CV ilimitado + vs. oferta laboral",
			"Arreglo automático IA de secciones",
			"CV ilimitado + versiones por puesto",
			"Cartas de presentación ilimitadas",
			"Optimizador LinkedIn completo",
			"Mensajes de outreach ilimitados",
			"1 sesión 1:1 con coach (30 min) / mes — temas a tu elección",
		],
		cta: "Empezar Pro",
		featured: true,
	},
	{
		id: "premium",
		name: "Premium",
		tagline: "El camino completo: 3 sesiones + WhatsApp. 5× más coaching que Pro.",
		priceSoles: 179,
		priceUsd: 47,
		per: "/ mes · camino completo",
		features: [
			"Todo lo del plan Pro",
			"Sesión 1 — Mapea tu próximo trabajo (45 min)",
			"Sesión 2 — Domina la entrevista (45 min)",
			"Sesión 3 — Cierra y negocia (30 min)",
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
	tagline: "Prueba el coaching sin suscribirte.",
	body: "Para cuando todavía no quieres comprometerte. Cualquier coach del equipo, 45 minutos de revisión real. Sirve como prueba del servicio Premium.",
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
			"Subí mi CV y el score me dio 41. Después del rewrite con la IA y la sesión 1, salté a 84. Tres semanas después ya tenía dos entrevistas agendadas.",
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
		a: "Subes tu CV y registras el rol al que apuntas. La IA analiza estructura, logros vs. tareas, keywords del sector y compatibilidad ATS. En menos de 30 segundos te devuelve un puntaje 0–100 y la lista de qué mejorar. En el plan Gratuito, 1 análisis por mes; en Pro, ilimitado.",
	},
	{
		q: "¿Quiénes son los coaches?",
		a: "Un equipo chico de 3 a 5 coaches senior con experiencia haciendo hiring para tech, producto, datos y consultoría en empresas de la región. No son freelancers de plataforma: están en planilla con IMPULSA y los entrevistamos uno por uno.",
	},
	{
		q: "¿Cuál es la diferencia con Wonsulting o ResumAI?",
		a: "Wonsulting cobra el coaching humano aparte (entre US$699 y US$2.299). Acá las herramientas IA y el coaching vienen en el mismo plan. Pro te da 1 sesión 1:1 al mes (30 min, formato libre) por S/79; Premium te da el camino completo de 3 sesiones estructuradas + WhatsApp con tu coach por S/179. Sin paquetes inflados.",
	},
	{
		q: "¿Puedo probar sin suscribirme?",
		a: "Sí. El Score CV y el constructor son gratis para siempre (con límite de 1/mes). Y si quieres probar el coaching humano antes de suscribirte, tienes la sesión única de S/40 por 45 minutos — sin compromiso, con cualquier coach del equipo.",
	},
	{
		q: "¿En qué países funciona?",
		a: "Estamos enfocados en LATAM. Trabajamos con mentees en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España. El producto está en español neutro y la moneda principal es soles peruanos (con equivalencias en USD).",
	},
	{
		q: "¿Cancelo cuando quiero?",
		a: "Sí. Pro y Premium son mensuales sin permanencia. Cancelas desde el dashboard, sin llamadas y sin retención agresiva. Si cancelas antes del próximo cobro, mantienes el acceso hasta el final del periodo pagado.",
	},
	{
		q: "¿Y si no consigo entrevistas?",
		a: "Garantía Premium: si haces 3 meses seguidos de Premium completando el camino (3 sesiones de coaching + uso activo de las herramientas) y no conseguiste al menos 1 entrevista real, te devolvemos el 100% de lo pagado. Sin letra chica, sin retención agresiva. Solicítalo escribiéndole directo a tu coach.",
	},
	{
		q: "¿En cuánto tiempo veo resultados?",
		a: "Score y CV mejorado: el mismo día. Primera entrevista real: entre 2 y 4 semanas en Pro o Premium, según tu nivel y rol. Oferta firmada: el promedio del último año fue 36 días en Premium.",
	},
	{
		q: "¿Funciona si no soy de tech?",
		a: "Sí. Tenemos casos en marketing, comunicaciones, project management, customer success, diseño y consultoría. Los coaches han hecho hiring para BCP, Belcorp, Globant y agencias regionales — no solo para tech.",
	},
	{
		q: "¿Mis datos están seguros?",
		a: "Tu CV no entrena modelos abiertos. Procesamos tus datos en proveedores con contratos de confidencialidad y puedes borrar todo desde tu dashboard cuando quieras. Cumplimos con la ley peruana de protección de datos personales.",
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
			{ label: "Resultados", href: "#casos" },
			{ label: "FAQ", href: "#faq" },
		],
	},
	{
		heading: "Cuenta",
		links: [
			{ label: "Iniciar sesión", href: "/login" },
			{ label: "Crear cuenta", href: "/register" },
			{ label: "Score gratis", href: "#planes" },
			{ label: "Sesión única", href: "#sesion-unica" },
		],
	},
];
