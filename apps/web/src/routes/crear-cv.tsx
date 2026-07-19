import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, type FeaturePageContent } from "@/components/landing/feature-page";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL, seoHead } from "@/lib/seo";

const PATH = "/crear-cv";
const TITLE = "Crea tu CV con IA gratis: de un PDF a un CV editable · ASSENDIA";
const DESCRIPTION =
	"Crea tu CV con IA desde un PDF o desde cero: el constructor lo convierte en secciones editables y listas para los filtros ATS. Gratis, sin tarjeta.";

const CONTENT: FeaturePageContent = {
	kicker: "Constructor gratuito",
	h1: "Crea tu CV con IA, desde un PDF o desde una página en blanco",
	intro: [
		"¿No sabes cómo hacer un CV que llegue a manos de un reclutador? Importa el PDF que ya tienes —o empieza desde cero— y el constructor lo convierte en un documento estructurado, con secciones editables que ajustas para cada puesto al que postulas.",
		"El constructor es gratis para siempre, sin tarjeta. Sobre este CV estructurado trabajan después el Score CV, la reescritura con IA y el resto de herramientas de ASSENDIA.",
	],
	ctaLabel: "Crear mi CV gratis",
	stepsTitle: "Cómo crear tu CV con IA",
	steps: [
		{
			title: "Importa tu PDF o empieza en blanco",
			body: "Si ya tienes un CV, súbelo tal como está: no importa de qué plantilla venga ni cuánto tiempo lleve sin actualizarse. Si nunca hiciste uno, la página en blanco también es un punto de partida válido.",
		},
		{
			title: "La IA lo estructura en secciones editables",
			body: "El constructor organiza tu información en secciones claras —perfil, experiencia, educación, habilidades— que puedes reordenar y corregir campo por campo, sin pelear con márgenes ni cuadros de texto rotos.",
		},
		{
			title: "Ajusta una versión por cada puesto",
			body: "Tu CV estructurado se convierte en la base de tus postulaciones. Con el plan Pro creas CVs ilimitados: una versión distinta por cada puesto, con el énfasis que esa oferta pide.",
		},
	],
	sections: [
		{
			title: "Por qué un CV estructurado gana a la plantilla de Word",
			paragraphs: [
				"Buena parte de los CVs que circulan en LATAM nacen de una plantilla de Word descargada hace años: columnas que se rompen al exportar, íconos que el software de reclutamiento no interpreta y texto atrapado en cuadros invisibles. El documento se ve bien en tu pantalla y llega confuso al otro lado.",
				"Un CV estructurado funciona distinto. Cada dato vive en un campo definido —puesto, empresa, fechas, logros— y el resultado es un documento limpio que tanto un reclutador humano como los filtros automáticos (ATS) pueden leer sin tropezar. Es la diferencia entre decorar un archivo y construir un documento que el sistema entiende.",
				"La estructura además te devuelve el control: cambiar el orden de las secciones, actualizar un logro o reorientar el perfil hacia otro rol es editar un campo, no duplicar el archivo y rezar para que el formato sobreviva.",
			],
		},
		{
			title: "Logros, no tareas: donde la reescritura con IA hace la diferencia",
			paragraphs: [
				"El error más común al hacer un CV es describir tareas en lugar de logros. Contar lo que hacías cada día suena razonable, pero no le dice al reclutador qué cambió gracias a ti. Esa diferencia, punto por punto de tu experiencia, es la que decide si te llaman o te descartan.",
				"Ahí entra la reescritura con IA del plan Pro: el agente detecta las secciones débiles de tu CV y las reescribe automáticamente, reestructurándolas con las métricas clave que buscan los reclutadores y los filtros automáticos que descartan CVs.",
				"Tú siempre tienes la última palabra. Cada propuesta de la IA aterriza en un campo editable del constructor: aceptas lo que suma, corriges lo que no y decides qué versión queda en tu documento.",
			],
		},
		{
			title: "Un CV por cada puesto, no un CV para todos",
			paragraphs: [
				"Postular con el mismo CV genérico a diez ofertas distintas es la forma más rápida de que las diez te ignoren. Un puesto de analista pide números; uno de coordinación pide equipos y plazos. Cuando el documento no habla el idioma de la oferta, el reclutador —o el filtro automático— pasa al siguiente candidato.",
				"Mantener varias versiones a mano era inviable con archivos de Word: cada copia envejece por su cuenta y ninguna queda bien. Con un CV estructurado, el plan Pro te deja crear CVs ilimitados, una versión distinta por cada puesto, partiendo siempre de tu base y cambiando solo el énfasis.",
				"El mismo plan incluye el Score CV ilimitado con comparación directa contra cada oferta, así que antes de enviar cada versión puedes verificar que realmente responde a lo que ese puesto exige.",
			],
		},
		{
			title: "¿CV, hoja de vida o currículum? El constructor es el mismo",
			paragraphs: [
				"En Perú decimos CV; en Colombia, hoja de vida; en otros mercados, currículum. El nombre cambia, el problema no: un documento que resuma tu experiencia de forma clara y pase los filtros del mercado donde postulas. El constructor funciona igual para hacer tu hoja de vida en Bogotá que para tu CV en Lima.",
				"Hoy acompañamos a talentos en Perú, Colombia, México, Argentina, Chile, Uruguay, Ecuador y España, con un producto escrito en español neutro que se adapta al rol y al contexto que tú eliges.",
			],
		},
	],
	planNote: {
		title: "Constructor gratis para siempre; versiones ilimitadas en Pro",
		body: "El constructor y el Score CV son gratis para siempre, sin tarjeta. El plan Pro (S/79 al mes) desbloquea CVs ilimitados —una versión distinta por cada puesto— y la reescritura automática con IA de las secciones débiles. Sin permanencia: cancelas cuando quieras.",
	},
	faqTitle: "Preguntas frecuentes sobre el constructor de CV",
	faqs: [
		{
			q: "¿Crear mi CV con el constructor es gratis?",
			a: "Sí. El constructor es gratis para siempre, igual que el Score CV, y no pedimos tarjeta para empezar. Si necesitas varias versiones, el plan Pro (S/79 al mes) incluye CVs ilimitados, una versión distinta por cada puesto, y la reescritura automática con IA.",
		},
		{
			q: "¿Necesito tener un CV para empezar?",
			a: "No. Puedes importar el PDF que ya tienes o empezar desde una página en blanco: el constructor te lleva sección por sección —perfil, experiencia, educación, habilidades— hasta tener un documento completo y editable.",
		},
		{
			q: "¿Puedo importar el CV que ya tengo en PDF?",
			a: "Sí. Subes tu PDF tal como está, aunque venga de una plantilla vieja de Word, y la IA extrae el contenido y lo reorganiza en secciones estructuradas listas para editar. No necesitas limpiarlo ni formatearlo antes.",
		},
		{
			q: "¿Puedo editar lo que genera la IA?",
			a: "Sí, todo. Cada sección del CV es un campo editable: reordenas, corriges y reescribes lo que quieras. Las propuestas de la reescritura con IA del plan Pro también llegan como texto editable; tú decides qué se queda en tu documento.",
		},
		{
			q: "¿Qué pasa con los datos de mi CV?",
			a: "Tu CV no entrena modelos abiertos. Los datos se procesan con proveedores que firmaron contratos de confidencialidad, puedes borrarlo todo desde tu panel cuando quieras y cumplimos con la ley peruana de protección de datos personales (Ley 29733).",
		},
	],
	related: [
		{ label: "Score CV", href: "/score-cv", description: "Tu puntaje de 0 a 100 con la lista de qué corregir, gratis" },
		{
			label: "Cartas de presentación",
			href: "/carta-de-presentacion",
			description: "Una carta a medida por cada oferta, sin empezar de cero",
		},
		{
			label: "Optimizador de LinkedIn",
			href: "/optimizador-linkedin",
			description: "Un perfil que hace que los reclutadores te escriban a ti",
		},
		{
			label: "Coaching laboral 1:1",
			href: "/coaching",
			description: "Sesiones con coaches senior que pasaron por lo mismo que tú",
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
			name: "Constructor de CV de ASSENDIA",
			url: `${SITE_URL}${PATH}`,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			description: DESCRIPTION,
			inLanguage: "es-419",
			offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
			provider: { "@id": `${SITE_URL}#organization` },
		},
		faqJsonLd(CONTENT.faqs, `${SITE_URL}${PATH}#faq`),
		breadcrumbJsonLd("Constructor de CV", PATH),
	],
};

export const Route = createFileRoute("/crear-cv")({
	component: CrearCvPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function CrearCvPage() {
	return <FeaturePage content={CONTENT} />;
}
