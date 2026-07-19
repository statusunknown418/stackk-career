import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, type FeaturePageContent } from "@/components/landing/feature-page";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL, seoHead } from "@/lib/seo";

const PATH = "/carta-de-presentacion";
const TITLE = "Genera tu carta de presentación con IA en segundos · ASSENDIA";
const DESCRIPTION =
	"Generador de carta de presentación con IA: una carta distinta por cada oferta, escrita desde tu CV real y el aviso del puesto. Lista en segundos, en español.";

const CONTENT: FeaturePageContent = {
	kicker: "Herramienta con IA",
	h1: "Genera tu carta de presentación con IA, una distinta por cada oferta",
	intro: [
		"Pega la oferta a la que quieres postular y la IA redacta una carta de presentación escrita desde tu CV real y lo que ese puesto pide. No es una plantilla con espacios en blanco: cada carta nombra al rol, a la empresa y a tu experiencia concreta.",
		"En segundos tienes un borrador listo para ajustar y enviar. Incluido en los planes Pro y Premium de ASSENDIA, junto con el resto de herramientas de IA.",
	],
	ctaLabel: "Crear mi carta de presentación",
	stepsTitle: "Cómo funciona el generador de cartas",
	steps: [
		{
			title: "Elige la oferta de trabajo",
			body: "Pega el aviso del puesto al que vas a postular. La carta se escribe contra esa oferta concreta, no contra un cargo genérico.",
		},
		{
			title: "La IA redacta desde tu CV y el aviso",
			body: "El agente cruza tu experiencia real con lo que la empresa pide y arma una carta que conecta ambas cosas: tus logros de un lado, sus requisitos del otro.",
		},
		{
			title: "Ajusta el tono y envíala",
			body: "El borrador es tuyo: puedes editarlo, cambiar el tono o reforzar un logro antes de enviarlo. En segundos pasas de la oferta a una carta lista.",
		},
	],
	sections: [
		{
			title: "Por qué los reclutadores descartan las cartas genéricas",
			paragraphs: [
				'Un reclutador que revisa decenas de postulaciones por día reconoce una carta copiada y pegada en la primera línea. "Me dirijo a ustedes para expresar mi interés en la vacante" no dice nada sobre ti ni sobre el puesto, y transmite exactamente lo contrario de lo que buscas: que enviaste lo mismo a veinte empresas sin leer ninguna oferta.',
				"El problema no es escribir mal; es escribir en abstracto. Una carta que no menciona el rol, la empresa ni un solo dato verificable de tu experiencia compite en desventaja contra cualquier candidato que sí hizo esa conexión, aunque tenga menos años de trayectoria.",
				"Personalizar a mano cada carta funciona, pero cuesta caro en tiempo: si postulas a varias ofertas por semana, redactar cada una desde cero es justo el tipo de trabajo repetitivo donde la mayoría termina rindiéndose y volviendo a la plantilla. Ahí es donde entra el generador.",
			],
		},
		{
			title: "Qué contiene una buena carta de presentación en LATAM",
			paragraphs: [
				'Las cartas que avanzan en procesos de selección en Perú, Colombia, México y el resto de la región comparten tres elementos: nombran el puesto y la empresa específicos, conectan un requisito del aviso con un logro concreto tuyo, y cierran con una intención clara de conversar. Nada de párrafos de relleno sobre "pasión por los desafíos".',
				'El logro concreto es lo que más pesa. Decir que "tienes experiencia liderando equipos" es una afirmación; contar que coordinaste un equipo en un proyecto con resultado medible es evidencia. La carta que genera la IA toma esos puntos directamente de tu CV, así que la materia prima es tu historia real, no frases inventadas.',
				"La extensión también importa: una carta efectiva cabe en una lectura de menos de un minuto. El generador produce textos breves y directos, en español, pensados para el tiempo real que un reclutador de la región le dedica a cada postulación.",
			],
		},
		{
			title: "Cómo funciona la personalización por oferta",
			paragraphs: [
				"El generador no parte de un texto base al que le cambia el nombre de la empresa. Parte de dos documentos: tu CV, con tu experiencia, logros y habilidades tal como los cargaste en ASSENDIA, y el aviso del puesto, con los requisitos y el lenguaje que esa empresa usa.",
				"Con esos dos insumos, el agente de IA decide qué partes de tu trayectoria son relevantes para esa oferta en particular y las pone al frente. Por eso dos cartas tuyas para dos ofertas distintas no se parecen entre sí: cada una responde a lo que ese puesto pide.",
				"El resultado es un borrador editable. Tú decides el tono final, agregas contexto que la IA no conoce y firmas algo que suena a ti. La herramienta te ahorra la página en blanco; la voz sigue siendo tuya.",
			],
		},
		{
			title: "Cuándo una carta realmente suma en tu postulación",
			paragraphs: [
				"No toda postulación exige carta, y mandarla por inercia no ayuda. Suma cuando la oferta la pide explícitamente, cuando postulas por correo directo a una persona, cuando cambias de sector o de rol y tu CV solo no explica el porqué, y cuando la vacante es competitiva y necesitas un motivo para que te lean primero.",
				"En esos escenarios, la carta hace el trabajo que el CV no puede: contar la conexión entre tu historia y ese puesto. El CV lista hechos; la carta los ordena en un argumento. Cuando ambos apuntan a la misma oferta —un CV ajustado al puesto más una carta escrita para esa empresa— la postulación completa se sostiene sola.",
				"Por eso el generador de cartas funciona mejor junto al resto de herramientas: el Score CV te dice qué corregir, el constructor arma una versión de tu CV por puesto y la carta cierra el paquete para cada oferta concreta.",
			],
		},
	],
	planNote: {
		title: "5 cartas al mes en Pro, ilimitadas en Premium",
		body: "El plan Pro (S/79 al mes) incluye 5 cartas de presentación al mes junto con todas las herramientas de IA: Score CV ilimitado, reescritura automática y CVs distintos por puesto. El plan Premium (S/179 al mes) las vuelve ilimitadas y suma coaching estructurado con revisión humana. Sin permanencia: cancelas cuando quieras.",
	},
	faqTitle: "Preguntas frecuentes sobre las cartas de presentación",
	faqs: [
		{
			q: "¿Qué tan personalizada es cada carta?",
			a: "Cada carta se escribe desde dos fuentes: tu CV real y el aviso del puesto que elegiste. La IA selecciona los logros de tu experiencia que responden a los requisitos de esa oferta, así que dos cartas para dos ofertas distintas salen diferentes entre sí.",
		},
		{
			q: "¿Puedo editar la carta antes de enviarla?",
			a: "Sí. El generador te entrega un borrador editable: puedes ajustar el tono, reforzar un logro o agregar contexto que la IA no conoce. La versión final la decides tú.",
		},
		{
			q: "¿Cuántas cartas puedo generar al mes?",
			a: "El plan Pro (S/79 al mes) incluye 5 cartas de presentación al mes. El plan Premium (S/179 al mes) incluye cartas ilimitadas. Ambos planes son mensuales, sin permanencia.",
		},
		{
			q: "¿Sirve para cualquier sector o solo para tech?",
			a: "Sirve para cualquier sector: tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría, además de tech. La carta se adapta al aviso que pegas, sea del rubro que sea.",
		},
		{
			q: "¿Qué pasa con los datos de mi CV?",
			a: "Tu CV no se usa para entrenar modelos abiertos. Trabajamos con proveedores que firmaron contratos de confidencialidad, puedes borrar toda tu información desde tu panel cuando quieras y cumplimos con la ley peruana de protección de datos personales (Ley 29733).",
		},
	],
	related: [
		{
			label: "Score CV",
			href: "/score-cv",
			description: "Tu puntaje de 0 a 100 con la lista exacta de qué corregir, gratis",
		},
		{
			label: "Constructor de CV",
			href: "/crear-cv",
			description: "Crea un CV estructurado con IA, desde un PDF o desde cero",
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
			name: "Generador de cartas de presentación de ASSENDIA",
			url: `${SITE_URL}${PATH}`,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			description: DESCRIPTION,
			inLanguage: "es-419",
			offers: { "@type": "Offer", price: "79", priceCurrency: "PEN" },
			provider: { "@id": `${SITE_URL}#organization` },
		},
		faqJsonLd(CONTENT.faqs, `${SITE_URL}${PATH}#faq`),
		breadcrumbJsonLd("Cartas de presentación", PATH),
	],
};

export const Route = createFileRoute("/carta-de-presentacion")({
	component: CartaDePresentacionPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function CartaDePresentacionPage() {
	return <FeaturePage content={CONTENT} />;
}
