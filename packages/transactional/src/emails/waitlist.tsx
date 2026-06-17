import { Link, Section, Text } from "@react-email/components";
import { EmailLayout, footerLink, footerText } from "./components/layout";
import { type FeatureItem, FeatureList, heading, paragraph } from "./components/ui";

export interface WaitlistEmailProps {
	appUrl: string;
	name: string | null;
}

/** Social links mirror the marketing footer (`landing/footer.tsx`). */
const LINKEDIN_URL = "https://linkedin.com/company/assendia";
const INSTAGRAM_URL = "https://www.instagram.com/statusunknown418/";

/** What a new waitlist signup will get to explore at launch — sourced from the landing copy. */
const FEATURES: readonly FeatureItem[] = [
	{
		title: "Diagnóstico de tu CV en 1 minuto",
		body: "Un score instantáneo que te muestra dónde estás y qué te separa de la siguiente entrevista.",
	},
	{
		title: "CV, carta y LinkedIn con IA",
		body: "Un Agente especializado arma cada postulación a medida según la oferta a la que apuntas.",
	},
	{
		title: "Un coach senior, 1:1",
		body: "Un profesional que pasó las mismas entrevistas técnicas te ayuda a decidir qué resaltar y cómo contar tu historia.",
	},
	{
		title: "Simulacros de entrevista",
		body: "Práctica 1:1 con preguntas reales de tu sector y feedback directo sobre qué decir y qué evitar.",
	},
	{
		title: "Todo en una sola suscripción",
		body: "CV, carta, LinkedIn y score juntos, sin pagar cada pieza por separado.",
	},
];

export function WaitlistEmail({ name, appUrl }: WaitlistEmailProps) {
	const footer = (
		<Section>
			<Text style={footerText}>Recibiste este correo porque te uniste a la lista de espera de Assendia.</Text>
			<Text style={footerText}>
				Síguenos en{" "}
				<Link href={LINKEDIN_URL} style={footerLink}>
					LinkedIn
				</Link>{" "}
				e{" "}
				<Link href={INSTAGRAM_URL} style={footerLink}>
					Instagram
				</Link>
				, o{" "}
				<Link href={appUrl} style={footerLink}>
					conoce más
				</Link>
				.
			</Text>
		</Section>
	);

	return (
		<EmailLayout appUrl={appUrl} footer={footer} preview="Ya estás en la lista de Assendia">
			<Section>
				<Text style={heading}>{name ? `Listo, ${name}` : "Listo"}, ya estás en la lista</Text>
				<Text style={paragraph}>
					Gracias por unirte a la lista de espera de Assendia. Te escribiremos por WhatsApp y correo apenas abramos el
					acceso — serás de los primeros en entrar.
				</Text>
				<Text style={paragraph}>Esto es lo que vas a poder explorar:</Text>
				<FeatureList items={FEATURES} />
				<Text style={paragraph}>
					Mientras tanto, síguenos para enterarte del lanzamiento. Estamos afinando los últimos detalles.
				</Text>
			</Section>
		</EmailLayout>
	);
}

WaitlistEmail.PreviewProps = {
	appUrl: "https://app.stackk.career",
	name: "Ana",
} satisfies WaitlistEmailProps;

export default WaitlistEmail;
