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
		title: "Coach senior real,",
		emphasis: "no IA disfrazada.",
		body: "Persona con tu CV en mano que te dice qué decir el lunes en la entrevista. La IA hace el volumen; el coach acelera tus decisiones. Eso no lo automatiza nadie.",
		receipt: { label: "Equipo de coaches", value: "3 a 5 senior · planilla · LATAM" },
	},
	{
		number: "02",
		title: "Un solo precio.",
		emphasis: "Todo adentro.",
		body: "CV, carta, LinkedIn, mensajes a reclutadores, score y coaching humano. Wonsulting te lo vende en paquetes de US$699 a US$2.299. Acá viene completo desde S/79.",
		receipt: { label: "Herramientas integradas", value: "6 en 1 · sin extras" },
	},
	{
		number: "03",
		title: "Conocemos a",
		emphasis: "tu recruiter.",
		body: "Tu coach ya entrevistó en BCP, Yape, Rappi y Belcorp. Sabe las preguntas reales, los códigos de cada empresa y la jerga local. Nada de fórmulas gringas traducidas con Google Translate.",
		receipt: { label: "Cobertura regional", value: "8 países · 100% español" },
	},
	{
		number: "04",
		title: "Velocidad real.",
		emphasis: "Semanas, no meses.",
		body: "Score en 30 segundos. Primera entrevista en 2 a 4 semanas. Mientras otras plataformas todavía revisan tu CV, tú ya estás en entrevistas reales.",
		receipt: { label: "Días a primera entrevista", value: "18 promedio en Premium" },
	},
];

export const HOW_STEPS: readonly HowStep[] = [
	{
		title: "Diagnóstico instantáneo",
		body: "Sube tu CV. Score de 0 a 100 y lista exacta de qué arreglar. Gratis, sin tarjeta.",
		tag: "Gratuito / Pro / Premium",
	},
	{
		title: "Mapea tu próximo trabajo (Sesión 1)",
		body: "45 min con tu coach. Revisamos CV y LinkedIn juntos, definimos roles realistas y armamos la lista corta de empresas.",
		tag: "Pro / Premium",
	},
	{
		title: "Ejecuta el plan",
		body: "Score vs. oferta específica, cartas en 30s, mensajes a reclutadores, LinkedIn al 90+. Las herramientas hacen el volumen; el plan del coach define la dirección.",
		tag: "Pro / Premium",
	},
	{
		title: "Domina la entrevista (Sesión 2)",
		body: "45 min. Simulacro real para el puesto al que apuntas. Feedback directo + claves de lenguaje corporal.",
		tag: "Pro / Premium",
	},
	{
		title: "Cierra y negocia (Sesión 3)",
		body: "30 min después de la entrevista. Plan para cerrar el proceso. Si llegas a oferta, te ayudamos a negociarla.",
		tag: "Pro / Premium",
	},
	{
		title: "Resultado",
		body: "Día 42 promedio en Premium. Conseguiste entrevistas reales. Si firmaste oferta, mejor todavía. Cancelas la suscripción cuando quieras.",
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
			"Score CV de 0 a 100 por rol · 1 al mes",
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
		tagline: "IA ilimitada + 1 sesión 1:1 al mes.",
		priceSoles: 79,
		priceUsd: 21,
		per: "/ mes · cancela cuando quieras",
		features: [
			"Score CV ilimitado + vs. oferta laboral",
			"Arreglo automático IA de secciones",
			"CV ilimitado + versiones por puesto",
			"Cartas de presentación ilimitadas",
			"Optimizador LinkedIn completo",
			"Mensajes a reclutadores ilimitados",
			"1 sesión 1:1 con coach (30 min) al mes, temas a tu elección",
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
			"Sesión 1: Mapea tu próximo trabajo (45 min)",
			"Sesión 2: Domina la entrevista (45 min)",
			"Sesión 3: Cierra y negocia (30 min)",
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
	body: "Cualquier coach del equipo, 45 minutos sobre tu caso real. Sin suscripción, sin compromiso.",
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
		chip: "+15% sueldo",
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
			"Lo más útil fue practicar la negociación con mi coach. Aprendí a pedir más sueldo sin sonar arrogante. Cerré con un upgrade real.",
		chip: "+25% sueldo",
	},
	{
		id: "sara",
		initials: "SV",
		gradient: "from-emerald-200 to-emerald-700",
		name: "Sara Villanueva",
		role: "UX Designer en Stori",
		location: "CDMX",
		quote:
			"Antes probé plataformas gringas. Pagué dos veces y cero resultados. Acá la diferencia fue que mi coach conocía el mercado mexicano.",
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
		a: "Subes tu CV y registras el rol al que apuntas. La IA analiza estructura, logros vs. tareas, keywords del sector y compatibilidad ATS. En menos de 30 segundos te devuelve un puntaje de 0 a 100 y la lista de qué mejorar. En el plan Gratuito, 1 análisis por mes; en Pro, ilimitado.",
	},
	{
		q: "¿Quiénes son los coaches?",
		a: "Un equipo chico de 3 a 5 coaches senior con experiencia contratando para tech, producto, datos y consultoría en empresas de la región. No son freelancers de plataforma: están en planilla con IMPULSA y los entrevistamos uno por uno.",
	},
	{
		q: "¿Cuál es la diferencia con Wonsulting o ResumAI?",
		a: "Wonsulting cobra el coaching humano aparte (entre US$699 y US$2.299). Acá las herramientas IA y el coaching vienen en el mismo plan. Pro te da 1 sesión 1:1 al mes (30 min, formato libre) por S/79; Premium te da el camino completo de 3 sesiones estructuradas + WhatsApp con tu coach por S/179. Sin paquetes inflados.",
	},
	{
		q: "¿Puedo probar sin suscribirme?",
		a: "Sí. El Score CV y el constructor son gratis para siempre (con límite de 1 al mes). Si quieres probar el coaching humano antes de suscribirte, tienes la sesión única de S/40 por 45 minutos, sin compromiso, con cualquier coach del equipo.",
	},
	{
		q: "¿En qué países funciona?",
		a: "Estamos enfocados en LATAM. Trabajamos con talentos en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España. El producto está en español neutro y la moneda principal es soles peruanos (con equivalencias en USD).",
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
		a: "Score y CV mejorado: el mismo día. Primera entrevista real: entre 2 y 4 semanas en Pro o Premium, según tu nivel y rol. La garantía Premium cubre la entrevista en 90 días. Si llegas a oferta firmada, el promedio histórico es de 36 días, pero no es algo que garanticemos: depende de la empresa y de ti.",
	},
	{
		q: "¿Funciona si no soy de tech?",
		a: "Sí. Tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría. Los coaches han contratado para BCP, Belcorp, Globant y agencias regionales, no solo para tech.",
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
