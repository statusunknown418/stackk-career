import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, type FeaturePageContent } from "@/components/landing/feature-page";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL, seoHead } from "@/lib/seo";

const PATH = "/coaching";
const TITLE = "Coaching laboral 1:1 con coaches senior desde S/50 · ASSENDIA";
const DESCRIPTION =
	"Coaching laboral 1:1 con seniors que pasaron tus mismas entrevistas. Simulacros con preguntas reales, feedback directo y garantía de entrevista en 90 días.";

const CONTENT: FeaturePageContent = {
	kicker: "Coaching humano",
	h1: "Coaching laboral 1:1 con seniors que pasaron por tus mismas entrevistas",
	intro: [
		"Prepararte para una entrevista viendo videos no es lo mismo que ensayarla con alguien que ya la pasó. En ASSENDIA, tu coach laboral es un profesional senior que consiguió su puesto en empresas internacionales y que trabaja contigo 1:1: qué resaltar, qué dejar fuera y cómo contar tu historia frente al reclutador.",
		"Puedes probar con una sesión única de S/50, sin suscripción, o recorrer el camino completo de tres sesiones estructuradas del plan Premium, con garantía de entrevista en 90 días.",
	],
	ctaLabel: "Empezar con mi coach",
	stepsTitle: "Las tres sesiones del camino Premium",
	steps: [
		{
			title: "Sesión 1: Mapeo del próximo puesto (45 min)",
			body: "Tu coach define contigo los roles realistas para tu experiencia y arma la lista de empresas objetivo. Sales con un plan concreto de búsqueda, no con frases de motivación.",
		},
		{
			title: "Sesión 2: Dominas la entrevista (45 min)",
			body: "Simulacro 1:1 con preguntas reales de tu sector. Feedback directo sobre qué decir, qué evitar y dónde reforzar cada respuesta antes de sentarte frente al reclutador.",
		},
		{
			title: "Sesión 3: Refuerzo después de la entrevista (30 min)",
			body: "Cuando ya pasaste por la entrevista real, repasan juntos qué salió bien y qué pulir antes del siguiente proceso. Los aprendizajes se acumulan, no se pierden.",
		},
	],
	sections: [
		{
			title: "Un coach que estuvo de tu lado de la mesa",
			paragraphs: [
				"No somos reclutadores ni una bolsa de trabajo. Tu coach es un senior que pasó las mismas entrevistas que tú vas a dar y consiguió su puesto en empresas internacionales. Conoce las preguntas de tu proceso porque las respondió él mismo, sentado del mismo lado de la mesa donde vas a estar tú.",
				"El equipo es reducido a propósito: entre 3 y 5 coaches senior, contratados directamente por ASSENDIA y entrevistados uno por uno antes de sumarse. No trabajamos con freelancers de plataforma, así que sabes exactamente quién te acompaña de principio a fin.",
				"La IA tiene su lugar: un agente especializado redacta y reestructura tu CV en segundos. Pero decidir qué historia contar, cómo responder bajo presión y qué resaltar en cada proceso es trabajo humano. Esa parte no la reemplaza ningún chatbot.",
			],
		},
		{
			title: "Tres sesiones con estructura, no charlas motivacionales",
			paragraphs: [
				"El plan Premium organiza el coaching en tres sesiones, cada una con un objetivo medible. En la primera (45 minutos) mapeas tu próximo puesto: roles realistas para tu perfil y una lista de empresas objetivo. En la segunda (45 minutos) ensayas la entrevista en un simulacro 1:1. En la tercera (30 minutos), después de tu entrevista real, refuerzas lo que funcionó y corriges lo que no, antes del siguiente proceso.",
				"Entre sesiones no te quedas solo. En Premium tienes WhatsApp directo con tu coach, con respuesta en menos de 24 horas, y revisión humana de tu CV y tu perfil de LinkedIn. Con ese ritmo, la primera entrevista real suele llegar entre dos y cuatro semanas, según tu nivel y el rol al que apuntas.",
			],
		},
		{
			title: "Asesoría para entrevistas: cómo es el simulacro y qué feedback recibes",
			paragraphs: [
				"La sesión de preparación para entrevistas es un simulacro de verdad: tu coach te hace las preguntas que se usan en los procesos de tu sector y tú respondes como si el puesto estuviera en juego. Nada de cuestionarios genéricos descargados de internet.",
				"El feedback llega en la misma sesión y es directo: qué decir, qué evitar y dónde reforzar cada respuesta. Sales sabiendo qué partes de tu discurso convencen, cuáles suenan a lista de tareas en lugar de logros y cómo ordenar tu historia para que el reclutador la siga sin esfuerzo.",
			],
		},
		{
			title: "La garantía de entrevista en 90 días, explicada sin letra chica",
			paragraphs: [
				"El plan Premium incluye una garantía concreta: si completas tres meses seguidos con las tres sesiones de coaching y uso activo de las herramientas, y aun así no llegas a una entrevista real, te devolvemos el 100% de lo pagado.",
				"Solicitarla es igual de simple: le escribes directamente a tu coach. Sin formularios escondidos ni retención agresiva. Y como Pro y Premium son planes mensuales sin permanencia, cancelas desde tu panel cuando quieras.",
			],
		},
		{
			title: "Para quién es este coaching (no solo tech)",
			paragraphs: [
				"Nuestros coaches construyeron su carrera en tech, producto, datos y consultoría, en empresas como BCP, Belcorp y Globant. Pero el coaching laboral no se queda ahí: tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría.",
				"Hoy acompañamos a talentos en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España. Las sesiones son en español y giran alrededor de tu caso real: tu CV, tus procesos abiertos y tus próximas entrevistas, no plantillas genéricas.",
			],
		},
	],
	planNote: {
		title: "Dos sesiones en Pro, el camino completo en Premium",
		body: "El plan Pro (S/79 al mes) incluye 2 sesiones de coaching 1:1 de 45 minutos más todas las herramientas de IA sin límite. El plan Premium (S/179 al mes) suma las tres sesiones estructuradas, WhatsApp directo con tu coach y la garantía de entrevista en 90 días. ¿Prefieres probar primero? La sesión única cuesta S/50, dura 45 minutos y no requiere suscripción. Otras plataformas cobran alrededor de S/250 por una sola sesión.",
	},
	faqTitle: "Preguntas frecuentes sobre el coaching laboral",
	faqs: [
		{
			q: "¿Quiénes son los coaches?",
			a: "Un equipo reducido de 3 a 5 coaches senior: profesionales que construyeron su carrera en tech, producto, datos y consultoría, en empresas como BCP, Belcorp y Globant, y que pasaron por las mismas búsquedas y entrevistas que tú. Son parte del equipo de ASSENDIA, contratados directamente y entrevistados uno por uno; no trabajamos con freelancers de plataforma.",
		},
		{
			q: "¿Qué pasa exactamente en una sesión de coaching?",
			a: "Depende del punto del camino. En la sesión de mapeo (45 min) defines roles realistas y tu lista de empresas objetivo. En la de entrevista (45 min) haces un simulacro 1:1 con preguntas reales de tu sector y recibes feedback directo. En la de refuerzo (30 min) repasas tu entrevista real y ajustas para el siguiente proceso. La sesión única trabaja sobre tu caso concreto con cualquier coach del equipo.",
		},
		{
			q: "¿Puedo probar el coaching sin suscribirme?",
			a: "Sí. La sesión única cuesta S/50, dura 45 minutos y no requiere suscripción ni compromiso. La agendas con cualquier coach del equipo y trabajan sobre tu caso real: tu CV, tu búsqueda o tu próxima entrevista.",
		},
		{
			q: "¿Qué cubre exactamente la garantía de entrevista?",
			a: "Si completas tres meses seguidos del plan Premium, con las tres sesiones de coaching realizadas y uso activo de las herramientas, y no llegas a una entrevista real, te devolvemos el 100% de lo pagado. Sin letra chica: la solicitas escribiéndole directamente a tu coach.",
		},
		{
			q: "¿Funciona si no soy del sector tech?",
			a: "Sí. Tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría. Nuestros coaches construyeron su carrera en empresas como BCP, Belcorp y Globant; no solo en tech.",
		},
	],
	related: [
		{ label: "Score CV", href: "/score-cv", description: "Tu puntaje de 0 a 100 con la lista exacta de qué corregir" },
		{
			label: "Constructor de CV",
			href: "/crear-cv",
			description: "Crea un CV estructurado con IA, desde un PDF o desde cero",
		},
		{
			label: "Cartas de presentación",
			href: "/carta-de-presentacion",
			description: "Una carta distinta por cada oferta, en segundos",
		},
		{
			label: "Optimizador de LinkedIn",
			href: "/optimizador-linkedin",
			description: "Para que los reclutadores te escriban a ti",
		},
	],
};

const seo = seoHead({ title: TITLE, description: DESCRIPTION, path: PATH });

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Service",
			"@id": `${SITE_URL}${PATH}#service`,
			name: "Coaching laboral 1:1 de ASSENDIA",
			url: `${SITE_URL}${PATH}`,
			description: DESCRIPTION,
			inLanguage: "es-419",
			serviceType: "Coaching laboral y preparación para entrevistas",
			areaServed: "Latinoamérica",
			provider: { "@id": `${SITE_URL}#organization` },
			offers: [
				{ "@type": "Offer", name: "Sesión única", price: "50", priceCurrency: "PEN" },
				{ "@type": "Offer", name: "Plan Pro", price: "79", priceCurrency: "PEN" },
				{ "@type": "Offer", name: "Plan Premium", price: "179", priceCurrency: "PEN" },
			],
		},
		faqJsonLd(CONTENT.faqs, `${SITE_URL}${PATH}#faq`),
		breadcrumbJsonLd("Coaching laboral 1:1", PATH),
	],
};

export const Route = createFileRoute("/coaching")({
	component: CoachingPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function CoachingPage() {
	return <FeaturePage content={CONTENT} />;
}
