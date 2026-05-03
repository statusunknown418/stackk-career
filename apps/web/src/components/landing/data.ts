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
	id: "starter" | "core" | "signature";
	name: string;
	per: string;
	priceUsd: number;
	tagline: string;
}

export interface FaqItem {
	a: string;
	q: string;
}

export interface HowStep {
	body: string;
	title: string;
}

export interface FooterColumn {
	heading: string;
	links: readonly { label: string; href: string }[];
}

export const NAV_LINKS: readonly NavLink[] = [
	{ href: "#mentorias", label: "Mentorías" },
	{ href: "#planes", label: "Precios" },
	{ href: "#garantia", label: "Garantía" },
	{ href: "#casos", label: "Casos" },
	{ href: "#nosotros", label: "Nosotros" },
];

export const TRUST_LOGOS: readonly Logo[] = [
	{ name: "MercadoLibre", style: "bold" },
	{ name: "Rappi", style: "bold" },
	{ name: "Globant", style: "regular" },
	{ name: "NotCo", style: "mono" },
	{ name: "Kavak", style: "regular" },
	{ name: "Nubank", style: "bold" },
	{ name: "Auth0", style: "regular" },
	{ name: "Bitso", style: "mono" },
];

export const HERO_CHART: readonly BentoChartBar[] = [
	{ heightPct: 30, high: false },
	{ heightPct: 42, high: false },
	{ heightPct: 55, high: true },
	{ heightPct: 68, high: true },
	{ heightPct: 75, high: true },
	{ heightPct: 88, high: true },
	{ heightPct: 95, high: true },
];

export const HOW_STEPS: readonly HowStep[] = [
	{
		title: "Agendá diagnóstico",
		body: "20 minutos gratis con un mentor para entender en qué etapa estás.",
	},
	{
		title: "Elegí tu plan",
		body: "Starter, Core o Signature. Pagás solo lo que necesitás.",
	},
	{
		title: "Trabajamos juntos",
		body: "1:1 reales por video. Tareas entre sesiones. Soporte por chat.",
	},
	{
		title: "Aplicás con todo",
		body: "Te acompañamos hasta que llegue la oferta que buscás.",
	},
];

export const PLANS: readonly Plan[] = [
	{
		id: "starter",
		name: "Starter",
		tagline: "Para empezar a iterar tu CV.",
		priceUsd: 49,
		per: "Pago único · 1 sesión",
		features: [
			"1 sesión 1:1 de 60 minutos",
			"Rewrite del CV (1 versión)",
			"Feedback escrito en 48 hs",
			"Plantilla ATS-friendly",
		],
		cta: "Empezar",
	},
	{
		id: "core",
		name: "Core",
		tagline: "El paquete completo CV + LinkedIn.",
		priceUsd: 129,
		per: "Pago único · 4 sesiones",
		features: [
			"4 sesiones 1:1 (CV, LinkedIn, estrategia, simulacro)",
			"Rewrite ilimitado por 30 días",
			"LinkedIn optimizado completo",
			"1 simulacro de entrevista grabado",
			"Soporte por chat 24/7",
		],
		cta: "Reservar Core",
		featured: true,
	},
	{
		id: "signature",
		name: "Signature",
		tagline: "Acompañamiento hasta la oferta.",
		priceUsd: 299,
		per: "Pago único · 8+ sesiones",
		features: [
			"Todo lo de Core, sin límite por 90 días",
			"3 simulacros de entrevista",
			"Negociación de oferta incluida",
			"Mentor asignado fijo",
			"Garantía: si no conseguís entrevista, te devolvemos",
		],
		cta: "Hablar con un mentor",
	},
];

export const TESTIMONIALS: readonly Testimonial[] = [
	{
		id: "valentina",
		initials: "VN",
		gradient: "from-violet-300 to-violet-600",
		name: "Valentina Núñez",
		role: "Analista en NotCo",
		location: "Buenos Aires",
		quote:
			"Llegué con un CV de una página aburridísima y salí con algo que cuenta una historia. A las dos semanas tenía tres entrevistas.",
		chip: "19 días",
	},
	{
		id: "tomas",
		initials: "TL",
		gradient: "from-emerald-300 to-emerald-600",
		name: "Tomás Larrañaga",
		role: "Product Analyst en Rappi",
		location: "Bogotá",
		quote:
			"Sofía me hizo escribir bullets con números por primera vez. Suena obvio, pero no lo era para mí. Cambió todo.",
		chip: "1er empleo",
	},
	{
		id: "martina",
		initials: "MC",
		gradient: "from-amber-300 to-amber-600",
		name: "Martina Cifuentes",
		role: "UX Designer en Kavak",
		location: "CDMX",
		quote:
			"El simulacro de entrevista fue brutal — en el buen sentido. Me salvó de decir tres cosas que habrían matado el proceso.",
		chip: "2 meses",
	},
	{
		id: "julian",
		initials: "JR",
		gradient: "from-violet-200 to-violet-700",
		name: "Julián Rodríguez",
		role: "Data Analyst en Mercado Libre",
		location: "Córdoba",
		quote:
			"Venía de tres meses tirando CVs sin respuesta. Después de Core entré como Data Analyst Jr. Sigo sin entender cómo no lo hice antes.",
		chip: "36 días",
	},
	{
		id: "catalina",
		initials: "CB",
		gradient: "from-rose-200 to-rose-500",
		name: "Catalina Bermúdez",
		role: "Comms en Globant",
		location: "Montevideo",
		quote:
			"Me ayudaron a contar mi paso por una ONG como experiencia real. Antes me daba vergüenza ponerlo. Hoy es lo que más me preguntan en entrevistas.",
		chip: "Recién graduada",
	},
	{
		id: "diego",
		initials: "DM",
		gradient: "from-sky-200 to-sky-700",
		name: "Diego Méndez",
		role: "Backend Engineer en Nubank",
		location: "Lima",
		quote:
			"Hice Signature pensando que era mucha plata. Negocié $14K USD más en la oferta gracias a la sesión final. ROI inmediato.",
		chip: "+$14K oferta",
	},
	{
		id: "paula",
		initials: "PV",
		gradient: "from-yellow-200 to-amber-700",
		name: "Paula Villalba",
		role: "Marketing en Auth0",
		location: "Rosario",
		quote:
			"Llegué pensando que mi inglés era el problema. En realidad era cómo armaba la historia. Lo arreglamos en 2 sesiones.",
		chip: "28 días",
	},
	{
		id: "sebastian",
		initials: "SF",
		gradient: "from-emerald-200 to-emerald-700",
		name: "Sebastián Fontana",
		role: "Project Manager en Bitso",
		location: "Quito",
		quote:
			"Soy de carreras humanísticas y pensaba que tech no era para mí. Me ayudaron a reposicionarme como PM. Hoy lidero un equipo de 4.",
		chip: "Cambio de carrera",
	},
	{
		id: "antonella",
		initials: "AG",
		gradient: "from-pink-200 to-pink-600",
		name: "Antonella Greco",
		role: "Customer Success en Tiendanube",
		location: "Buenos Aires",
		quote:
			"Lo mejor: el grupo de WhatsApp con los demás mentees. Me revisaron mi LinkedIn como 8 personas. Plata bien gastada.",
		chip: "Comunidad",
	},
	{
		id: "renata",
		initials: "RT",
		gradient: "from-emerald-300 to-emerald-700",
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
		q: "¿Realmente el diagnóstico es gratis?",
		a: "Sí. 20 minutos con un mentor real, por video. Si te sirve, seguimos. Si no, te vas con feedback concreto y sin haber gastado nada.",
	},
	{
		q: "¿Cómo eligen al mentor?",
		a: "En el diagnóstico evaluamos tu industria objetivo, tu nivel actual y tus objetivos. Te asignamos al mentor con experiencia más cercana a tu caso.",
	},
	{
		q: "¿Qué pasa si no consigo entrevistas?",
		a: "En el plan Signature tenés garantía: si después de 90 días no conseguiste ninguna entrevista relevante, te devolvemos el 100%. En los otros planes seguimos iterando hasta que pase.",
	},
	{
		q: "¿Trabajan con perfiles no-tech?",
		a: "Sí. Tenemos mentores en producto, marketing, consultoría, diseño, finanzas y operaciones. La mayoría de nuestros mentees son no-developers.",
	},
	{
		q: "¿Las sesiones son grabadas?",
		a: "Sí, todas las sesiones quedan en tu dashboard para que las repases cuando quieras.",
	},
];

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
	{
		heading: "Mentorías",
		links: [
			{ label: "CV Rewrite", href: "#" },
			{ label: "LinkedIn", href: "#" },
			{ label: "Entrevistas", href: "#" },
			{ label: "Paquetes", href: "#planes" },
		],
	},
	{
		heading: "Empresa",
		links: [
			{ label: "Nosotros", href: "#nosotros" },
			{ label: "Casos", href: "#casos" },
			{ label: "Blog", href: "#" },
			{ label: "Prensa", href: "#" },
		],
	},
	{
		heading: "Recursos",
		links: [
			{ label: "Plantillas", href: "#" },
			{ label: "Guías", href: "#" },
			{ label: "FAQ", href: "#faq" },
			{ label: "Discord", href: "#" },
		],
	},
	{
		heading: "Cuenta",
		links: [
			{ label: "Iniciar sesión", href: "/login" },
			{ label: "Crear cuenta", href: "/login" },
			{ label: "Dashboard", href: "/dashboard" },
			{ label: "Agendar", href: "#planes" },
		],
	},
];
