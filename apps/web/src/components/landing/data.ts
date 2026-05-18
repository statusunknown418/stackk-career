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
	{ href: "#features", label: "Producto" },
	{ href: "#camino", label: "Cómo funciona" },
	{ href: "#casos", label: "Resultados" },
	{ href: "#planes", label: "Precios" },
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
		title: "Un coach real,",
		emphasis: "no un chatbot.",
		body: "Un humano senior con tu CV en mano te dice qué decir en cada entrevista. La IA hace el resto.",
		receipt: { label: "Equipo de coaches", value: "3 a 5 senior, en planilla" },
	},
	{
		number: "02",
		title: "Un solo plan.",
		emphasis: "Todo incluido.",
		body: "CV, carta, LinkedIn, mensajes, score y coaching, todo junto desde S/79. Wonsulting cobra US$699 a US$2.299 por las mismas piezas, por separado.",
		receipt: { label: "Herramientas", value: "6 en una sola suscripción" },
	},
	{
		number: "03",
		title: "Conocemos a",
		emphasis: "tu reclutador.",
		body: "Tu coach ya entrevistó en BCP, Yape, Rappi y Belcorp. Sabe qué preguntan y cómo se habla aquí.",
		receipt: { label: "Cobertura", value: "8 países de habla hispana" },
	},
	{
		number: "04",
		title: "Velocidad real.",
		emphasis: "Semanas, no meses.",
		body: "Score en 30 segundos. Primera entrevista en 2 a 4 semanas. Otras plataformas siguen revisando tu CV.",
		receipt: { label: "A primera entrevista", value: "18 días en promedio" },
	},
];

export const HOW_STEPS: readonly HowStep[] = [
	{
		title: "Diagnóstico instantáneo",
		body: "Sube tu CV. Score de 0 a 100 y la lista exacta de qué cambiar. Gratis.",
		tag: "Gratuito / Pro / Premium",
	},
	{
		title: "Mapeo del próximo puesto (Sesión 1)",
		body: "45 min con tu coach. Revisan CV y LinkedIn, definen roles realistas, arman la lista de empresas objetivo.",
		tag: "Pro / Premium",
	},
	{
		title: "Pones el plan en marcha",
		body: "CV contra cada oferta. Cartas en 30 segundos. Mensajes que no parecen plantilla. LinkedIn al 90+.",
		tag: "Pro / Premium",
	},
	{
		title: "Dominas la entrevista (Sesión 2)",
		body: "45 min de simulacro real con tu coach. Feedback directo y claves de lenguaje corporal.",
		tag: "Pro / Premium",
	},
	{
		title: "Refuerzo después de la entrevista (Sesión 3)",
		body: "30 min con tu coach. Qué salió bien, qué pulir, cómo encarar los siguientes procesos.",
		tag: "Pro / Premium",
	},
	{
		title: "Entrevistas reales en mano",
		body: "Día 42 en promedio con Premium. Simulacros, entrevistas reales y método para las siguientes. Cancelas cuando decidas.",
		tag: "★ Resultado",
	},
];

export const PLANS: readonly Plan[] = [
	{
		id: "gratuito",
		name: "Gratuito",
		tagline: "Tu score, gratis para siempre.",
		priceSoles: 0,
		priceUsd: 0,
		per: "Gratis, sin tarjeta",
		features: [
			"Score CV de 0 a 100 por rol, una vez al mes",
			"Lista detallada de qué tienes que mejorar",
			"Un CV generado con IA al mes",
			"Una carta de presentación al mes",
			"Un mensaje para networking al mes",
			"Score básico de tu perfil de LinkedIn",
		],
		cta: "Empezar gratis",
	},
	{
		id: "pro",
		name: "Pro",
		tagline: "IA ilimitada y una sesión 1:1 al mes.",
		priceSoles: 79,
		priceUsd: 21,
		per: "al mes, cancelas cuando quieras",
		features: [
			"Score CV ilimitado, con comparación directa contra cada oferta",
			"La IA reescribe automáticamente las secciones débiles",
			"CVs ilimitados, una versión distinta por cada puesto",
			"Cartas de presentación ilimitadas",
			"Optimizador completo para tu LinkedIn",
			"Mensajes ilimitados para reclutadores",
			"Una sesión 1:1 con tu coach (30 min) al mes, sobre el tema que tú elijas",
		],
		cta: "Empezar Pro",
		featured: true,
	},
	{
		id: "premium",
		name: "Premium",
		tagline: "El camino completo: tres sesiones y WhatsApp directo. Cinco veces más coaching que Pro.",
		priceSoles: 179,
		priceUsd: 47,
		per: "al mes, camino completo",
		features: [
			"Todo lo que incluye el plan Pro",
			"Sesión 1: Mapeo del próximo puesto (45 min)",
			"Sesión 2: Dominas la entrevista (45 min)",
			"Sesión 3: Refuerzo después de la entrevista (30 min)",
			"Revisión humana de tu CV y tu LinkedIn",
			"WhatsApp directo con tu coach (respuesta en 24 horas)",
		],
		cta: "Reservar Premium",
	},
];

export const SINGLE_SESSION = {
	priceSoles: 40,
	priceUsd: 11,
	duration: "45 min",
	tagline: "Prueba el coaching sin suscribirte.",
	body: "Sesión 1:1 con cualquier coach del equipo, sobre tu caso real. Sin compromiso.",
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
			"Subí mi CV y el score me dio 41. Después de la reescritura con la IA y la sesión 1, salté a 95. Tres semanas después ya tenía dos entrevistas agendadas.",
		chip: "41 → 95",
	},
	{
		id: "tomas",
		initials: "TL",
		gradient: "from-indigo-300 to-indigo-600",
		name: "Tomás Larrañaga",
		role: "Product Analyst en Rappi",
		location: "Bogotá",
		quote:
			"El coach me hizo escribir logros con números por primera vez. Suena obvio, pero no lo era para mí. Cambió todo.",
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
			"La sesión de pre entrevista fue brutal, en el buen sentido. Me salvó de decir tres cosas que habrían matado el proceso.",
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
			"Hice Premium pensando que era mucho. La sesión 2 me cambió cómo me preparo: entré a la entrevista con seguridad y la pasé al primer intento.",
		chip: "Pasé al primer intento",
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
	{
		id: "camila",
		initials: "CR",
		gradient: "from-emerald-300 to-emerald-600",
		name: "Camila Rodríguez",
		role: "Product Designer en Yape",
		location: "Lima",
		quote:
			"Mi CV decía mucho qué hice y nada de cómo lo medí. La sesión 2 me cambió el enfoque entero: dejé de listar tareas y empecé a contar impacto.",
		chip: "35 días",
	},
	{
		id: "mateo",
		initials: "MA",
		gradient: "from-indigo-200 to-indigo-600",
		name: "Mateo Aliaga",
		role: "Data Engineer en Globant",
		location: "Bogotá",
		quote:
			"La parte técnica la sabía; lo que me faltaba era contarla. Tres rondas de simulacro y entré a la entrevista real sin nervios.",
		chip: "Entré sin nervios",
	},
	{
		id: "florencia",
		initials: "FR",
		gradient: "from-emerald-200 to-emerald-600",
		name: "Florencia Romero",
		role: "Marketing Manager en Falabella",
		location: "Santiago",
		quote:
			"Pensé que era coaching común. La diferencia: mi coach había sido CMO en la región. Hablamos el mismo idioma desde la primera sesión.",
		chip: "Promoción",
	},
	{
		id: "andres",
		initials: "AC",
		gradient: "from-indigo-300 to-indigo-700",
		name: "Andrés Calderón",
		role: "Frontend Engineer en Kushki",
		location: "Lima",
		quote:
			"Era junior buscando rol senior. Me ayudaron a ordenar mis proyectos de freelance para que cuenten como experiencia formal en el CV.",
		chip: "Salto de rol",
	},
	{
		id: "lucia",
		initials: "LM",
		gradient: "from-emerald-300 to-emerald-700",
		name: "Lucía Méndez",
		role: "Customer Success en Despegar",
		location: "Buenos Aires",
		quote:
			"Llevaba 5 meses sin recibir respuesta a una sola aplicación. Reescribimos el CV un sábado y a las 2 semanas tenía mi primera entrevista real.",
		chip: "5 meses → 2 semanas",
	},
	{
		id: "joaquin",
		initials: "JV",
		gradient: "from-indigo-200 to-indigo-700",
		name: "Joaquín Vega",
		role: "Analyst en Rappi",
		location: "Lima",
		quote:
			"Lo más útil fue practicar las preguntas difíciles con mi coach. Cuando llegó la entrevista real, sentí que ya la había hecho tres veces.",
		chip: "Práctica real",
	},
	{
		id: "sara",
		initials: "SV",
		gradient: "from-emerald-200 to-emerald-700",
		name: "Sara Villanueva",
		role: "UX Designer en Stori",
		location: "CDMX",
		quote:
			"Antes probé plataformas extranjeras. Pagué dos veces y cero resultados. Aquí la diferencia fue que mi coach conocía el mercado mexicano.",
		chip: "32 días",
	},
	{
		id: "alejandra",
		initials: "AS",
		gradient: "from-indigo-300 to-indigo-600",
		name: "Alejandra Suárez",
		role: "Project Manager en Belcorp",
		location: "Lima",
		quote:
			"Tenía 6 años de experiencia pero mi CV parecía de 2. Lo reordenamos por impacto, no por orden cronológico. Otra historia.",
		chip: "Score 95",
	},
	{
		id: "bruno",
		initials: "BL",
		gradient: "from-emerald-200 to-emerald-600",
		name: "Bruno Lazo",
		role: "Marketing Digital en Niubiz",
		location: "Lima",
		quote:
			"El simulacro grabado fue lo más útil. Verme escuchar y responder en video me hizo corregir tics que ni notaba.",
		chip: "3 semanas",
	},
	{
		id: "valeria",
		initials: "VC",
		gradient: "from-indigo-200 to-indigo-700",
		name: "Valeria Castro",
		role: "HR Business Partner en Crehana",
		location: "Bogotá",
		quote:
			"Soy de RRHH y aún así no sabía cómo me veía desde afuera. La ironía perfecta: una coach me ayudó a reposicionarme para mi propio jefe.",
		chip: "Cambio interno",
	},
];

export const FAQ_ITEMS: readonly FaqItem[] = [
	{
		q: "¿Cómo funciona el Score CV?",
		a: "Subes tu CV y eliges el rol al que apuntas. La IA analiza la estructura, distingue logros de tareas, revisa las palabras clave del sector y mide la compatibilidad con los filtros automáticos que usan los reclutadores para descartar CVs. En menos de 30 segundos recibes un puntaje del 0 al 100 con la lista de lo que tienes que mejorar. En el plan Gratuito tienes un análisis al mes; en Pro, son ilimitados.",
	},
	{
		q: "¿Quiénes son los coaches?",
		a: "Un equipo reducido de 3 a 5 coaches senior, todos con experiencia contratando para tech, producto, datos y consultoría en empresas de la región. No trabajamos con freelancers de plataforma: nuestros coaches están en planilla con IMPULSA y los entrevistamos uno por uno antes de sumarlos al equipo.",
	},
	{
		q: "¿Cuál es la diferencia con Wonsulting o ResumAI?",
		a: "Wonsulting cobra el coaching humano por separado, entre US$699 y US$2.299. En IMPULSA, las herramientas de IA y el coaching vienen en el mismo plan. Pro incluye una sesión 1:1 al mes (30 minutos, sobre el tema que tú quieras) por S/79. Premium incluye el camino completo de tres sesiones estructuradas más WhatsApp directo con tu coach por S/179. No hay sobrecargos ni paquetes adicionales.",
	},
	{
		q: "¿Puedo probar sin suscribirme?",
		a: "Sí. El Score CV y el constructor son gratis para siempre, con un análisis al mes en el plan Gratuito. Si prefieres probar el coaching humano antes de suscribirte, tienes la sesión única de S/40 por 45 minutos, sin compromiso, con cualquier coach del equipo.",
	},
	{
		q: "¿En qué países funciona?",
		a: "Estamos enfocados en LATAM. Hoy trabajamos con talentos en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España. El producto está en español neutro y la moneda principal son soles peruanos, con equivalencias en dólares.",
	},
	{
		q: "¿Puedo cancelar cuando quiera?",
		a: "Sí. Pro y Premium son planes mensuales sin permanencia. Cancelas desde tu dashboard, sin llamadas y sin retención agresiva. Si cancelas antes del siguiente cobro, mantienes el acceso hasta que termine el periodo pagado.",
	},
	{
		q: "¿Y si no consigo entrevistas?",
		a: "Garantía Premium: si completas tres meses seguidos del plan Premium (las tres sesiones de coaching y uso activo de las herramientas) y no llegas a una entrevista real, te devolvemos el 100% de lo pagado. Sin letra chica ni retención agresiva. Lo solicitas escribiéndole directamente a tu coach.",
	},
	{
		q: "¿En cuánto tiempo veo resultados?",
		a: "Tu score y tu CV mejorado los tienes el mismo día. La primera entrevista real suele llegar entre dos y cuatro semanas, según tu nivel y el rol al que apuntes. La garantía Premium cubre tu primera entrevista en 90 días.",
	},
	{
		q: "¿Funciona si no soy del rubro tech?",
		a: "Sí. Tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría. Nuestros coaches han contratado para BCP, Belcorp, Globant y agencias de la región; no solo para tech.",
	},
	{
		q: "¿Mis datos están seguros?",
		a: "Tu CV no entrena modelos abiertos. Procesamos tus datos con proveedores que firmaron contratos de confidencialidad y puedes borrar todo desde tu dashboard cuando quieras. Cumplimos con la ley peruana de protección de datos personales (Ley 29733).",
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
