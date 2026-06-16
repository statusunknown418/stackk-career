import { Section, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";
import { CtaButton, heading, paragraph } from "./components/ui";

export interface WelcomeEmailProps {
	appUrl: string;
	name: string | null;
}

export function WelcomeEmail({ name, appUrl }: WelcomeEmailProps) {
	return (
		<EmailLayout appUrl={appUrl} preview="Bienvenido a Assendia">
			<Section>
				<Text style={heading}>{name ? `Hola, ${name}` : "Hola"}, te damos la bienvenida</Text>
				<Text style={paragraph}>
					Gracias por unirte a Assendia. Estamos aquí para ayudarte a construir un CV que destaque y avanzar en tu
					búsqueda laboral.
				</Text>
				<Text style={paragraph}>
					Para empezar, completa tu perfil y crea tu primer CV — con o sin la ayuda de nuestra IA. Toma solo unos
					minutos.
				</Text>
				<Section style={{ margin: "24px 0 8px" }}>
					<CtaButton href={appUrl}>Quiero empezar ya!</CtaButton>
				</Section>
			</Section>
		</EmailLayout>
	);
}

WelcomeEmail.PreviewProps = {
	appUrl: "https://app.stackk.career",
	name: "Ana",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
