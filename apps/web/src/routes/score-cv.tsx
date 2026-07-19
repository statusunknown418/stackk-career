import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, type FeaturePageContent } from "@/components/landing/feature-page";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL, seoHead } from "@/lib/seo";

const PATH = "/score-cv";
const TITLE = "Analiza tu CV gratis: puntaje de 0 a 100 en 1 minuto · ASSENDIA";
const DESCRIPTION =
	"Sube tu CV u hoja de vida y recibe un puntaje de 0 a 100 en menos de 1 minuto, con la lista exacta de qué corregir para pasar los filtros ATS. Gratis, sin tarjeta.";

const CONTENT: FeaturePageContent = {
	kicker: "Herramienta gratuita",
	h1: "Analiza tu CV gratis y recibe tu puntaje en 1 minuto",
	intro: [
		"Sube tu CV y elige el rol al que apuntas. Un agente especializado de IA lo califica de 0 a 100 y te entrega la lista exacta de qué corregir para que los reclutadores no te descarten.",
		"Gratis para siempre, sin tarjeta. Es el mismo diagnóstico con el que empiezan todos los planes de ASSENDIA.",
	],
	ctaLabel: "Analizar mi CV gratis",
	stepsTitle: "Cómo funciona el Score CV",
	steps: [
		{
			title: "Sube tu CV",
			body: "Sube tu CV en PDF o empieza desde cero con el constructor. No necesitas formatearlo antes: el análisis trabaja sobre el contenido real.",
		},
		{
			title: "Elige el rol al que apuntas",
			body: "El puntaje se calcula contra un rol concreto, no en abstracto. Un mismo CV puede estar listo para un puesto y débil para otro.",
		},
		{
			title: "Recibe tu puntaje y el plan de corrección",
			body: "En menos de 1 minuto tienes tu score de 0 a 100 y una lista priorizada de qué mejorar: estructura, logros, palabras clave y compatibilidad con filtros automáticos.",
		},
	],
	sections: [
		{
			title: "Qué mide exactamente el puntaje",
			paragraphs: [
				"El Score CV no es una nota decorativa. El análisis revisa cuatro frentes que deciden si tu postulación avanza: la estructura del documento, la diferencia entre logros y tareas, las palabras clave de tu sector y la compatibilidad con los filtros automáticos que usan los reclutadores para descartar CVs.",
				"La estructura pesa más de lo que parece: secciones desordenadas, fechas ambiguas o un perfil sin dirección hacen que un reclutador —humano o software— pierda el hilo en segundos. El análisis detecta esos problemas y te dice dónde están.",
				'La parte más difícil de ver por tu cuenta es la diferencia entre logros y tareas. "Responsable de ventas" es una tarea; "aumenté las ventas del canal digital" es un logro. El agente de IA distingue una cosa de la otra en cada punto de tu experiencia y te marca cuáles reescribir.',
			],
		},
		{
			title: "Por qué los filtros automáticos descartan tu CV",
			paragraphs: [
				"Muchas empresas en Perú, Colombia y el resto de LATAM usan software de reclutamiento (los llamados ATS) que filtra CVs antes de que un humano lea el primero. Si tu CV no tiene las palabras clave del puesto, o el formato confunde al software, quedas fuera sin que nadie te haya evaluado.",
				"El Score CV mide esa compatibilidad de forma directa: compara tu documento contra lo que el rol exige y te muestra qué palabras clave faltan y qué partes del formato pueden estar jugándote en contra. En el plan Pro, además, puedes comparar tu CV directamente contra cada oferta a la que postulas.",
			],
		},
		{
			title: "¿CV u hoja de vida? El mismo análisis",
			paragraphs: [
				"En Perú lo llamamos CV; en Colombia, hoja de vida. El análisis funciona igual para ambos: lo que cambia son las normas locales de cada mercado, y el agente evalúa tu documento contra el rol y el contexto que tú eliges.",
				"El producto está en español neutro y hoy trabajamos con talentos en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España.",
			],
		},
		{
			title: "Qué haces después de conocer tu puntaje",
			paragraphs: [
				"El puntaje solo vale si te lleva a corregir. Con el plan Gratuito tienes un análisis completo al mes y la lista de mejoras para trabajarlas por tu cuenta o con el constructor de CV, también gratis.",
				"Si quieres velocidad, el plan Pro desbloquea análisis ilimitados y la reescritura automática: el mismo agente de IA reestructura tus puntos débiles con las métricas que buscan los reclutadores. Y si buscas acompañamiento humano, los coaches de ASSENDIA revisan tu CV contigo en sesiones 1:1.",
			],
		},
	],
	planNote: {
		title: "Gratis para siempre, ilimitado en Pro",
		body: "El plan Gratuito incluye un Score CV completo al mes, sin tarjeta y sin caducidad. El plan Pro (S/79 al mes) lo vuelve ilimitado, añade la comparación directa contra cada oferta y la reescritura automática con IA. Sin permanencia: cancelas cuando quieras.",
	},
	faqTitle: "Preguntas frecuentes sobre el Score CV",
	faqs: [
		{
			q: "¿El análisis de CV es realmente gratis?",
			a: "Sí. El Score CV es gratis para siempre, con un análisis completo al mes en el plan Gratuito. No pedimos tarjeta para empezar. Si necesitas analizar más versiones o comparar contra ofertas concretas, el plan Pro incluye análisis ilimitados.",
		},
		{
			q: "¿Cómo se calcula el puntaje de 0 a 100?",
			a: "La IA analiza la estructura de tu CV, distingue logros de tareas, revisa las palabras clave de tu sector y mide la compatibilidad con los filtros automáticos (ATS) que usan los reclutadores. Con eso construye un puntaje por rol y una lista priorizada de correcciones.",
		},
		{
			q: "¿Funciona para mi hoja de vida si estoy en Colombia?",
			a: "Sí. El análisis funciona igual para un CV peruano que para una hoja de vida colombiana: eliges el rol y el agente evalúa tu documento contra lo que ese mercado exige.",
		},
		{
			q: "¿Qué pasa con mis datos y mi CV?",
			a: "Tu CV no entrena modelos abiertos. Procesamos tus datos con proveedores que firmaron contratos de confidencialidad y puedes borrar todo desde tu panel cuando quieras. Cumplimos con la ley peruana de protección de datos personales (Ley 29733).",
		},
		{
			q: "¿En cuánto tiempo tengo el resultado?",
			a: "En menos de 1 minuto. Subes tu CV, eliges el rol y recibes el puntaje con la lista de mejoras en la misma sesión.",
		},
	],
	related: [
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
		{
			label: "Coaching laboral 1:1",
			href: "/coaching",
			description: "Un coach senior que pasó por las mismas entrevistas",
		},
	],
};

const seo = seoHead({ title: TITLE, description: DESCRIPTION, path: PATH });

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebApplication",
			"@id": `${SITE_URL}${PATH}#app`,
			name: "Score CV de ASSENDIA",
			url: `${SITE_URL}${PATH}`,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			description: DESCRIPTION,
			inLanguage: "es-419",
			offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
			provider: { "@id": `${SITE_URL}#organization` },
		},
		faqJsonLd(CONTENT.faqs, `${SITE_URL}${PATH}#faq`),
		breadcrumbJsonLd("Score CV", PATH),
	],
};

export const Route = createFileRoute("/score-cv")({
	component: ScoreCvPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function ScoreCvPage() {
	return <FeaturePage content={CONTENT} />;
}
