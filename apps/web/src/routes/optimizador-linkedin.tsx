import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, type FeaturePageContent } from "@/components/landing/feature-page";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL, seoHead } from "@/lib/seo";

const PATH = "/optimizador-linkedin";
const TITLE = "Optimiza tu perfil de LinkedIn y recibe ofertas · ASSENDIA";
const DESCRIPTION =
	"Optimiza tu perfil de LinkedIn: titular, experiencia y certificaciones alineados a lo que buscan los reclutadores. Empieza con un score básico gratis.";

const CONTENT: FeaturePageContent = {
	kicker: "Herramienta de IA",
	h1: "Optimiza tu perfil de LinkedIn para que los reclutadores te escriban",
	intro: [
		"La mayoría de la gente usa LinkedIn para postular. Los reclutadores lo usan al revés: buscan perfiles con las palabras clave del puesto y le escriben a quienes aparecen. El optimizador de ASSENDIA trabaja tu experiencia, tus certificaciones y todo tu perfil para que seas de los que aparecen.",
		"Empiezas con un score básico de tu perfil, gratis y sin tarjeta. El optimizador completo está incluido en los planes Pro y Premium.",
	],
	ctaLabel: "Obtener mi score de LinkedIn",
	stepsTitle: "Cómo funciona el optimizador de LinkedIn",
	steps: [
		{
			title: "Recibe tu score básico gratis",
			body: "El plan Gratuito incluye un score básico de tu perfil de LinkedIn: una primera lectura de cómo te ve un reclutador que llega a tu página sin conocerte, y de qué tan lejos estás de aparecer en sus búsquedas.",
		},
		{
			title: "Optimiza el perfil completo",
			body: "Con el plan Pro, el optimizador completo revisa tu titular, tu sección de experiencia, tus certificaciones y las palabras clave con las que buscan los reclutadores de tu sector, y te dice qué cambiar en cada parte.",
		},
		{
			title: "Suma la revisión humana",
			body: "Con Premium, un coach senior revisa tu perfil de LinkedIn junto con tu CV y confirma que los dos cuenten la misma historia antes de que un reclutador los compare.",
		},
	],
	sections: [
		{
			title: "Por qué los reclutadores miran LinkedIn antes que tu postulación",
			paragraphs: [
				"Hay dos formas de conseguir trabajo. La primera es salir a postular: envías tu CV y compites contra decenas o cientos de candidatos por la misma oferta. La segunda es que te encuentren: un reclutador busca perfiles en LinkedIn, filtra por palabras clave y le escribe directamente a los pocos que encajan. En la segunda, la competencia es mucho menor y la conversación empieza con interés real de la empresa.",
				"Esa segunda vía solo existe si tu perfil está construido para aparecer en esas búsquedas. Un perfil incompleto, con un titular genérico o una experiencia escrita a medias, simplemente no sale en los resultados, por bueno que sea tu recorrido profesional.",
				"Y aun cuando postulas por la vía tradicional, tu perfil sigue pesando: es habitual que un reclutador visite tu LinkedIn antes de decidir si sigue leyendo tu postulación. Optimizarlo no reemplaza tu CV; abre un segundo frente que trabaja por ti mientras haces otra cosa.",
			],
		},
		{
			title: "Qué revisa exactamente el optimizador",
			paragraphs: [
				"El titular es lo primero: es la línea que acompaña tu nombre en cada resultado de búsqueda y en cada comentario que dejas. Un titular que solo dice tu cargo actual desaprovecha el espacio donde deberían estar el rol al que apuntas y las palabras clave con las que te buscarían.",
				"Después viene la sección de experiencia. Aplica el mismo principio que separa un buen CV de uno descartable: describir logros y no tareas. El optimizador identifica los puntos de tu experiencia que se leen como una lista de responsabilidades y te indica cómo reescribirlos para que muestren resultados.",
				"Por último, certificaciones y palabras clave. Los reclutadores buscan con términos concretos —tecnologías, metodologías, certificaciones, nombres de rol— y el optimizador compara tu perfil contra lo que tu sector exige, para que las palabras que te faltan dejen de dejarte fuera de los resultados.",
			],
		},
		{
			title: "Score básico gratis, optimizador completo en Pro",
			paragraphs: [
				"El score básico del plan Gratuito te da el diagnóstico inicial: una evaluación de tu perfil tal como está hoy, sin tarjeta y sin caducidad. Es suficiente para saber si tu LinkedIn te está ayudando o estorbando en tu búsqueda.",
				"El optimizador completo, incluido en Pro y Premium, va del diagnóstico a la corrección: recomendaciones concretas para tu titular, cada punto de tu experiencia, tus certificaciones y las palabras clave de tu sector. En Premium se suma además la revisión humana: un coach senior repasa tu perfil contigo, algo que ninguna evaluación automática reemplaza.",
			],
		},
		{
			title: "Tu LinkedIn y tu CV deben contar la misma historia",
			paragraphs: [
				"Cuando una postulación avanza, el reclutador suele tener tu CV en una pestaña y tu LinkedIn en otra. Si los cargos no coinciden, las fechas no cuadran o la experiencia está contada de forma distinta en cada lado, la inconsistencia genera dudas justo en el momento en que menos te conviene.",
				"Por eso el optimizador funciona mejor como parte del mismo sistema que tu CV: las mismas palabras clave, los mismos logros y la misma dirección profesional en ambos documentos. En el plan Premium, la revisión humana cubre exactamente eso: un coach revisa tu CV y tu LinkedIn en conjunto y corrige las diferencias antes de que un reclutador las encuentre.",
			],
		},
	],
	planNote: {
		title: "Score básico gratis, completo desde Pro",
		body: "El plan Gratuito incluye el score básico de tu perfil de LinkedIn, sin tarjeta. El plan Pro (S/79 al mes) desbloquea el optimizador completo: titular, experiencia, certificaciones y palabras clave. Premium (S/179 al mes) añade la revisión humana de tu CV y tu LinkedIn por un coach senior. Sin permanencia: cancelas cuando quieras.",
	},
	faqTitle: "Preguntas frecuentes sobre el optimizador de LinkedIn",
	faqs: [
		{
			q: "¿Qué incluye el score básico gratuito de LinkedIn?",
			a: "Una primera evaluación de tu perfil tal como está hoy: cómo te ve un reclutador que llega a tu página y qué tan preparado está tu perfil para sus búsquedas. Está incluido en el plan Gratuito, sin tarjeta. El optimizador completo, con recomendaciones sobre titular, experiencia, certificaciones y palabras clave, es parte de los planes Pro y Premium.",
		},
		{
			q: "¿El optimizador cambia mi perfil automáticamente?",
			a: "No. El optimizador analiza tu perfil y te entrega recomendaciones concretas: qué titular usar, cómo reescribir cada punto de tu experiencia, qué certificaciones destacar y qué palabras clave incorporar. Eres tú quien aplica los cambios en tu propio perfil, así que mantienes el control total de lo que se publica.",
		},
		{
			q: "¿Necesitan mi contraseña de LinkedIn?",
			a: "No. No pedimos tu contraseña ni publicamos nada en tu nombre. Trabajamos sobre el contenido de tu perfil y te entregamos las recomendaciones para que tú mismo las apliques.",
		},
		{
			q: "¿Sirve si no soy del sector tech?",
			a: "Sí. Tenemos casos en marketing, comunicaciones, gestión de proyectos, atención al cliente, diseño y consultoría. Nuestros coaches construyeron su carrera en empresas como BCP, Belcorp y Globant; no solo en tech.",
		},
		{
			q: "¿Qué pasa con mis datos?",
			a: "Tus datos no entrenan modelos abiertos. Los procesamos con proveedores que firmaron contratos de confidencialidad y puedes borrar todo desde tu panel cuando quieras. Cumplimos con la ley peruana de protección de datos personales (Ley 29733).",
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
			name: "Optimizador de LinkedIn de ASSENDIA",
			url: `${SITE_URL}${PATH}`,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			description: DESCRIPTION,
			inLanguage: "es-419",
			offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
			provider: { "@id": `${SITE_URL}#organization` },
		},
		faqJsonLd(CONTENT.faqs, `${SITE_URL}${PATH}#faq`),
		breadcrumbJsonLd("Optimizador de LinkedIn", PATH),
	],
};

export const Route = createFileRoute("/optimizador-linkedin")({
	component: OptimizadorLinkedinPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function OptimizadorLinkedinPage() {
	return <FeaturePage content={CONTENT} />;
}
